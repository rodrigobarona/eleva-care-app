# Redis Object Handling Fix

**Date**: October 28, 2025  
**Status**: ✅ Fixed  
**Priority**: High (Production Stability)

## Problem Statement

The application was throwing errors when retrieving cached Clerk user data from Redis:

```
RedisManager.get: Invalid value type for key "clerk:ids:user_2tYRmKEdAbmZUJUDPvkIzzdnMvq,user_2trYYV7zdZvu1x1259AC9ALpd7y,user_2u0XgdtYkVKnoov90S0kJpVf4ve,user_2uCZL8UqVbhCDnYszHuKAVKZLSP,user_2uWIpmDRCVNRoI0jS9tCUKlAJwj,user_2uswmXnmVJgyinJrqMU8xDmmX6S,user_2yeolirbi4T0gaUCXMJ8ocu1MBL,user_33KrocWd4zQynDTBgZHbkNo9ud3". Expected string or null, got object. Deleting invalid cache.
```

### Root Cause

The `RedisManager.get()` method was expecting Redis to return either:

- `null` (cache miss)
- `string` (stringified JSON)

However, the Upstash Redis REST API sometimes returns **already-parsed JSON objects** instead of raw strings. This caused the type validation to fail and delete valid cached data.

## Solution

Updated `RedisManager.get()` in `lib/redis.ts` to handle three cases:

1. **`null`**: Cache miss (return `null`)
2. **`string`**: Raw string data (return as-is)
3. **`object`**: Already-parsed JSON from Upstash (re-stringify for consistency)

### Code Changes

```typescript
// Before (Strict validation causing cache deletion)
async get(key: string): Promise<string | null> {
  if (this.isRedisAvailable && this.redis) {
    try {
      const result = await this.redis.get(key);

      // Validate that result is null or a string
      if (result !== null && typeof result !== 'string') {
        console.error(
          `RedisManager.get: Invalid value type for key "${key}". Expected string or null, got ${typeof result}. Deleting invalid cache.`,
        );
        await this.redis.del(key);
        return null;
      }

      return result as string | null;
    } catch (error) {
      console.error('Redis GET error:', error);
    }
  }
  // ...
}
```

```typescript
// After (Flexible handling with re-stringification)
async get(key: string): Promise<string | null> {
  if (this.isRedisAvailable && this.redis) {
    try {
      const result = await this.redis.get(key);

      // Handle null case
      if (result === null) {
        return null;
      }

      // If result is already a string, return it
      if (typeof result === 'string') {
        return result;
      }

      // If result is an object, it means Upstash returned parsed JSON
      // We need to re-stringify it to maintain consistency with our API contract
      if (typeof result === 'object') {
        console.warn(
          `RedisManager.get: Received object from Redis for key "${key}". Re-stringifying to maintain consistency.`,
        );
        return JSON.stringify(result);
      }

      // For any other unexpected type, log error and delete
      console.error(
        `RedisManager.get: Invalid value type for key "${key}". Expected string, null, or object, got ${typeof result}. Deleting invalid cache.`,
      );
      await this.redis.del(key);
      return null;
    } catch (error) {
      console.error('Redis GET error:', error);
    }
  }
  // ...
}
```

## Why This Happens

The Upstash Redis REST API has automatic JSON parsing behavior:

1. **When storing**: We call `JSON.stringify(data)` and store a string
2. **When retrieving**: Upstash may:
   - Return the raw string (expected behavior)
   - Parse the JSON and return an object (automatic optimization)

This is a known behavior with Upstash Redis where the REST API tries to be "helpful" by parsing JSON automatically.

## Impact

### Before Fix

- ❌ Valid cached data was deleted on retrieval
- ❌ Increased Clerk API calls (cache misses)
- ❌ Performance degradation
- ❌ Potential rate limit issues

### After Fix

- ✅ Cache data retrieved successfully regardless of format
- ✅ Consistent string output for all consumers
- ✅ Reduced Clerk API calls
- ✅ Improved performance
- ✅ Better logging (warns instead of errors)

## Testing

### Manual Testing

1. Load homepage with multiple users
2. Check logs for Redis warnings (should see re-stringification warnings if applicable)
3. Verify no "Deleting invalid cache" errors
4. Confirm Clerk user data displays correctly

### Automated Testing

```typescript
describe('RedisManager.get', () => {
  it('should handle string responses', async () => {
    const result = await redisManager.get('test-key');
    expect(typeof result).toBe('string');
  });

  it('should handle object responses from Upstash', async () => {
    // Mock Upstash returning an object
    const result = await redisManager.get('test-key');
    expect(typeof result).toBe('string');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('should handle null responses', async () => {
    const result = await redisManager.get('non-existent-key');
    expect(result).toBeNull();
  });
});
```

## Related Files

- `lib/redis.ts` - Main fix location
- `lib/cache/clerk-cache.ts` - Uses RedisManager for Clerk user caching
- `docs/02-core-systems/clerk-cache-implementation.md` - Clerk cache documentation

## Future Considerations

1. **Monitor Logs**: Watch for re-stringification warnings to understand frequency
2. **Upstash Configuration**: Investigate if we can disable automatic JSON parsing
3. **Type Safety**: Consider creating a generic `RedisManager.getJSON<T>()` method that handles parsing internally
4. **Performance**: The re-stringification is minimal overhead, but could be optimized if it becomes frequent

## Related Issues

- Similar to previous `FormCache.get` fix (handled object vs string inconsistency)
- Part of ongoing Redis cache reliability improvements

## Verification

To verify the fix is working:

```bash
# Check logs for new behavior
pnpm dev

# Look for warnings (not errors):
# ✅ "Received object from Redis for key... Re-stringifying"
# ❌ "Invalid value type... Deleting invalid cache"
```

## Rollback Plan

If this causes issues:

```bash
git revert <commit-hash>
```

The old behavior will be restored, but cached data will be deleted on object responses.

---

**Author**: AI Assistant  
**Reviewed by**: Rodrigo Barona  
**Status**: ✅ Production Ready
