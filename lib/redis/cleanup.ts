/**
 * Payment Rate Limit Cache Cleanup Utility
 *
 * This module provides functionality to clean up corrupted payment rate limit cache entries
 * that were created with the old key format causing "filter is not a function" errors.
 */
import { ENV_CONFIG, ENV_VALIDATORS } from '@/config/env';
import { Redis } from '@upstash/redis';

export interface CleanupStats {
  scannedKeys: number;
  corruptedKeys: number;
  cleanedKeys: number;
  errors: number;
  skippedKeys: number;
}

/**
 * Cleans up corrupted payment rate limit cache entries
 *
 * @returns Stats about the cleanup operation
 *
 * @example
 * ```typescript
 * const stats = await cleanupPaymentRateLimitCache();
 * console.log(`Cleaned ${stats.cleanedKeys} corrupted entries`);
 * ```
 */
export async function cleanupPaymentRateLimitCache(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    scannedKeys: 0,
    corruptedKeys: 0,
    cleanedKeys: 0,
    errors: 0,
    skippedKeys: 0,
  };

  try {
    console.log('🔍 Scanning for payment rate limit cache entries...');

    // Validate Redis environment
    const redisValidation = ENV_VALIDATORS.redis();
    if (!redisValidation.isValid) {
      console.error('❌ Redis environment validation failed:', redisValidation.message);
      console.error('Missing variables:', redisValidation.missingVars);
      throw new Error(`Redis validation failed: ${redisValidation.message}`);
    }

    // Initialize Redis client using validated environment config
    const redis = new Redis({
      url: ENV_CONFIG.UPSTASH_REDIS_REST_URL,
      token: ENV_CONFIG.UPSTASH_REDIS_REST_TOKEN,
    });

    // Get all payment rate limit keys
    const paymentKeys = await redis.keys('rate_limit:payment:*');
    stats.scannedKeys = paymentKeys.length;

    console.log(`📊 Found ${paymentKeys.length} payment rate limit keys to check`);

    if (paymentKeys.length === 0) {
      console.log('✅ No payment rate limit keys found');
      return stats;
    }

    // Process keys in batches
    const batchSize = 50;
    for (let i = 0; i < paymentKeys.length; i += batchSize) {
      const batch = paymentKeys.slice(i, i + batchSize);

      console.log(
        `\n🔧 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(paymentKeys.length / batchSize)}`,
      );

      for (const key of batch) {
        try {
          const value = await redis.get(key);

          if (value === null) {
            console.log(`⚪ Skipping null key: ${key}`);
            stats.skippedKeys++;
            continue;
          }

          // Check if it's corrupted (single number instead of array)
          let isCorrupted = false;

          try {
            const parsed = JSON.parse(value as string);

            // Should be an array of timestamps
            if (!Array.isArray(parsed)) {
              console.log(`❌ Corrupted (not array): ${key} = ${value}`);
              isCorrupted = true;
            } else if (!parsed.every((item) => typeof item === 'number')) {
              console.log(`❌ Corrupted (invalid array items): ${key} = ${JSON.stringify(parsed)}`);
              isCorrupted = true;
            } else {
              // Valid format
              console.log(`✅ Valid: ${key} (${parsed.length} entries)`);
            }
          } catch (parseError) {
            // Check if it's a plain number (corrupted format)
            if (!isNaN(Number(value))) {
              console.log(`❌ Corrupted (plain number): ${key} = ${value}`);
              isCorrupted = true;
            } else {
              console.log(
                `❌ Corrupted (invalid JSON): ${key} = ${value}, error: ${parseError instanceof Error ? parseError.message : parseError}`,
              );
              isCorrupted = true;
            }
          }

          if (isCorrupted) {
            stats.corruptedKeys++;

            // Delete the corrupted entry
            await redis.del(key);
            stats.cleanedKeys++;
            console.log(`🗑️  Deleted corrupted key: ${key}`);
          }
        } catch (error) {
          console.error(`💥 Error processing key ${key}:`, error);
          stats.errors++;
        }
      }

      // Small delay between batches to avoid overwhelming Redis
      if (i + batchSize < paymentKeys.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log('\n📈 Cleanup Summary:');
    console.log(`   Scanned keys: ${stats.scannedKeys}`);
    console.log(`   Corrupted keys: ${stats.corruptedKeys}`);
    console.log(`   Cleaned keys: ${stats.cleanedKeys}`);
    console.log(`   Skipped keys: ${stats.skippedKeys}`);
    console.log(`   Errors: ${stats.errors}`);

    if (stats.cleanedKeys > 0) {
      console.log(
        `\n✅ Successfully cleaned up ${stats.cleanedKeys} corrupted payment rate limit entries`,
      );
    } else {
      console.log('\n✅ No corrupted entries found - cache is healthy');
    }

    return stats;
  } catch (error) {
    console.error('💥 Cleanup script failed:', error);
    throw error;
  }
}
