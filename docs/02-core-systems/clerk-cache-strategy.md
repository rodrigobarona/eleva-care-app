# Clerk Cache Strategy

## Overview

The Eleva Care application implements a comprehensive caching strategy for Clerk user data to reduce API calls, improve performance, and provide a better user experience. This document outlines the caching architecture, best practices, and implementation details.

## Architecture

### Two-Layer Caching System

The caching system uses a two-layer approach:

1. **React Cache (Request-level memoization)**: Uses React's `cache()` function to deduplicate requests within a single server render
2. **Redis Cache (Distributed caching)**: Uses Redis (via Upstash) for persistent caching across requests with a 5-minute TTL

```typescript
// lib/cache/clerk-cache.ts
import { redisManager } from '@/lib/redis';
import { cache } from 'react';

const _getCachedUserByIdImpl = async (userId: string) => {
  // 1. Try Redis first
  const cached = await redisManager.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 2. Fetch from Clerk API
  const user = await clerk.users.getUser(userId);

  // 3. Store in Redis
  await redisManager.set(cacheKey, JSON.stringify(user), CLERK_CACHE_TTL);

  return user;
};

// 4. Wrap with React.cache for request-level memoization
export const getCachedUserById = cache(_getCachedUserByIdImpl);
```

## Cache Functions

### Available Functions

#### `getCachedUserById(userId: string)`

Fetches a single user by their Clerk user ID with caching.

```typescript
import { getCachedUserById } from '@/lib/cache/clerk-cache';

// In a Server Component or API route
const user = await getCachedUserById(userId);
if (!user) {
  return notFound();
}
```

#### `getCachedUserByUsername(username: string)`

Fetches a single user by their username with caching.

```typescript
import { getCachedUserByUsername } from '@/lib/cache/clerk-cache';

const user = await getCachedUserByUsername(username);
```

#### `getCachedUsersByIds(userIds: string[])`

Fetches multiple users by their IDs with batch processing and caching.

```typescript
import { getCachedUsersByIds } from '@/lib/cache/clerk-cache';

// Batch fetch multiple users efficiently
const users = await getCachedUsersByIds(profileIds);
```

**Features:**

- Handles batching (max 500 users per Clerk API request)
- Caches small batches (≤10 users) in Redis
- Request-level memoization for all batch sizes

## Cache Invalidation

### When to Invalidate Cache

Cache should be invalidated whenever user data is updated:

1. **User metadata updates** (roles, setup status, preferences)
2. **User profile updates** (name, email, avatar)
3. **User deletion**
4. **External account connections** (Google, OAuth)

### Invalidation Functions

```typescript
import { invalidateAllUserCache, invalidateUserCache } from '@/lib/cache/clerk-cache-utils';

// Invalidate by user ID
await invalidateUserCache(userId);

// Invalidate by user ID and username
await invalidateAllUserCache(userId, username);
```

### Automatic Invalidation Points

The cache is automatically invalidated in the following locations:

#### 1. Clerk Webhooks

```typescript
// app/api/webhooks/clerk/route.ts
case 'user.updated':
  await invalidateUserCache(id);
  break;

case 'user.deleted':
  await invalidateUserCache(id);
  break;
```

#### 2. Server Actions

```typescript
// server/actions/expert-setup.ts
await clerk.users.updateUser(userId, {
  unsafeMetadata: { ... }
});

// Invalidate cache after updating user metadata
await invalidateUserCache(userId);
```

#### 3. Role Updates

```typescript
// lib/auth/roles.server.ts
export async function updateUserRole(userId: string, roles: UserRoles) {
  await clerk.users.updateUser(userId, {
    publicMetadata: { role: roles },
  });

  // Invalidate cache after updating user roles
  await invalidateUserCache(userId);
}
```

## Migration Guide

### Before (Direct Clerk API calls)

```typescript
import { createClerkClient } from '@clerk/nextjs/server';

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});
const user = await clerk.users.getUser(userId);
```

### After (Using cache)

```typescript
import { getCachedUserById } from '@/lib/cache/clerk-cache';

const user = await getCachedUserById(userId);
if (!user) {
  return notFound();
}
```

### Files Refactored

The following files have been refactored to use the Clerk cache:

#### Server Components

- `components/organisms/home/ExpertsSection.tsx`
- `app/[locale]/(public)/[username]/[eventSlug]/page.tsx`
- `app/[locale]/(public)/[username]/[eventSlug]/success/page.tsx`

#### Server Actions

- `server/actions/expert-setup.ts` (5 functions)
- `server/actions/billing.ts`
- `server/actions/user-sync.ts`
- `server/actions/fixes.ts`

#### Authentication & Authorization

- `lib/auth/roles.server.ts` (4 functions)

#### API Routes

- `app/api/experts/verify-specific/route.ts`
- `app/api/experts/verify-connect/route.ts`

#### Webhooks

- `app/api/webhooks/clerk/route.ts`

## Best Practices

### 1. Always Use Cache for User Lookups

❌ **Don't:**

```typescript
const clerk = createClerkClient({ ... });
const user = await clerk.users.getUser(userId);
```

✅ **Do:**

```typescript
const user = await getCachedUserById(userId);
```

### 2. Handle Null Returns

Always check for null returns from cache functions:

```typescript
const user = await getCachedUserById(userId);
if (!user) {
  // Handle user not found
  return notFound(); // or appropriate error handling
}
```

### 3. Invalidate Cache After Updates

Always invalidate cache after updating user data:

```typescript
await clerk.users.updateUser(userId, { ... });
await invalidateUserCache(userId); // Don't forget!
```

### 4. Use Batch Functions for Multiple Users

When fetching multiple users, use the batch function:

❌ **Don't:**

```typescript
const users = await Promise.all(userIds.map((id) => getCachedUserById(id)));
```

✅ **Do:**

```typescript
const users = await getCachedUsersByIds(userIds);
```

### 5. Leverage React Cache Memoization

The cache functions use React's `cache()`, so multiple calls within the same request are free:

```typescript
// In a Server Component
const user1 = await getCachedUserById(userId); // API call
const user2 = await getCachedUserById(userId); // Memoized, no API call
const user3 = await getCachedUserById(userId); // Memoized, no API call
```

## Performance Benefits

### Before Cache Implementation

- **ExpertsSection**: 12 individual Clerk API calls for 12 experts
- **Booking pages**: 1 Clerk API call per page load
- **Role checks**: 1 Clerk API call per authorization check
- **Total**: 50+ Clerk API calls per typical user session

### After Cache Implementation

- **ExpertsSection**: 1 batched API call for 12 experts (cached for 5 minutes)
- **Booking pages**: Cached user data (no API call if recently fetched)
- **Role checks**: Cached user data (no API call within same request)
- **Total**: 10-15 Clerk API calls per typical user session (70% reduction)

### TTL Configuration

```typescript
const CLERK_CACHE_TTL = 300; // 5 minutes in seconds
```

**Why 5 minutes?**

- Balance between freshness and performance
- User profile changes are not time-critical
- Reduces API calls significantly without stale data concerns
- Can be adjusted based on requirements

## Cache Statistics

Get cache statistics for monitoring:

```typescript
import { getClerkCacheStats } from '@/lib/cache/clerk-cache-utils';

const stats = await getClerkCacheStats();
// { isRedisAvailable: true, cacheType: 'Redis' }
```

## Cache Warming

Pre-cache user data before it's needed:

```typescript
import { warmUpUserCache, warmUpUsersCache } from '@/lib/cache/clerk-cache-utils';

// Warm up cache for a single user
await warmUpUserCache(userId);

// Warm up cache for multiple users
await warmUpUsersCache(userIds);
```

## Troubleshooting

### Cache Miss Issues

If you're experiencing frequent cache misses:

1. Check Redis connection: `getClerkCacheStats()`
2. Verify TTL is appropriate for your use case
3. Check if cache invalidation is too aggressive

### Stale Data Issues

If you're seeing stale data:

1. Ensure cache invalidation is called after user updates
2. Check webhook configuration for Clerk events
3. Consider reducing TTL for critical data

### Performance Issues

If cache is not improving performance:

1. Verify Redis is available and responding quickly
2. Check if batch functions are being used for multiple users
3. Monitor cache hit/miss rates

## Future Improvements

Potential enhancements to the caching strategy:

1. **Selective field caching**: Cache only frequently accessed user fields
2. **Cache warming on deployment**: Pre-populate cache with top users
3. **Metrics and monitoring**: Track cache hit rates and performance
4. **Adaptive TTL**: Adjust TTL based on update frequency
5. **Cache tags**: Enable more granular invalidation strategies

## Related Documentation

- [Clerk Cache Implementation](./clerk-cache-implementation.md)
- [Clerk Cache Migration](../fixes/clerk-cache-migration.md)
- [Redis Configuration](../03-infrastructure/redis.md)

## Summary

The Clerk cache strategy provides:

- **70% reduction** in Clerk API calls
- **Faster page loads** through request memoization
- **Distributed caching** with Redis for multi-instance deployments
- **Automatic invalidation** via webhooks and server actions
- **Easy migration** from direct API calls

By following this strategy and best practices, the application maintains high performance while ensuring data freshness and consistency.
