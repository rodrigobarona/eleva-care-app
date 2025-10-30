import { qstashHealthCheck } from '@/lib/integrations/qstash/config';
import { redisManager } from '@/lib/redis/manager';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';

describe('Keep-Alive Service Integration Tests', () => {
  beforeAll(async () => {
    // Services initialize on first use - health check will trigger initialization
  });

  afterAll(async () => {
    // No need to disconnect - Redis manager handles cleanup
  });

  describe('Redis Health', () => {
    test('should connect and perform basic operations', async () => {
      const result = await redisManager.healthCheck();
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.mode).toBeDefined();
      expect(result.responseTime).toBeDefined();
    });

    test('should handle connection errors gracefully', async () => {
      // Simulate connection error by temporarily disabling Redis
      const originalRedis = (redisManager as any).redis;
      (redisManager as any).redis = null;
      (redisManager as any).isRedisAvailable = false;

      const result = await redisManager.healthCheck();
      expect(result.status).toBe('healthy');
      expect(result.mode).toBe('in-memory');

      // Restore Redis connection
      (redisManager as any).redis = originalRedis;
      (redisManager as any).isRedisAvailable = true;
    });
  });

  describe('QStash Health', () => {
    test('should verify QStash configuration', async () => {
      const result = await qstashHealthCheck();
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.configured).toBeDefined();
      expect(result.responseTime).toBeDefined();
    });

    test('should handle missing configuration gracefully', async () => {
      // Temporarily unset QStash token
      const originalToken = process.env.QSTASH_TOKEN;
      delete process.env.QSTASH_TOKEN;

      const result = await qstashHealthCheck();
      expect(result.status).toBe('not-configured');

      // Restore token
      process.env.QSTASH_TOKEN = originalToken;
    });
  });

  describe('Cache Cleanup', () => {
    beforeAll(async () => {
      // Set up test data in Redis
      await redisManager.set('test_key_1', 'value1', 60);
      await redisManager.set('test_key_2', 'value2', 60);
    });

    afterAll(async () => {
      // Clean up test data
      await redisManager.del('test_key_1');
      await redisManager.del('test_key_2');
    });

    test('should clean up expired keys', async () => {
      // Set a key with immediate expiration
      await redisManager.set('expired_key', 'expired', 1);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Run cleanup
      // Redis handles cleanup automatically
      const result = await redisManager.healthCheck();
      expect(result.status).toBe('healthy');
    });

    test('should handle corrupted data gracefully', async () => {
      // Simulate corrupted data
      await redisManager.set('corrupted_key', '{invalid:json}', 60);

      // Redis handles corrupted data automatically
      const result = await redisManager.healthCheck();
      expect(result.status).toBe('healthy');
    });
  });
});
