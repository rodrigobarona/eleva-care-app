#!/usr/bin/env tsx
/**
 * Redis Cache Cleanup Script
 *
 * This script identifies and cleans up corrupted rate limit cache entries
 * that may be causing "filter is not a function" errors.
 */
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface CleanupStats {
  totalKeys: number;
  corruptedKeys: number;
  cleanedKeys: number;
  errors: number;
}

async function cleanupCorruptedRateLimitCache(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    totalKeys: 0,
    corruptedKeys: 0,
    cleanedKeys: 0,
    errors: 0,
  };

  try {
    console.log('🔍 Scanning for rate limit cache entries...');

    // Get all rate limit keys
    const rateLimitKeys = await redis.keys('rate_limit:*');
    stats.totalKeys = rateLimitKeys.length;

    console.log(`Found ${stats.totalKeys} rate limit cache entries`);

    if (stats.totalKeys === 0) {
      console.log('✅ No rate limit cache entries found');
      return stats;
    }

    // Check each key
    for (const key of rateLimitKeys) {
      try {
        const value = await redis.get(key);

        if (value === null) {
          console.log(`⚠️ Key ${key} is null, skipping`);
          continue;
        }

        try {
          const parsed = JSON.parse(value as string);

          // Check if it's a valid rate limit entry (array of numbers)
          if (!Array.isArray(parsed)) {
            console.log(`❌ Invalid data type for ${key}: ${typeof parsed}`);
            stats.corruptedKeys++;

            // Delete corrupted entry
            await redis.del(key);
            stats.cleanedKeys++;
            console.log(`🧹 Cleaned up corrupted key: ${key}`);
          } else if (!parsed.every((item) => typeof item === 'number')) {
            console.log(`❌ Invalid array content for ${key}: contains non-number values`);
            stats.corruptedKeys++;

            // Delete corrupted entry
            await redis.del(key);
            stats.cleanedKeys++;
            console.log(`🧹 Cleaned up corrupted key: ${key}`);
          } else {
            console.log(`✅ Valid rate limit entry: ${key} (${parsed.length} attempts)`);
          }
        } catch (parseError) {
          console.log(`❌ JSON parse error for ${key}:`, parseError);
          stats.corruptedKeys++;

          // Delete unparseable entry
          await redis.del(key);
          stats.cleanedKeys++;
          console.log(`🧹 Cleaned up unparseable key: ${key}`);
        }
      } catch (error) {
        console.error(`❌ Error processing key ${key}:`, error);
        stats.errors++;
      }
    }

    // Also check notification queue entries
    console.log('\n🔍 Scanning for notification queue cache entries...');
    const notificationKeys = await redis.keys('notification_queue:*');

    for (const key of notificationKeys) {
      try {
        const value = await redis.get(key);

        if (value === null) {
          console.log(`⚠️ Key ${key} is null, skipping`);
          continue;
        }

        try {
          const parsed = JSON.parse(value as string);

          // Check if it's a valid notification queue entry (array)
          if (!Array.isArray(parsed)) {
            console.log(`❌ Invalid notification queue data type for ${key}: ${typeof parsed}`);
            stats.corruptedKeys++;

            // Delete corrupted entry
            await redis.del(key);
            stats.cleanedKeys++;
            console.log(`🧹 Cleaned up corrupted notification queue key: ${key}`);
          } else {
            console.log(
              `✅ Valid notification queue entry: ${key} (${parsed.length} notifications)`,
            );
          }
        } catch (parseError) {
          console.log(`❌ JSON parse error for notification queue ${key}:`, parseError);
          stats.corruptedKeys++;

          // Delete unparseable entry
          await redis.del(key);
          stats.cleanedKeys++;
          console.log(`🧹 Cleaned up unparseable notification queue key: ${key}`);
        }
      } catch (error) {
        console.error(`❌ Error processing notification queue key ${key}:`, error);
        stats.errors++;
      }
    }
  } catch (error) {
    console.error('❌ Failed to scan Redis cache:', error);
    stats.errors++;
  }

  return stats;
}

async function main() {
  console.log('🚀 Starting Redis cache cleanup...\n');

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error('❌ Missing Redis environment variables');
    console.error('Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
    process.exit(1);
  }

  try {
    const stats = await cleanupCorruptedRateLimitCache();

    console.log('\n📊 Cleanup Summary:');
    console.log(`   Total cache entries checked: ${stats.totalKeys}`);
    console.log(`   Corrupted entries found: ${stats.corruptedKeys}`);
    console.log(`   Entries cleaned up: ${stats.cleanedKeys}`);
    console.log(`   Errors encountered: ${stats.errors}`);

    if (stats.corruptedKeys === 0) {
      console.log('\n✅ No corrupted cache entries found! Your Redis cache is healthy.');
    } else {
      console.log(`\n🧹 Successfully cleaned up ${stats.cleanedKeys} corrupted cache entries.`);
      console.log('The rate limiting and notification systems should now work properly.');
    }
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run the cleanup if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { cleanupCorruptedRateLimitCache };
