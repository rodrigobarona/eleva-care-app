import { Redis } from '@upstash/redis';

/**
 * Redis client for distributed caching
 * Supports both Upstash Redis (production) and in-memory fallback (development)
 */
class RedisManager {
  private redis: Redis | null = null;
  private inMemoryCache: Map<string, { value: string; expiresAt: number }> = new Map();
  private isRedisAvailable = false;

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis() {
    try {
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (redisUrl && redisToken) {
        this.redis = new Redis({
          url: redisUrl,
          token: redisToken,
        });
        this.isRedisAvailable = true;
        console.log('✅ Redis client initialized successfully');
      } else {
        console.warn(
          '⚠️ Redis credentials not found, falling back to in-memory cache for development',
        );
        this.isRedisAvailable = false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Redis client:', error);
      this.isRedisAvailable = false;
    }
  }

  /**
   * Set a key-value pair with optional expiration in seconds
   */
  async set(key: string, value: string, expirationSeconds?: number): Promise<void> {
    if (this.isRedisAvailable && this.redis) {
      try {
        if (expirationSeconds) {
          await this.redis.setex(key, expirationSeconds, value);
        } else {
          await this.redis.set(key, value);
        }
        return;
      } catch (error) {
        console.error('Redis SET error:', error);
        // Fallback to in-memory cache
      }
    }

    // In-memory fallback
    const expiresAt = expirationSeconds
      ? Date.now() + expirationSeconds * 1000
      : Number.MAX_SAFE_INTEGER;

    this.inMemoryCache.set(key, { value, expiresAt });
    this.cleanupInMemoryCache();
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    if (this.isRedisAvailable && this.redis) {
      try {
        const result = await this.redis.get(key);
        return result as string | null;
      } catch (error) {
        console.error('Redis GET error:', error);
        // Fallback to in-memory cache
      }
    }

    // In-memory fallback
    this.cleanupInMemoryCache();
    const cached = this.inMemoryCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    if (cached && cached.expiresAt <= Date.now()) {
      this.inMemoryCache.delete(key);
    }

    return null;
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (error) {
        console.error('Redis DEL error:', error);
        // Fallback to in-memory cache
      }
    }

    // In-memory fallback
    this.inMemoryCache.delete(key);
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (this.isRedisAvailable && this.redis) {
      try {
        const result = await this.redis.exists(key);
        return result === 1;
      } catch (error) {
        console.error('Redis EXISTS error:', error);
        // Fallback to in-memory cache
      }
    }

    // In-memory fallback
    this.cleanupInMemoryCache();
    const cached = this.inMemoryCache.get(key);
    return cached ? cached.expiresAt > Date.now() : false;
  }

  /**
   * Set a key with expiration using Unix timestamp
   */
  async setWithTimestamp(key: string, value: string, expiresAt: number): Promise<void> {
    const secondsUntilExpiry = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    await this.set(key, value, secondsUntilExpiry);
  }

  /**
   * Clean up expired entries from in-memory cache
   */
  private cleanupInMemoryCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.inMemoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.inMemoryCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      isRedisAvailable: this.isRedisAvailable,
      inMemoryCacheSize: this.inMemoryCache.size,
      cacheType: this.isRedisAvailable ? 'Redis' : 'In-Memory',
    };
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    if (!this.isRedisAvailable || !this.redis) {
      return {
        status: 'healthy',
        message: 'Using in-memory cache fallback',
      };
    }

    try {
      await this.redis.ping();
      return {
        status: 'healthy',
        message: 'Redis connection is healthy',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Create a singleton instance
export const redisManager = new RedisManager();

/**
 * Idempotency cache utility for API endpoints
 */
export class IdempotencyCache {
  private static readonly CACHE_PREFIX = 'idempotency:';
  private static readonly DEFAULT_TTL_SECONDS = 600; // 10 minutes

  /**
   * Store an idempotency result
   */
  static async set(
    key: string,
    result: { url: string },
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + key;
    const value = JSON.stringify(result);
    await redisManager.set(cacheKey, value, ttlSeconds);
  }

  /**
   * Get an idempotency result
   */
  static async get(key: string): Promise<{ url: string } | null> {
    const cacheKey = this.CACHE_PREFIX + key;
    const cached = await redisManager.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached) as { url: string };
      } catch (error) {
        console.error('Failed to parse cached idempotency result:', error);
        // Clean up corrupted cache entry
        await redisManager.del(cacheKey);
      }
    }

    return null;
  }

  /**
   * Check if an idempotency key exists
   */
  static async exists(key: string): Promise<boolean> {
    const cacheKey = this.CACHE_PREFIX + key;
    return await redisManager.exists(cacheKey);
  }

  /**
   * Delete an idempotency key
   */
  static async delete(key: string): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + key;
    await redisManager.del(cacheKey);
  }

  /**
   * Clean up expired entries (not needed for Redis as it handles TTL automatically)
   * This method is kept for compatibility and debugging
   */
  static async cleanup(): Promise<void> {
    // Redis handles TTL automatically, so this is a no-op for Redis
    // For in-memory cache, cleanup happens automatically in get operations
    console.log('Idempotency cache cleanup requested (automatic with Redis)');
  }
}

/**
 * Form cache utility for frontend duplicate prevention
 */
export class FormCache {
  private static readonly CACHE_PREFIX = 'form:';
  private static readonly DEFAULT_TTL_SECONDS = 300; // 5 minutes

  /**
   * Store a form submission state
   */
  static async set(
    key: string,
    formData: {
      eventId: string;
      guestEmail: string;
      startTime: string;
      status: 'processing' | 'completed' | 'failed';
      timestamp: number;
    },
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + key;
    const value = JSON.stringify(formData);
    await redisManager.set(cacheKey, value, ttlSeconds);
  }

  /**
   * Get a form submission state
   */
  static async get(key: string): Promise<{
    eventId: string;
    guestEmail: string;
    startTime: string;
    status: 'processing' | 'completed' | 'failed';
    timestamp: number;
  } | null> {
    const cacheKey = this.CACHE_PREFIX + key;
    const cached = await redisManager.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        console.error('Failed to parse cached form data:', error);
        // Clean up corrupted cache entry
        await redisManager.del(cacheKey);
      }
    }

    return null;
  }

  /**
   * Check if a form submission is in progress
   */
  static async isProcessing(key: string): Promise<boolean> {
    const cached = await this.get(key);
    return cached?.status === 'processing';
  }

  /**
   * Mark form submission as completed
   */
  static async markCompleted(key: string): Promise<void> {
    const cached = await this.get(key);
    if (cached) {
      cached.status = 'completed';
      cached.timestamp = Date.now();
      await this.set(key, cached);
    }
  }

  /**
   * Mark form submission as failed
   */
  static async markFailed(key: string): Promise<void> {
    const cached = await this.get(key);
    if (cached) {
      cached.status = 'failed';
      cached.timestamp = Date.now();
      await this.set(key, cached);
    }
  }

  /**
   * Delete a form submission cache entry
   */
  static async delete(key: string): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + key;
    await redisManager.del(cacheKey);
  }

  /**
   * Generate a unique key for form submission
   */
  static generateKey(eventId: string, guestEmail: string, startTime: string): string {
    return `${eventId}-${guestEmail}-${startTime}`.replace(/[^a-zA-Z0-9-_]/g, '_');
  }
}

/**
 * Types for cached data structures
 */
interface CachedCustomerData {
  stripeCustomerId: string;
  email: string;
  userId?: string;
  name?: string | null;
  subscriptions?: string[];
  defaultPaymentMethod?: string | null;
  created: number;
  updatedAt: number;
}

interface CachedSubscriptionData {
  id: string;
  customerId: string;
  status: string;
  priceId: string;
  productId: string;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  created: number;
  updatedAt: number;
}

/**
 * Customer cache utility for Stripe customer/session data
 * Consolidates the existing KV store functionality from lib/stripe.ts
 */
export class CustomerCache {
  private static readonly CACHE_PREFIX = 'customer:';
  private static readonly USER_PREFIX = 'user:';
  private static readonly EMAIL_PREFIX = 'email:';
  private static readonly SUBSCRIPTION_PREFIX = 'subscription:';
  private static readonly DEFAULT_TTL_SECONDS = 86400; // 24 hours

  /**
   * Store customer data by Stripe customer ID
   */
  static async setCustomer(
    customerId: string,
    customerData: CachedCustomerData,
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + customerId;
    const value = JSON.stringify(customerData);
    await redisManager.set(cacheKey, value, ttlSeconds);
  }

  /**
   * Get customer data by Stripe customer ID
   */
  static async getCustomer(customerId: string): Promise<CachedCustomerData | null> {
    const cacheKey = this.CACHE_PREFIX + customerId;
    const cached = await redisManager.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached) as CachedCustomerData;
      } catch (error) {
        console.error('Failed to parse cached customer data:', error);
        await redisManager.del(cacheKey);
      }
    }

    return null;
  }

  /**
   * Store user ID to customer ID mapping
   */
  static async setUserMapping(
    userId: string,
    customerId: string,
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    const cacheKey = this.USER_PREFIX + userId;
    await redisManager.set(cacheKey, customerId, ttlSeconds);
  }

  /**
   * Get customer ID by user ID
   */
  static async getCustomerByUserId(userId: string): Promise<string | null> {
    const cacheKey = this.USER_PREFIX + userId;
    return await redisManager.get(cacheKey);
  }

  /**
   * Store email to customer ID mapping
   */
  static async setEmailMapping(
    email: string,
    customerId: string,
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    const cacheKey = this.EMAIL_PREFIX + email;
    await redisManager.set(cacheKey, customerId, ttlSeconds);
  }

  /**
   * Get customer ID by email
   */
  static async getCustomerByEmail(email: string): Promise<string | null> {
    const cacheKey = this.EMAIL_PREFIX + email;
    return await redisManager.get(cacheKey);
  }

  /**
   * Store subscription data
   */
  static async setSubscription(
    subscriptionId: string,
    subscriptionData: CachedSubscriptionData,
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    const cacheKey = this.SUBSCRIPTION_PREFIX + subscriptionId;
    const value = JSON.stringify(subscriptionData);
    await redisManager.set(cacheKey, value, ttlSeconds);
  }

  /**
   * Get subscription data
   */
  static async getSubscription(subscriptionId: string): Promise<CachedSubscriptionData | null> {
    const cacheKey = this.SUBSCRIPTION_PREFIX + subscriptionId;
    const cached = await redisManager.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached) as CachedSubscriptionData;
      } catch (error) {
        console.error('Failed to parse cached subscription data:', error);
        await redisManager.del(cacheKey);
      }
    }

    return null;
  }

  /**
   * Delete customer and all related mappings
   */
  static async deleteCustomer(customerId: string, email?: string, userId?: string): Promise<void> {
    const deletePromises = [redisManager.del(this.CACHE_PREFIX + customerId)];

    if (email) {
      deletePromises.push(redisManager.del(this.EMAIL_PREFIX + email));
    }

    if (userId) {
      deletePromises.push(redisManager.del(this.USER_PREFIX + userId));
    }

    await Promise.all(deletePromises);
  }

  /**
   * Health check for customer cache
   */
  static async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    try {
      const testKey = this.CACHE_PREFIX + 'health-check';
      const testData = { test: true, timestamp: Date.now() };

      await redisManager.set(testKey, JSON.stringify(testData), 10);
      const retrieved = await redisManager.get(testKey);
      await redisManager.del(testKey);

      if (retrieved && JSON.parse(retrieved).test === true) {
        return { status: 'healthy', message: 'Customer cache is working properly' };
      } else {
        return { status: 'unhealthy', message: 'Customer cache test failed' };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Customer cache error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

export default redisManager;
