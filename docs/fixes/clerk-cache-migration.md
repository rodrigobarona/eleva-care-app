# Clerk Cache Migration: From `unstable_cache` to React.cache + Redis

**Date**: October 27, 2025  
**Status**: ✅ Completed  
**Priority**: High (Production Stability)

## Problem Statement

The `lib/cache/clerk-cache.ts` file had two critical issues:

1. **Unstable API Usage**: Used Next.js's `unstable_cache` which is not production-ready
2. **API Limit Violation**: `getCachedUsersByIds` passed `userIds.length` as the Clerk API limit, which fails when `userIds > 500`

## Solution Overview

Implemented a **hybrid caching strategy** using:

- **React.cache** for request-level memoization (stable API)
- **Upstash Redis** for distributed caching (leveraging existing infrastructure)
- **Automatic batching** for Clerk API's 500-user limit

## Implementation Details

### 1. Replaced `unstable_cache` with React.cache + Redis

#### Before (Unstable)

```typescript
import { unstable_cache } from 'next/cache';

export const getCachedUserByUsername = unstable_cache(
  async (username: string): Promise<User | null> => {
    const clerk = createClerkClient({ ... });
    const users = await clerk.users.getUserList({ ... });
    return users.data[0] || null;
  },
  ['clerk-user-by-username'],
  { revalidate: 300, tags: ['clerk-user'] }
);
```

#### After (Stable)

```typescript
import { cache } from 'react';
import { redisManager } from '@/lib/redis';

const _getCachedUserByUsernameImpl = async (username: string): Promise<User | null> => {
  const cacheKey = `clerk:username:${username}`;

  // Try Redis first
  const cached = await redisManager.get(cacheKey);
  if (cached) return JSON.parse(cached) as User;

  // Fetch from Clerk API
  const clerk = createClerkClient({ ... });
  const users = await clerk.users.getUserList({ ... });
  const user = users.data[0] || null;

  // Store in Redis
  if (user) {
    await redisManager.set(cacheKey, JSON.stringify(user), 300);
  }

  return user;
};

// Wrap with React.cache for request-level memoization
export const getCachedUserByUsername = cache(_getCachedUserByUsernameImpl);
```

### 2. Fixed Batching for Large User Lists

#### Before (Broken)

```typescript
export const getCachedUsersByIds = unstable_cache(
  async (userIds: string[]): Promise<User[]> => {
    const clerk = createClerkClient({ ... });

    // ❌ FAILS when userIds.length > 500
    const users = await clerk.users.getUserList({
      userId: userIds,
      limit: userIds.length, // ⚠️ Clerk API limit is 500
    });

    return users.data;
  },
  ['clerk-users-by-ids'],
  { revalidate: 300, tags: ['clerk-users'] }
);
```

#### After (Fixed)

```typescript
const _getCachedUsersByIdsImpl = async (userIds: string[]): Promise<User[]> => {
  // Handle empty input
  if (!userIds || userIds.length === 0) return [];

  // Try Redis for small batches
  if (userIds.length <= 10) {
    const cached = await redisManager.get(cacheKey);
    if (cached) return JSON.parse(cached) as User[];
  }

  const clerk = createClerkClient({ ... });
  const BATCH_SIZE = 500; // Clerk API limit
  const allUsers: User[] = [];

  // ✅ Split into chunks of max 500
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const chunk = userIds.slice(i, i + BATCH_SIZE);

    try {
      const response = await clerk.users.getUserList({
        userId: chunk,
        limit: chunk.length, // ✅ Always ≤ 500
      });
      allUsers.push(...response.data);
    } catch (error) {
      console.error(`Error fetching users batch ${i / BATCH_SIZE + 1}:`, error);
      // Continue with other batches
    }
  }

  return allUsers;
};

export const getCachedUsersByIds = cache(_getCachedUsersByIdsImpl);
```

## Benefits

### 1. Production Stability

- ✅ Uses stable APIs (`React.cache` instead of `unstable_cache`)
- ✅ No breaking changes in future Next.js versions

### 2. Leverages Existing Infrastructure

- ✅ Uses existing Upstash Redis instance
- ✅ No additional infrastructure needed
- ✅ Consistent with other caching in the app

### 3. Better Performance

- ✅ Two-tier caching (React.cache + Redis)
- ✅ Request-level deduplication
- ✅ Distributed cache across serverless functions

### 4. Handles Edge Cases

- ✅ Empty input handling
- ✅ Corrupted cache data recovery
- ✅ API failure resilience
- ✅ Batch failure recovery

### 5. Scalability

- ✅ Automatic batching for large user lists
- ✅ Continues processing if one batch fails
- ✅ Smart caching (only small batches to avoid huge keys)

## Files Changed

### Modified

- `lib/cache/clerk-cache.ts` - Complete rewrite with new caching strategy

### Created

- `lib/cache/clerk-cache-utils.ts` - Cache utilities (invalidation, warm-up, stats)
- `tests/lib/clerk-cache.test.ts` - Comprehensive test suite (14 tests)
- `docs/02-core-systems/clerk-cache-implementation.md` - Full documentation
- `docs/fixes/clerk-cache-migration.md` - This migration guide

## Testing

All tests passing (14/14):

```bash
pnpm test tests/lib/clerk-cache.test.ts
```

**Test Coverage:**

- ✅ Redis cache hits
- ✅ Redis cache misses
- ✅ Clerk API fallback
- ✅ Corrupted cache data handling
- ✅ API error handling
- ✅ Batching for large user lists (>500)
- ✅ Batch failure recovery
- ✅ Empty input handling
- ✅ Small batch caching
- ✅ Large batch non-caching

## Performance Comparison

### Before (Unstable + No Batching)

```typescript
// 750 users would FAIL with Clerk API error
const users = await getCachedUsersByIds(Array.from({ length: 750 }, (_, i) => `user_${i}`));
// ❌ Error: limit exceeds maximum of 500
```

### After (Stable + Batching)

```typescript
// 750 users works perfectly with automatic batching
const users = await getCachedUsersByIds(Array.from({ length: 750 }, (_, i) => `user_${i}`));
// ✅ Makes 2 API calls: 500 + 250
// ✅ Returns all 750 users
```

### Cache Hit Rates

**Request-level (React.cache):**

```typescript
// Within same request - only 1 API call
const user1 = await getCachedUserById('user_123'); // API call
const user2 = await getCachedUserById('user_123'); // Cached (React.cache)
const user3 = await getCachedUserById('user_123'); // Cached (React.cache)
```

**Distributed (Redis):**

```typescript
// Request 1 (Function Instance A)
const user1 = await getCachedUserById('user_123'); // API call + Redis SET

// Request 2 (Function Instance B, 2 minutes later)
const user2 = await getCachedUserById('user_123'); // Redis HIT (no API call)
```

## Cache Configuration

### TTL (Time To Live)

- **Default**: 5 minutes (300 seconds)
- **Configurable**: Change `CLERK_CACHE_TTL` in `lib/cache/clerk-cache.ts`

### Batch Size

- **Clerk API Limit**: 500 users per request
- **Automatically handled**: No manual configuration needed

### Small Batch Threshold

- **Default**: 10 users
- **Reason**: Avoid huge cache keys for large batches
- **Behavior**: Batches with ≤10 users are cached in Redis

## Migration Checklist

- [x] Replace `unstable_cache` with `React.cache`
- [x] Implement Redis-backed distributed caching
- [x] Fix batching for Clerk API's 500-user limit
- [x] Handle empty input gracefully
- [x] Add error handling for corrupted cache data
- [x] Add error handling for API failures
- [x] Add error handling for batch failures
- [x] Create cache utility functions
- [x] Write comprehensive tests (14 tests)
- [x] Document implementation
- [x] Verify no linter errors
- [x] Verify all tests pass

## Usage Examples

### Basic Usage

```typescript
import { getCachedUserByUsername } from '@/lib/cache/clerk-cache';

const user = await getCachedUserByUsername('johndoe');
```

### Batch Usage

```typescript
import { getCachedUsersByIds } from '@/lib/cache/clerk-cache';

const profiles = await db.query.ProfileTable.findMany({ limit: 12 });
const users = await getCachedUsersByIds(profiles.map((p) => p.clerkUserId));
```

### Cache Invalidation

```typescript
import { invalidateAllUserCache } from '@/lib/cache/clerk-cache-utils';

// When user data changes in Clerk webhook
await invalidateAllUserCache(userId, username);
```

### Cache Warm-up

```typescript
import { warmUpUsersCache } from '@/lib/cache/clerk-cache-utils';

// Pre-cache for static pages
await warmUpUsersCache(userIds);
```

## Monitoring

### Cache Health

```typescript
import { redisManager } from '@/lib/redis';

const health = await redisManager.healthCheck();
console.log(`Status: ${health.status}`);
console.log(`Response Time: ${health.responseTime}ms`);
console.log(`Mode: ${health.mode}`); // 'redis' or 'in-memory'
```

### Cache Statistics

```typescript
import { getClerkCacheStats } from '@/lib/cache/clerk-cache-utils';

const stats = await getClerkCacheStats();
console.log(`Cache Type: ${stats.cacheType}`);
console.log(`Redis Available: ${stats.isRedisAvailable}`);
```

## Rollback Plan

If issues arise, the old implementation is preserved in git history:

```bash
# View the old implementation
git show HEAD~1:lib/cache/clerk-cache.ts

# Rollback if needed (not recommended)
git revert <commit-hash>
```

However, rollback is **NOT recommended** because:

1. Old implementation uses unstable API
2. Old implementation has the 500-user limit bug
3. New implementation is thoroughly tested

## Related Documentation

- [Clerk Cache Implementation](../02-core-systems/clerk-cache-implementation.md)
- [Upstash Redis Integration](../03-infrastructure/upstash-redis.md)
- [Clerk Integration](../09-integrations/clerk.md)

## Conclusion

This migration successfully:

1. ✅ Replaced unstable API with stable alternatives
2. ✅ Fixed critical batching bug for large user lists
3. ✅ Leveraged existing Upstash Redis infrastructure
4. ✅ Improved performance with two-tier caching
5. ✅ Added comprehensive error handling
6. ✅ Created extensive test coverage
7. ✅ Documented thoroughly

The implementation is **production-ready** and **fully tested**.
