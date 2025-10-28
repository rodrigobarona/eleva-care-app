# Clerk Cache Implementation

## Overview

The Clerk cache implementation provides a robust, production-ready caching layer for Clerk user data using a hybrid approach:

- **React.cache** for request-level memoization (prevents duplicate calls within the same render)
- **Upstash Redis** for distributed caching (persists across requests and serverless functions)

## Architecture

### Why This Approach?

1. **Stability**: Replaces `unstable_cache` with stable APIs (`React.cache` + Redis)
2. **Performance**: Two-tier caching reduces Clerk API calls significantly
3. **Scalability**: Redis-backed distributed cache works across serverless functions
4. **Batching**: Handles Clerk API's 500-user limit automatically

### Cache Flow

```
Request → React.cache (in-memory) → Redis → Clerk API
                ↓                      ↓         ↓
            Cache HIT              Cache HIT   Cache MISS
                ↓                      ↓         ↓
            Return data           Return data  Fetch & Cache
```

## API Reference

### Core Functions

#### `getCachedUserByUsername(username: string): Promise<User | null>`

Fetches a Clerk user by username with caching.

```typescript
import { getCachedUserByUsername } from '@/lib/cache/clerk-cache';

const user = await getCachedUserByUsername('johndoe');
```

**Cache Strategy:**

- TTL: 5 minutes (300 seconds)
- Cache Key: `clerk:username:{username}`
- Request-level memoization via `React.cache`

---

#### `getCachedUserById(userId: string): Promise<User | null>`

Fetches a Clerk user by ID with caching.

```typescript
import { getCachedUserById } from '@/lib/cache/clerk-cache';

const user = await getCachedUserById('user_123');
```

**Cache Strategy:**

- TTL: 5 minutes (300 seconds)
- Cache Key: `clerk:id:{userId}`
- Request-level memoization via `React.cache`

---

#### `getCachedUsersByIds(userIds: string[]): Promise<User[]>`

Fetches multiple Clerk users by IDs with caching and automatic batching.

```typescript
import { getCachedUsersByIds } from '@/lib/cache/clerk-cache';

const users = await getCachedUsersByIds(['user_1', 'user_2', 'user_3']);
```

**Features:**

- Automatic batching for Clerk API's 500-user limit
- Handles empty input gracefully
- Continues processing if one batch fails
- Caches only small batches (≤10 users) to avoid huge cache keys

**Cache Strategy:**

- TTL: 5 minutes (300 seconds)
- Cache Key: `clerk:ids:{sorted_user_ids}` (only for ≤10 users)
- Request-level memoization via `React.cache`

**Batching Logic:**

```typescript
// Example: 750 users → 2 batches (500 + 250)
const userIds = Array.from({ length: 750 }, (_, i) => `user_${i}`);
const users = await getCachedUsersByIds(userIds);
// Makes 2 API calls automatically
```

## Cache Utilities

### Invalidation Functions

Located in `lib/cache/clerk-cache-utils.ts`:

#### `invalidateUserCache(userId: string): Promise<void>`

Invalidates cached user data by user ID.

```typescript
import { invalidateUserCache } from '@/lib/cache/clerk-cache-utils';

await invalidateUserCache('user_123');
```

---

#### `invalidateUserCacheByUsername(username: string): Promise<void>`

Invalidates cached user data by username.

```typescript
import { invalidateUserCacheByUsername } from '@/lib/cache/clerk-cache-utils';

await invalidateUserCacheByUsername('johndoe');
```

---

#### `invalidateAllUserCache(userId: string, username?: string): Promise<void>`

Invalidates all cached data for a specific user.

```typescript
import { invalidateAllUserCache } from '@/lib/cache/clerk-cache-utils';

await invalidateAllUserCache('user_123', 'johndoe');
```

---

### Warm-up Functions

#### `warmUpUserCache(userId: string): Promise<void>`

Pre-caches user data before it's needed.

```typescript
import { warmUpUserCache } from '@/lib/cache/clerk-cache-utils';

// Pre-cache user data for better performance
await warmUpUserCache('user_123');
```

---

#### `warmUpUsersCache(userIds: string[]): Promise<void>`

Pre-caches multiple users' data.

```typescript
import { warmUpUsersCache } from '@/lib/cache/clerk-cache-utils';

// Pre-cache multiple users for a page
const userIds = ['user_1', 'user_2', 'user_3'];
await warmUpUsersCache(userIds);
```

---

#### `getClerkCacheStats(): Promise<CacheStats>`

Returns cache statistics.

```typescript
import { getClerkCacheStats } from '@/lib/cache/clerk-cache-utils';

const stats = await getClerkCacheStats();
console.log(stats);
// { isRedisAvailable: true, cacheType: 'Redis' }
```

## Usage Examples

### Example 1: Profile Page

```typescript
import { getCachedUserByUsername } from '@/lib/cache/clerk-cache';

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const user = await getCachedUserByUsername(params.username);

  if (!user) {
    notFound();
  }

  return <ProfileView user={user} />;
}
```

### Example 2: Expert List with Batching

```typescript
import { getCachedUsersByIds } from '@/lib/cache/clerk-cache';
import { db } from '@/drizzle/db';

export default async function ExpertsPage() {
  // Get profiles from database
  const profiles = await db.query.ProfileTable.findMany({
    where: ({ published }) => eq(published, true),
    limit: 12,
  });

  // Batch fetch all users (automatically handles batching)
  const users = await getCachedUsersByIds(profiles.map((p) => p.clerkUserId));

  return <ExpertsList users={users} profiles={profiles} />;
}
```

### Example 3: Cache Invalidation on Webhook

```typescript
import { invalidateAllUserCache } from '@/lib/cache/clerk-cache-utils';

export async function POST(req: Request) {
  const event = await req.json();

  if (event.type === 'user.updated') {
    const { id, username } = event.data;

    // Invalidate cache when user data changes
    await invalidateAllUserCache(id, username);
  }

  return new Response('OK', { status: 200 });
}
```

### Example 4: Pre-warming Cache

```typescript
import { warmUpUsersCache } from '@/lib/cache/clerk-cache-utils';

export async function generateStaticParams() {
  // Get all expert profiles
  const profiles = await db.query.ProfileTable.findMany();

  // Pre-warm cache for all experts
  await warmUpUsersCache(profiles.map((p) => p.clerkUserId));

  return profiles.map((profile) => ({
    username: profile.username,
  }));
}
```

## Configuration

### Cache TTL

Default TTL is 5 minutes (300 seconds). To modify:

```typescript
// lib/cache/clerk-cache.ts
const CLERK_CACHE_TTL = 300; // Change this value
```

### Batch Size

Default batch size is 500 (Clerk API limit). This is configured automatically:

```typescript
// lib/cache/clerk-cache.ts
const BATCH_SIZE = 500; // Clerk API limit
```

### Small Batch Threshold

Only batches with ≤10 users are cached to avoid huge cache keys:

```typescript
// lib/cache/clerk-cache.ts
if (userIds.length <= 10) {
  // Cache this batch
}
```

## Performance Considerations

### Request-Level Memoization

`React.cache` ensures that within a single request:

```typescript
// These three calls result in only ONE Clerk API call
const user1 = await getCachedUserById('user_123');
const user2 = await getCachedUserById('user_123');
const user3 = await getCachedUserById('user_123');
```

### Distributed Caching

Redis ensures that across multiple serverless functions:

```typescript
// First request (cold start)
const user1 = await getCachedUserById('user_123'); // Clerk API call

// Second request (different function instance)
const user2 = await getCachedUserById('user_123'); // Redis HIT (no API call)
```

### Batching Efficiency

```typescript
// Instead of 750 individual API calls:
const users = await Promise.all(
  userIds.map(id => getCachedUserById(id))
); // ❌ Inefficient

// Use batching:
const users = await getCachedUsersByIds(userIds); // ✅ Only 2 API calls (500 + 250)
```

## Error Handling

### Corrupted Cache Data

The implementation automatically handles corrupted cache data:

```typescript
try {
  return JSON.parse(cached) as User;
} catch (error) {
  console.error('Failed to parse cached Clerk user:', error);
  await redisManager.del(cacheKey); // Clean up
  // Falls through to fetch from API
}
```

### API Failures

Graceful error handling for API failures:

```typescript
try {
  const user = await clerk.users.getUser(userId);
  return user;
} catch (error) {
  console.error('Error fetching user by ID:', error);
  return null; // Returns null instead of throwing
}
```

### Batch Failures

Continues processing even if one batch fails:

```typescript
for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
  try {
    const response = await clerk.users.getUserList({ ... });
    allUsers.push(...response.data);
  } catch (error) {
    console.error(`Error fetching users batch ${i / BATCH_SIZE + 1}:`, error);
    // Continue with other batches
  }
}
```

## Testing

Comprehensive test suite located at `tests/lib/clerk-cache.test.ts`:

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

## Migration from `unstable_cache`

### Before (Unstable)

```typescript
import { unstable_cache } from 'next/cache';

export const getCachedUser = unstable_cache(
  async (userId: string) => {
    const clerk = createClerkClient({ ... });
    return await clerk.users.getUser(userId);
  },
  ['clerk-user'],
  { revalidate: 300, tags: ['clerk-user'] }
);
```

### After (Stable)

```typescript
import { cache } from 'react';
import { redisManager } from '@/lib/redis';

const _getCachedUserImpl = async (userId: string) => {
  const cacheKey = `clerk:id:${userId}`;
  const cached = await redisManager.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const clerk = createClerkClient({ ... });
  const user = await clerk.users.getUser(userId);
  await redisManager.set(cacheKey, JSON.stringify(user), 300);
  return user;
};

export const getCachedUser = cache(_getCachedUserImpl);
```

## Monitoring

### Cache Hit Rate

Monitor cache effectiveness:

```typescript
import { getClerkCacheStats } from '@/lib/cache/clerk-cache-utils';

const stats = await getClerkCacheStats();
console.log(`Cache Type: ${stats.cacheType}`);
console.log(`Redis Available: ${stats.isRedisAvailable}`);
```

### Redis Health Check

```typescript
import { redisManager } from '@/lib/redis';

const health = await redisManager.healthCheck();
console.log(`Status: ${health.status}`);
console.log(`Response Time: ${health.responseTime}ms`);
console.log(`Mode: ${health.mode}`);
```

## Best Practices

1. **Use batching for multiple users**: Always prefer `getCachedUsersByIds` over multiple `getCachedUserById` calls
2. **Invalidate on updates**: Use cache invalidation utilities when user data changes
3. **Pre-warm for static pages**: Use warm-up functions in `generateStaticParams`
4. **Monitor cache health**: Regularly check Redis health and cache hit rates
5. **Handle errors gracefully**: Always check for `null` returns from cache functions

## Troubleshooting

### Cache Not Working

1. Check Redis connection:

   ```typescript
   const health = await redisManager.healthCheck();
   console.log(health);
   ```

2. Verify environment variables:

   ```bash
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   ```

3. Check cache statistics:
   ```typescript
   const stats = await getClerkCacheStats();
   console.log(stats);
   ```

### High Clerk API Usage

1. Verify cache TTL is appropriate (default: 5 minutes)
2. Check if cache invalidation is too aggressive
3. Monitor batch sizes and ensure batching is used for large lists
4. Review logs for cache errors or Redis connection issues

## Related Documentation

- [Upstash Redis Integration](../03-infrastructure/upstash-redis.md)
- [Clerk Integration](../09-integrations/clerk.md)
- [Performance Optimization](../performance/optimization-guide.md)
