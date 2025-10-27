import { createClerkClient } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/server';
import { unstable_cache } from 'next/cache';

/**
 * Cached Clerk user lookup by username
 * This significantly improves performance by caching Clerk API calls
 * Cache is revalidated every 5 minutes
 */
export const getCachedUserByUsername = unstable_cache(
  async (username: string): Promise<User | null> => {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const users = await clerk.users.getUserList({
      username: [username],
      limit: 1,
    });

    return users.data[0] || null;
  },
  ['clerk-user-by-username'],
  {
    revalidate: 300, // Cache for 5 minutes
    tags: ['clerk-user'],
  },
);

/**
 * Cached Clerk user lookup by user ID
 * Cache is revalidated every 5 minutes
 */
export const getCachedUserById = unstable_cache(
  async (userId: string): Promise<User | null> => {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    try {
      const user = await clerk.users.getUser(userId);
      return user;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  },
  ['clerk-user-by-id'],
  {
    revalidate: 300, // Cache for 5 minutes
    tags: ['clerk-user'],
  },
);

/**
 * Cached Clerk users list lookup by user IDs
 * Cache is revalidated every 5 minutes
 */
export const getCachedUsersByIds = unstable_cache(
  async (userIds: string[]): Promise<User[]> => {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const users = await clerk.users.getUserList({
      userId: userIds,
      limit: userIds.length,
    });

    return users.data;
  },
  ['clerk-users-by-ids'],
  {
    revalidate: 300, // Cache for 5 minutes
    tags: ['clerk-users'],
  },
);
