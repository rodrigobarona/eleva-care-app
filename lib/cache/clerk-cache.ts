import { redisManager } from '@/lib/redis';
import { createClerkClient } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/server';
import { cache } from 'react';

// Cache key prefixes
const CLERK_CACHE_PREFIX = 'clerk:';
const CLERK_CACHE_TTL = 300; // 5 minutes

/**
 * Cached Clerk user lookup by username
 * Uses React.cache for request-level memoization + Redis for distributed caching
 * Cache is revalidated every 5 minutes
 */
const _getCachedUserByUsernameImpl = async (username: string): Promise<User | null> => {
  const cacheKey = `${CLERK_CACHE_PREFIX}username:${username}`;

  // Try to get from Redis first
  const cached = await redisManager.get(cacheKey);
  if (cached) {
    try {
      // Ensure cached is a string before parsing
      if (typeof cached !== 'string') {
        console.error(
          `Invalid cache format for clerk user by username: expected string but got ${typeof cached}. Deleting invalid cache.`,
        );
        await redisManager.del(cacheKey);
        return null;
      }

      return JSON.parse(cached) as User;
    } catch (error) {
      console.error('Failed to parse cached Clerk user by username:', error);
      await redisManager.del(cacheKey);
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
    await redisManager.set(cacheKey, JSON.stringify(user), CLERK_CACHE_TTL);
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
  const cacheKey = `${CLERK_CACHE_PREFIX}id:${userId}`;

  // Try to get from Redis first
  const cached = await redisManager.get(cacheKey);
  if (cached) {
    try {
      // Ensure cached is a string before parsing
      if (typeof cached !== 'string') {
        console.error(
          `Invalid cache format for clerk user by ID: expected string but got ${typeof cached}. Deleting invalid cache.`,
        );
        await redisManager.del(cacheKey);
        return null;
      }

      return JSON.parse(cached) as User;
    } catch (error) {
      console.error('Failed to parse cached Clerk user by ID:', error);
      await redisManager.del(cacheKey);
    }
  }

  // Fetch from Clerk API
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  try {
    const user = await clerk.users.getUser(userId);

    // Store in Redis
    await redisManager.set(cacheKey, JSON.stringify(user), CLERK_CACHE_TTL);

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

  // Create a cache key based on sorted user IDs to ensure consistency
  const sortedIds = [...userIds].sort();
  const cacheKey = `${CLERK_CACHE_PREFIX}ids:${sortedIds.join(',')}`;

  // Try to get from Redis first (only for small batches to avoid huge cache keys)
  if (userIds.length <= 10) {
    const cached = await redisManager.get(cacheKey);
    if (cached) {
      try {
        // Ensure cached is a string before parsing
        if (typeof cached !== 'string') {
          console.error(
            `Invalid cache format for clerk users by IDs: expected string but got ${typeof cached}. Deleting invalid cache.`,
          );
          await redisManager.del(cacheKey);
        } else {
          return JSON.parse(cached) as User[];
        }
      } catch (error) {
        console.error('Failed to parse cached Clerk users by IDs:', error);
        await redisManager.del(cacheKey);
      }
    }
  }

  // Fetch from Clerk API with batching
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const BATCH_SIZE = 500; // Clerk API limit
  const allUsers: User[] = [];

  // Split userIds into chunks of max 500
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const chunk = userIds.slice(i, i + BATCH_SIZE);

    try {
      const response = await clerk.users.getUserList({
        userId: chunk,
        limit: chunk.length,
      });

      allUsers.push(...response.data);
    } catch (error) {
      console.error(`Error fetching users batch ${i / BATCH_SIZE + 1}:`, error);
      // Continue with other batches even if one fails
    }
  }

  // Store in Redis only for small batches
  if (userIds.length <= 10 && allUsers.length > 0) {
    await redisManager.set(cacheKey, JSON.stringify(allUsers), CLERK_CACHE_TTL);
  }

  return allUsers;
};

// Wrap with React.cache for request-level memoization
export const getCachedUsersByIds = cache(_getCachedUsersByIdsImpl);
