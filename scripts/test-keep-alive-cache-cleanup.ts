#!/usr/bin/env tsx
/**
 * Test script for keep-alive cache cleanup integration
 *
 * This script tests the enhanced keep-alive endpoint with cache cleanup
 */

async function testKeepAliveCacheCleanup() {
  try {
    console.log('🧪 Testing keep-alive with cache cleanup...');

    // Set force cleanup flag
    process.env.FORCE_CACHE_CLEANUP = 'true';

    // Import the keep-alive module
    const keepAliveModule = await import('../app/api/cron/keep-alive/route');

    // Create a mock request with proper authorization
    const request = new Request('http://localhost:3000/api/cron/keep-alive', {
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET || 'test-secret'}`,
      },
    });

    console.log('📡 Calling keep-alive endpoint...');
    const response = await keepAliveModule.GET(request);
    const result = await response.json();

    console.log('\n📊 Keep-alive results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Status: ${response.status}`);
    console.log(`Duration: ${result.metrics?.durationMs}ms`);

    if (result.metrics?.systemHealth) {
      console.log('\n🏥 System Health:');
      Object.entries(result.metrics.systemHealth).forEach(([key, value]) => {
        const emoji =
          value === 'healthy'
            ? '✅'
            : value === 'degraded'
              ? '⚠️'
              : value === 'not-scheduled'
                ? '📅'
                : '❌';
        console.log(`  ${emoji} ${key}: ${value}`);
      });
    }

    if (result.metrics?.cacheCleanup) {
      console.log('\n🧹 Cache Cleanup Results:');
      const cleanup = result.metrics.cacheCleanup;
      console.log(`  Executed: ${cleanup.executed}`);
      console.log(`  Scanned: ${cleanup.scannedKeys} keys`);
      console.log(`  Corrupted: ${cleanup.corruptedKeys} keys`);
      console.log(`  Cleaned: ${cleanup.cleanedKeys} keys`);
      console.log(`  Errors: ${cleanup.errors}`);
      console.log(`  Execution time: ${cleanup.executionTime}ms`);
    }

    if (result.metrics?.redisHealth) {
      console.log('\n📦 Redis Health:');
      const redis = result.metrics.redisHealth;
      console.log(`  Status: ${redis.status}`);
      console.log(`  Mode: ${redis.mode}`);
      console.log(`  Response time: ${redis.responseTime}ms`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (response.status === 200) {
      console.log('🎉 Keep-alive with cache cleanup test completed successfully!');
    } else {
      console.log('❌ Keep-alive test failed');
      console.log('Error:', result.error || 'Unknown error');
    }
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testKeepAliveCacheCleanup();
}

export { testKeepAliveCacheCleanup };
