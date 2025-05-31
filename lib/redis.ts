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

/**
 * Rate limiting cache utility for API endpoints and user actions
 */
export class RateLimitCache {
  private static readonly CACHE_PREFIX = 'rate_limit:';
  private static readonly DEFAULT_WINDOW_SECONDS = 300; // 5 minutes

  /**
   * Check if a rate limit has been exceeded
   */
  static async checkRateLimit(
    key: string,
    maxAttempts: number,
    windowSeconds: number = this.DEFAULT_WINDOW_SECONDS,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalHits: number;
  }> {
    const cacheKey = this.CACHE_PREFIX + key;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      // Get current attempts data
      const cached = await redisManager.get(cacheKey);
      let attempts: number[] = cached ? JSON.parse(cached) : [];

      // Filter out attempts outside the current window
      attempts = attempts.filter((timestamp) => timestamp > windowStart);

      // Check if limit exceeded
      const currentAttempts = attempts.length;
      const allowed = currentAttempts < maxAttempts;
      const remaining = Math.max(0, maxAttempts - currentAttempts);

      // Calculate reset time (when oldest attempt will expire)
      const resetTime =
        attempts.length > 0 ? attempts[0] + windowSeconds * 1000 : now + windowSeconds * 1000;

      return {
        allowed,
        remaining,
        resetTime,
        totalHits: currentAttempts,
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // On error, allow the request (fail open)
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetTime: now + windowSeconds * 1000,
        totalHits: 0,
      };
    }
  }

  /**
   * Record a rate limit attempt
   */
  static async recordAttempt(
    key: string,
    windowSeconds: number = this.DEFAULT_WINDOW_SECONDS,
  ): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + key;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      // Get current attempts
      const cached = await redisManager.get(cacheKey);
      let attempts: number[] = cached ? JSON.parse(cached) : [];

      // Filter out old attempts and add new one
      attempts = attempts.filter((timestamp) => timestamp > windowStart);
      attempts.push(now);

      // Store updated attempts with TTL
      const value = JSON.stringify(attempts);
      await redisManager.set(cacheKey, value, windowSeconds + 60); // Extra 60s buffer
    } catch (error) {
      console.error('Failed to record rate limit attempt:', error);
      // Continue execution even if recording fails
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  static async resetRateLimit(key: string): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + key;
    await redisManager.del(cacheKey);
  }

  /**
   * Get rate limit status without recording an attempt
   */
  static async getRateLimitStatus(
    key: string,
    maxAttempts: number,
    windowSeconds: number = this.DEFAULT_WINDOW_SECONDS,
  ): Promise<{
    attempts: number;
    remaining: number;
    resetTime: number;
    blocked: boolean;
  }> {
    const result = await this.checkRateLimit(key, maxAttempts, windowSeconds);
    return {
      attempts: result.totalHits,
      remaining: result.remaining,
      resetTime: result.resetTime,
      blocked: !result.allowed,
    };
  }
}

/**
 * Notification queue interfaces
 */
export interface QueuedNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high';
  queuedAt: number;
  scheduledFor: number;
}

export interface NotificationBatchData {
  notifications: Array<{ userId: string; notification: QueuedNotification }>;
  createdAt: number;
  status: string;
}

/**
 * Notification queue cache for managing notification delivery and batching
 */
export class NotificationQueueCache {
  private static readonly CACHE_PREFIX = 'notification_queue:';
  private static readonly BATCH_PREFIX = 'notification_batch:';
  private static readonly DEFAULT_TTL_SECONDS = 3600; // 1 hour

  /**
   * Queue a notification for batch processing
   */
  static async queueNotification(
    userId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      data?: Record<string, unknown>;
      priority?: 'low' | 'normal' | 'high';
      scheduledFor?: Date;
    },
  ): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + userId;
    const now = Date.now();

    const queueItem: QueuedNotification = {
      id: `notif_${now}_${Math.random().toString(36).substr(2, 9)}`,
      ...notification,
      queuedAt: now,
      scheduledFor: notification.scheduledFor?.getTime() || now,
    };

    try {
      // Get current queue
      const cached = await redisManager.get(cacheKey);
      const queue: QueuedNotification[] = cached ? JSON.parse(cached) : [];

      // Add new notification
      queue.push(queueItem);

      // Sort by priority and scheduled time
      queue.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const aPriority = priorityOrder[a.priority || 'normal'];
        const bPriority = priorityOrder[b.priority || 'normal'];

        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        return a.scheduledFor - b.scheduledFor; // Earlier time first
      });

      // Store updated queue
      const value = JSON.stringify(queue);
      await redisManager.set(cacheKey, value, this.DEFAULT_TTL_SECONDS);
    } catch (error) {
      console.error('Failed to queue notification:', error);
      throw error;
    }
  }

  /**
   * Get pending notifications for a user
   */
  static async getPendingNotifications(
    userId: string,
    limit: number = 10,
  ): Promise<QueuedNotification[]> {
    const cacheKey = this.CACHE_PREFIX + userId;
    const now = Date.now();

    try {
      const cached = await redisManager.get(cacheKey);
      if (!cached) return [];

      const queue: QueuedNotification[] = JSON.parse(cached);

      // Filter notifications that are ready to be sent
      return queue.filter((item) => item.scheduledFor <= now).slice(0, limit);
    } catch (error) {
      console.error('Failed to get pending notifications:', error);
      return [];
    }
  }

  /**
   * Remove processed notifications from queue
   */
  static async removeProcessedNotifications(
    userId: string,
    notificationIds: string[],
  ): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + userId;

    try {
      const cached = await redisManager.get(cacheKey);
      if (!cached) return;

      let queue: QueuedNotification[] = JSON.parse(cached);

      // Remove processed notifications
      queue = queue.filter((item) => !notificationIds.includes(item.id));

      if (queue.length === 0) {
        await redisManager.del(cacheKey);
      } else {
        const value = JSON.stringify(queue);
        await redisManager.set(cacheKey, value, this.DEFAULT_TTL_SECONDS);
      }
    } catch (error) {
      console.error('Failed to remove processed notifications:', error);
    }
  }

  /**
   * Create a batch key for grouping notifications
   */
  static async createBatch(
    batchId: string,
    notifications: Array<{ userId: string; notification: QueuedNotification }>,
    ttlSeconds: number = 1800, // 30 minutes
  ): Promise<void> {
    const cacheKey = this.BATCH_PREFIX + batchId;
    const batchData: NotificationBatchData = {
      notifications,
      createdAt: Date.now(),
      status: 'pending',
    };
    const value = JSON.stringify(batchData);
    await redisManager.set(cacheKey, value, ttlSeconds);
  }

  /**
   * Get batch for processing
   */
  static async getBatch(batchId: string): Promise<NotificationBatchData | null> {
    const cacheKey = this.BATCH_PREFIX + batchId;
    const cached = await redisManager.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }
}

/**
 * Analytics cache for metrics and performance data
 */
export class AnalyticsCache {
  private static readonly CACHE_PREFIX = 'analytics:';
  private static readonly METRICS_PREFIX = 'metrics:';
  private static readonly DEFAULT_TTL_SECONDS = 1800; // 30 minutes

  /**
   * Cache analytics data
   */
  static async cacheAnalytics(
    key: string,
    data: Record<string, unknown>,
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + key;
    const value = JSON.stringify({
      data,
      cachedAt: Date.now(),
    });
    await redisManager.set(cacheKey, value, ttlSeconds);
  }

  /**
   * Get cached analytics data
   */
  static async getAnalytics(key: string): Promise<{
    data: Record<string, unknown>;
    cachedAt: number;
  } | null> {
    const cacheKey = this.CACHE_PREFIX + key;
    const cached = await redisManager.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Increment a metric counter
   */
  static async incrementMetric(
    metricKey: string,
    increment: number = 1,
    windowSeconds: number = 3600, // 1 hour
  ): Promise<number> {
    const cacheKey = this.METRICS_PREFIX + metricKey;

    try {
      // Check if key exists
      const exists = await redisManager.exists(cacheKey);

      if (!exists) {
        // Create new metric with TTL
        await redisManager.set(cacheKey, increment.toString(), windowSeconds);
        return increment;
      } else {
        // Increment existing metric
        const current = await redisManager.get(cacheKey);
        const newValue = parseInt(current || '0') + increment;
        await redisManager.set(cacheKey, newValue.toString(), windowSeconds);
        return newValue;
      }
    } catch (error) {
      console.error('Failed to increment metric:', error);
      return increment; // Return the increment as fallback
    }
  }

  /**
   * Get metric value
   */
  static async getMetric(metricKey: string): Promise<number> {
    const cacheKey = this.METRICS_PREFIX + metricKey;
    const cached = await redisManager.get(cacheKey);
    return cached ? parseInt(cached) : 0;
  }

  /**
   * Cache PostHog analytics data
   */
  static async cachePostHogData(
    userId: string,
    eventData: Record<string, unknown>,
    ttlSeconds: number = 86400, // 24 hours
  ): Promise<void> {
    const cacheKey = `posthog:user:${userId}:${Date.now()}`;
    const value = JSON.stringify(eventData);
    await redisManager.set(cacheKey, value, ttlSeconds);
  }
}

/**
 * Session enhancement cache for storing additional session data
 */
export class SessionCache {
  private static readonly CACHE_PREFIX = 'session:';
  private static readonly DEFAULT_TTL_SECONDS = 86400; // 24 hours

  /**
   * Store enhanced session data
   */
  static async setSessionData(
    sessionId: string,
    data: {
      userId: string;
      roles: string[];
      lastActivity: number;
      deviceInfo?: Record<string, unknown>;
      preferences?: Record<string, unknown>;
    },
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + sessionId;
    const value = JSON.stringify({
      ...data,
      updatedAt: Date.now(),
    });
    await redisManager.set(cacheKey, value, ttlSeconds);
  }

  /**
   * Get enhanced session data
   */
  static async getSessionData(sessionId: string): Promise<{
    userId: string;
    roles: string[];
    lastActivity: number;
    deviceInfo?: Record<string, unknown>;
    preferences?: Record<string, unknown>;
    updatedAt: number;
  } | null> {
    const cacheKey = this.CACHE_PREFIX + sessionId;
    const cached = await redisManager.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Update session activity
   */
  static async updateSessionActivity(
    sessionId: string,
    lastActivity: number = Date.now(),
  ): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + sessionId;
    const cached = await redisManager.get(cacheKey);

    if (cached) {
      const sessionData = JSON.parse(cached);
      sessionData.lastActivity = lastActivity;
      sessionData.updatedAt = Date.now();

      const value = JSON.stringify(sessionData);
      await redisManager.set(cacheKey, value, this.DEFAULT_TTL_SECONDS);
    }
  }

  /**
   * Remove session data
   */
  static async removeSessionData(sessionId: string): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + sessionId;
    await redisManager.del(cacheKey);
  }
}

/**
 * Database query cache for frequently accessed data
 */
export class DatabaseCache {
  private static readonly CACHE_PREFIX = 'db:';
  private static readonly DEFAULT_TTL_SECONDS = 1800; // 30 minutes

  /**
   * Cache user data
   */
  static async setUser(
    userId: string,
    userData: Record<string, unknown>,
    ttlSeconds: number = this.DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + `user:${userId}`;
    const value = JSON.stringify({
      ...userData,
      cachedAt: Date.now(),
    });
    await redisManager.set(cacheKey, value, ttlSeconds);
  }

  /**
   * Get cached user data
   */
  static async getUser(userId: string): Promise<Record<string, unknown> | null> {
    const cacheKey = this.CACHE_PREFIX + `user:${userId}`;
    const cached = await redisManager.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        console.error('Failed to parse cached user data:', error);
        await redisManager.del(cacheKey);
      }
    }

    return null;
  }

  /**
   * Cache expert profile with events and availability
   */
  static async setExpertProfile(
    userId: string,
    profileData: Record<string, unknown>,
    ttlSeconds: number = 600, // 10 minutes for profiles (more dynamic data)
  ): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + `profile:${userId}`;
    const value = JSON.stringify({
      ...profileData,
      cachedAt: Date.now(),
    });
    await redisManager.set(cacheKey, value, ttlSeconds);
  }

  /**
   * Get cached expert profile
   */
  static async getExpertProfile(userId: string): Promise<Record<string, unknown> | null> {
    const cacheKey = this.CACHE_PREFIX + `profile:${userId}`;
    const cached = await redisManager.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        console.error('Failed to parse cached profile data:', error);
        await redisManager.del(cacheKey);
      }
    }

    return null;
  }

  /**
   * Cache dashboard analytics for customers/experts
   */
  static async setDashboardData(
    userId: string,
    dashboardData: Record<string, unknown>,
    ttlSeconds: number = 900, // 15 minutes
  ): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + `dashboard:${userId}`;
    const value = JSON.stringify({
      ...dashboardData,
      cachedAt: Date.now(),
    });
    await redisManager.set(cacheKey, value, ttlSeconds);
  }

  /**
   * Get cached dashboard data
   */
  static async getDashboardData(userId: string): Promise<Record<string, unknown> | null> {
    const cacheKey = this.CACHE_PREFIX + `dashboard:${userId}`;
    const cached = await redisManager.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        console.error('Failed to parse cached dashboard data:', error);
        await redisManager.del(cacheKey);
      }
    }

    return null;
  }

  /**
   * Invalidate all cached data for a user
   */
  static async invalidateUser(userId: string): Promise<void> {
    const keysToDelete = [
      this.CACHE_PREFIX + `user:${userId}`,
      this.CACHE_PREFIX + `profile:${userId}`,
      this.CACHE_PREFIX + `dashboard:${userId}`,
    ];

    await Promise.all(keysToDelete.map((key) => redisManager.del(key)));
  }

  /**
   * Health check for database cache
   */
  static async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
    try {
      const testKey = this.CACHE_PREFIX + 'health-check';
      const testData = { test: true, timestamp: Date.now() };

      await redisManager.set(testKey, JSON.stringify(testData), 10);
      const retrieved = await redisManager.get(testKey);
      await redisManager.del(testKey);

      if (retrieved && JSON.parse(retrieved).test === true) {
        return { status: 'healthy', message: 'Database cache is working properly' };
      } else {
        return { status: 'unhealthy', message: 'Database cache test failed' };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database cache error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * Temporary data storage for multi-step processes
 */
export class TempDataCache {
  private static readonly CACHE_PREFIX = 'temp:';

  /**
   * Store setup progress for expert onboarding
   */
  static async storeSetupProgress(
    userId: string,
    step: string,
    data: Record<string, unknown>,
    ttlSeconds: number = 3600, // 1 hour
  ): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + `setup:${userId}:${step}`;
    const value = JSON.stringify({
      ...data,
      step,
      userId,
      timestamp: Date.now(),
    });
    await redisManager.set(cacheKey, value, ttlSeconds);
  }

  /**
   * Get setup progress
   */
  static async getSetupProgress(
    userId: string,
    step: string,
  ): Promise<Record<string, unknown> | null> {
    const cacheKey = this.CACHE_PREFIX + `setup:${userId}:${step}`;
    const cached = await redisManager.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        console.error('Failed to parse cached setup progress:', error);
        await redisManager.del(cacheKey);
      }
    }

    return null;
  }

  /**
   * Store OAuth state data
   */
  static async storeOAuthState(
    state: string,
    data: Record<string, unknown>,
    ttlSeconds: number = 900, // 15 minutes
  ): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + `oauth:${state}`;
    const value = JSON.stringify({
      ...data,
      state,
      timestamp: Date.now(),
    });
    await redisManager.set(cacheKey, value, ttlSeconds);
  }

  /**
   * Get and consume OAuth state (one-time use)
   */
  static async getOAuthState(state: string): Promise<Record<string, unknown> | null> {
    const cacheKey = this.CACHE_PREFIX + `oauth:${state}`;
    const cached = await redisManager.get(cacheKey);

    if (cached) {
      // Delete immediately after retrieval (one-time use)
      await redisManager.del(cacheKey);
      try {
        return JSON.parse(cached);
      } catch (error) {
        console.error('Failed to parse cached OAuth state:', error);
      }
    }

    return null;
  }

  /**
   * Store verification tokens
   */
  static async storeVerificationToken(
    token: string,
    data: Record<string, unknown>,
    ttlSeconds: number = 3600, // 1 hour
  ): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + `verification:${token}`;
    const value = JSON.stringify({
      ...data,
      token,
      timestamp: Date.now(),
    });
    await redisManager.set(cacheKey, value, ttlSeconds);
  }

  /**
   * Get and consume verification token (one-time use)
   */
  static async getVerificationToken(token: string): Promise<Record<string, unknown> | null> {
    const cacheKey = this.CACHE_PREFIX + `verification:${token}`;
    const cached = await redisManager.get(cacheKey);

    if (cached) {
      // Delete immediately after retrieval (one-time use)
      await redisManager.del(cacheKey);
      try {
        return JSON.parse(cached);
      } catch (error) {
        console.error('Failed to parse cached verification token:', error);
      }
    }

    return null;
  }
}
