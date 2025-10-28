/**
 * Clear Clerk Cache Script - Immediate Action
 *
 * This script clears all Clerk-related cache entries from Redis immediately
 * to resolve the "[object Object]" corruption issue.
 *
 * Usage:
 *   pnpm tsx scripts/clear-clerk-cache-now.ts
 */
import { Redis } from '@upstash/redis';

async function clearClerkCacheNow() {
  console.log('🔄 Starting immediate Clerk cache cleanup...\n');

  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      console.error('❌ Redis credentials not found in environment variables');
      console.log('   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
      process.exit(1);
    }

    // Connect to Redis
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    console.log('✅ Connected to Upstash Redis\n');

    // Patterns to match Clerk cache keys
    const patterns = ['clerk:username:*', 'clerk:id:*', 'clerk:ids:*'];

    let totalDeleted = 0;

    for (const pattern of patterns) {
      console.log(`🔍 Searching for keys matching: ${pattern}`);

      try {
        // Use SCAN to find keys matching pattern
        // SCAN is safer than KEYS as it doesn't block the server
        let cursor = 0;
        const keysToDelete: string[] = [];

        do {
          // Upstash Redis supports SCAN
          const result = await redis.scan(cursor, {
            match: pattern,
            count: 100,
          });

          cursor = result[0];
          const keys = result[1] as string[];

          if (keys.length > 0) {
            keysToDelete.push(...keys);
          }
        } while (cursor !== 0);

        if (keysToDelete.length === 0) {
          console.log(`   ℹ️  No keys found matching ${pattern}\n`);
          continue;
        }

        console.log(`   📋 Found ${keysToDelete.length} keys to delete`);

        // Delete keys in batches
        for (const key of keysToDelete) {
          await redis.del(key);
          totalDeleted++;
          console.log(`   ✅ Deleted: ${key}`);
        }

        console.log(`   ✨ Completed deletion for ${pattern}\n`);
      } catch (error) {
        console.error(`   ❌ Error processing pattern ${pattern}:`, error);
        console.log('');
      }
    }

    console.log('━'.repeat(60));
    console.log(`\n✅ Cache cleanup complete! Deleted ${totalDeleted} keys.\n`);

    if (totalDeleted > 0) {
      console.log('🎉 Clerk cache has been cleared successfully!');
      console.log('   The application will now fetch fresh data from Clerk API.');
      console.log('   No more "[object Object]" errors should appear.\n');
    } else {
      console.log('ℹ️  No Clerk cache entries were found.');
      console.log('   The cache may have already been cleared or expired.\n');
    }
  } catch (error) {
    console.error('❌ Fatal error during cache cleanup:', error);
    process.exit(1);
  }
}

// Run the script
clearClerkCacheNow()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
