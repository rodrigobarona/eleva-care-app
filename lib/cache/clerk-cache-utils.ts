import { redisManager } from '@/lib/redis';

/**
 * Clerk Cache Utilities
 * Helper functions for managing Clerk user cache
 *
 * IMPORTANT: Uses environment-specific cache keys to prevent dev/prod collision
 */

const CLERK_CACHE_PREFIX = `clerk:${process.env.NODE_ENV || 'development'}:`;

/**
 * Invalidate cached user data by user ID
 * Use this when user data is updated in Clerk
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  const cacheKey = `${CLERK_CACHE_PREFIX}id:${userId}`;
  await redisManager.del(cacheKey);
}

/**
 * Invalidate cached user data by username
 * Use this when username is updated in Clerk
 */
export async function invalidateUserCacheByUsername(username: string): Promise<void> {
  const cacheKey = `${CLERK_CACHE_PREFIX}username:${username}`;
  await redisManager.del(cacheKey);
}

/**
 * Invalidate all cached user data for a specific user
 * Use this when user data is significantly updated
 */
export async function invalidateAllUserCache(userId: string, username?: string): Promise<void> {
  const promises = [invalidateUserCache(userId)];

  if (username) {
    promises.push(invalidateUserCacheByUsername(username));
  }

  await Promise.all(promises);
}

/**
 * Warm up cache for a specific user
 * Useful for pre-caching user data before it's needed
 */
export async function warmUpUserCache(userId: string): Promise<void> {
  const { getCachedUserById } = await import('./clerk-cache');
  await getCachedUserById(userId);
}

/**
 * Warm up cache for multiple users
 * Useful for pre-caching user data for a list of users
 */
export async function warmUpUsersCache(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;

  const { getCachedUsersByIds } = await import('./clerk-cache');
  await getCachedUsersByIds(userIds);
}

/**
 * Get cache statistics for Clerk user cache
 */
export async function getClerkCacheStats(): Promise<{
  isRedisAvailable: boolean;
  cacheType: 'Redis' | 'In-Memory';
}> {
  const stats = redisManager.getCacheStats();
  return {
    isRedisAvailable: stats.isRedisAvailable,
    cacheType: stats.cacheType as 'Redis' | 'In-Memory',
  };
}
