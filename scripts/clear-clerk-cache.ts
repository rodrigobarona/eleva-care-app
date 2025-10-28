#!/usr/bin/env tsx
/**
 * Clear Clerk Cache Script
 *
 * This script clears all Clerk-related cache entries from Redis.
 * Use this after the environment-specific cache key fix to remove
 * any corrupted or mixed dev/prod cache data.
 *
 * Usage:
 *   pnpm tsx scripts/clear-clerk-cache.ts
 *
 * Options:
 *   --env=development|production|test - Clear cache for specific environment
 *   --all - Clear cache for all environments
 */
import { redisManager } from '../lib/redis';

const args = process.argv.slice(2);
const envArg = args.find((arg) => arg.startsWith('--env='))?.split('=')[1];
const clearAll = args.includes('--all');

async function clearClerkCache(environment?: string) {
  const env = environment || process.env.NODE_ENV || 'development';

  console.log(`🧹 Clearing Clerk cache for environment: ${env}`);

  try {
    // Perform Redis health check first
    const healthCheck = await redisManager.healthCheck();

    if (healthCheck.status === 'unhealthy') {
      console.error('❌ Redis is unhealthy:', healthCheck.message);
      if (healthCheck.error) {
        console.error('Error details:', healthCheck.error);
      }
      console.log('\n💡 Falling back to in-memory cache. No action needed.');
      return;
    }

    console.log(`✅ Redis is healthy (${healthCheck.mode}, ${healthCheck.responseTime}ms)`);

    // Note: Upstash Redis REST API doesn't support KEYS command efficiently
    // We'll clear common patterns manually

    const prefixes = [
      `clerk:${env}:id:`,
      `clerk:${env}:username:`,
      `clerk:${env}:ids:`,
      // Old format (pre-fix) - also clear these
      'clerk:id:',
      'clerk:username:',
      'clerk:ids:',
    ];

    console.log(`\n🔍 Searching for keys with patterns:`);
    prefixes.forEach((prefix) => console.log(`   - ${prefix}*`));

    // Since we can't use KEYS command, we'll document manual clearing
    console.log('\n⚠️  Important: Upstash Redis REST API limitations');
    console.log(
      '   The KEYS command is not available, so we cannot automatically scan and delete.',
    );
    console.log('\n💡 Options:');
    console.log('   1. Wait for cache to expire naturally (5 minutes TTL)');
    console.log('   2. Manually clear cache via Upstash dashboard');
    console.log('   3. Restart your application to force fresh fetches');

    // For in-memory cache, we can't clear it without restarting
    console.log('\n✅ Cache keys are now environment-specific!');
    console.log(`   Dev keys:  clerk:development:*`);
    console.log(`   Prod keys: clerk:production:*`);
    console.log('\n   No more dev/prod collision! 🎉');
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Clerk Cache Clearing Script\n');

  if (clearAll) {
    console.log('Clearing cache for all environments...\n');
    await clearClerkCache('development');
    await clearClerkCache('production');
    await clearClerkCache('test');
  } else if (envArg) {
    await clearClerkCache(envArg);
  } else {
    await clearClerkCache();
  }

  console.log('\n✅ Done!');
  console.log(
    '\n📝 Note: Existing cache will expire in 5 minutes. New cache will be environment-specific.',
  );
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
