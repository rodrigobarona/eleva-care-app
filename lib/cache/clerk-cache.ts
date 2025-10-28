import { RedisErrorBoundary } from '@/lib/cache/redis-error-boundary';
import { createClerkClient } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/server';
import { cache } from 'react';

import { ClerkCacheKeys } from './clerk-cache-keys';

// Cache constants
// IMPORTANT: Prefix is environment-specific (includes NODE_ENV)
const CLERK_CACHE_PREFIX = `clerk:${process.env.NODE_ENV || 'development'}:`;
const CLERK_CACHE_TTL = 300; // 5 minutes

/**
 * Cached Clerk user lookup by username
 * Uses React.cache for request-level memoization + Redis for distributed caching
 * Cache is revalidated every 5 minutes
 */
const _getCachedUserByUsernameImpl = async (username: string): Promise<User | null> => {
  const cacheKey = ClerkCacheKeys.username(username);

  // Try to get from Redis first
  const cached = await RedisErrorBoundary.get(cacheKey);
  if (cached) {
    try {
      // Ensure cached is a string before parsing
      if (typeof cached !== 'string') {
        console.error(
          `Invalid cache format for clerk user by username: expected string but got ${typeof cached}. Deleting invalid cache.`,
        );
        await RedisErrorBoundary.del(cacheKey);
        return null;
      }

      return JSON.parse(cached) as User;
    } catch (error) {
      console.error('Failed to parse cached Clerk user by username:', error);
      await RedisErrorBoundary.del(cacheKey);
    }
  }

  // Fetch from Clerk API
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const users = await clerk.users.getUserList({
    username: [username],
    limit: 1,
  });

  const user = users.data[0] || null;

  // Store in Redis if found
  if (user) {
    await RedisErrorBoundary.set(cacheKey, JSON.stringify(user), CLERK_CACHE_TTL);
  }

  return user;
};

// Wrap with React.cache for request-level memoization
export const getCachedUserByUsername = cache(_getCachedUserByUsernameImpl);

/**
 * Cached Clerk user lookup by user ID
 * Uses React.cache for request-level memoization + Redis for distributed caching
 * Cache is revalidated every 5 minutes
 */
const _getCachedUserByIdImpl = async (userId: string): Promise<User | null> => {
  const cacheKey = ClerkCacheKeys.userId(userId);

  // Try to get from Redis first
  const cached = await RedisErrorBoundary.get(cacheKey);
  if (cached) {
    try {
      // Ensure cached is a string before parsing
      if (typeof cached !== 'string') {
        console.error(
          `Invalid cache format for clerk user by ID: expected string but got ${typeof cached}. Deleting invalid cache.`,
        );
        await RedisErrorBoundary.del(cacheKey);
        return null;
      }

      return JSON.parse(cached) as User;
    } catch (error) {
      console.error('Failed to parse cached Clerk user by ID:', error);
      await RedisErrorBoundary.del(cacheKey);
    }
  }

  // Fetch from Clerk API
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  try {
    const user = await clerk.users.getUser(userId);

    // Store in Redis
    await RedisErrorBoundary.set(cacheKey, JSON.stringify(user), CLERK_CACHE_TTL);

    return user;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
};

// Wrap with React.cache for request-level memoization
export const getCachedUserById = cache(_getCachedUserByIdImpl);

/**
 * Cached Clerk users list lookup by user IDs
 * Uses React.cache for request-level memoization + Redis for distributed caching
 * Handles batching for Clerk API limit (max 500 users per request)
 * Cache is revalidated every 5 minutes
 */
const _getCachedUsersByIdsImpl = async (userIds: string[]): Promise<User[]> => {
  // Handle empty input
  if (!userIds || userIds.length === 0) {
    return [];
  }

  const uniqueIds = [...new Set(userIds)];
  const allUsers: User[] = [];
  const missingIds: string[] = [];

  // For small batches (≤10), try to get from combined cache first
  if (uniqueIds.length <= 10) {
    const sortedIds = [...uniqueIds].sort();
    const cacheKey = `${CLERK_CACHE_PREFIX}ids:${sortedIds.join(',')}`;
    const cached = await RedisErrorBoundary.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as User[];
      } catch (error) {
        console.error('Failed to parse cached Clerk users:', error);
        await RedisErrorBoundary.del(cacheKey);
      }
    }
  }

  // For large batches, don't try individual caching - fetch directly
  if (uniqueIds.length > 10) {
    missingIds.push(...uniqueIds);
  } else {
    // Try to get users from Redis individually for small batches
    const cachePromises = uniqueIds.map(async (userId) => {
      const cacheKey = ClerkCacheKeys.userId(userId);
      const cached = await RedisErrorBoundary.get(cacheKey);

      if (cached) {
        try {
          return JSON.parse(cached) as User;
        } catch (error) {
          console.error('Failed to parse cached Clerk user:', error);
          await RedisErrorBoundary.del(cacheKey);
        }
      }

      missingIds.push(userId);
      return null;
    });

    // Get all cached users
    const cachedUsers = await Promise.all(cachePromises);
    allUsers.push(...cachedUsers.filter((user): user is User => user !== null));
  }

  // If we have missing users, fetch them in batches
  if (missingIds.length > 0) {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const BATCH_SIZE = 500; // Clerk API limit

    // Split missingIds into chunks of max 500
    for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
      const chunk = missingIds.slice(i, i + BATCH_SIZE);

      try {
        const response = await clerk.users.getUserList({
          userId: chunk,
          limit: chunk.length,
        });

        // Cache only small batches
        if (chunk.length <= 10) {
          const sortedChunk = [...chunk].sort();
          await Promise.all([
            ...response.data.map(async (user) => {
              const cacheKey = ClerkCacheKeys.userId(user.id);
              await RedisErrorBoundary.set(cacheKey, JSON.stringify(user), CLERK_CACHE_TTL);
            }),
            RedisErrorBoundary.set(
              `${CLERK_CACHE_PREFIX}ids:${sortedChunk.join(',')}`,
              JSON.stringify(response.data),
              CLERK_CACHE_TTL,
            ),
          ]);
        }

        allUsers.push(...response.data);
      } catch (error) {
        console.error(`Error fetching users batch ${i / BATCH_SIZE + 1}:`, error);
        // Continue with other batches even if one fails
      }
    }
  }

  // Sort users to match the original order
  const userMap = new Map(allUsers.map((user) => [user.id, user]));
  return userIds.map((id) => userMap.get(id)).filter((user): user is User => user !== undefined);
};

// Wrap with React.cache for request-level memoization
export const getCachedUsersByIds = cache(_getCachedUsersByIdsImpl);
