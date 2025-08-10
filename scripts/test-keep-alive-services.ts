#!/usr/bin/env tsx
/**
 * Test script for Redis and QStash health checks
 *
 * This script tests the new keep-alive functionality for Redis and QStash
 * without triggering the full keep-alive cron job.
 */
import { qstashHealthCheck } from '../lib/qstash-config';
import { redisManager } from '../lib/redis';

async function testRedisHealth() {
  console.log('🧪 Testing Redis Health Check...');
  try {
    const result = await redisManager.healthCheck();
    console.log('✅ Redis Health Result:', {
      status: result.status,
      mode: result.mode,
      responseTime: `${result.responseTime}ms`,
      message: result.message,
      error: result.error || 'none',
    });
    return result;
  } catch (error) {
    console.error('❌ Redis Health Check Error:', error);
    return null;
  }
}

async function testQStashHealth() {
  console.log('🧪 Testing QStash Health Check...');
  try {
    const result = await qstashHealthCheck();
    console.log('✅ QStash Health Result:', {
      status: result.status,
      configured: result.configured,
      responseTime: `${result.responseTime}ms`,
      message: result.message,
      error: result.error || 'none',
    });
    return result;
  } catch (error) {
    console.error('❌ QStash Health Check Error:', error);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting Keep-Alive Services Health Check Test\n');

  const redisResult = await testRedisHealth();
  console.log('');
  const qstashResult = await testQStashHealth();

  console.log('\n📊 Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Redis:  ${redisResult?.status || 'failed'} (${redisResult?.mode || 'unknown'})`);
  console.log(
    `QStash: ${qstashResult?.status || 'failed'} (configured: ${qstashResult?.configured || 'unknown'})`,
  );

  const overallHealth =
    (redisResult?.status === 'healthy' || redisResult?.mode === 'in-memory') &&
    (qstashResult?.status === 'healthy' || !qstashResult?.configured);

  console.log(`Overall: ${overallHealth ? '🟢 HEALTHY' : '🔴 UNHEALTHY'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.exit(overallHealth ? 0 : 1);
}

main().catch((error) => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});
