# Redis Rate Limit Filter Error Fix

## Issue Description

Users were experiencing `TypeError: l.filter is not a function` errors in the payment creation process, specifically in the rate limiting system. This error occurred when the Redis cache contained corrupted or malformed data that wasn't in the expected array format.

## Root Cause

The rate limiting cache system expected cached data to be JSON arrays of timestamps (`number[]`), but due to various reasons (Redis errors, data corruption, manual interventions, etc.), some cache entries contained:

- Non-array data types (strings, objects, null)
- Arrays with non-numeric values
- Malformed JSON that couldn't be parsed

When the code tried to call `.filter()` on these invalid data structures, it resulted in the "filter is not a function" error.

## Error Log Example

```
Rate limit check failed: TypeError: l.filter is not a function
    at Object.checkRateLimit (.next/server/chunks/9825.js:1:5355)
    at async v (.next/server/app/api/create-payment-intent/route.js:1:4487)
```

## Solution Implemented

### 1. Enhanced Data Validation

Added robust data validation in the rate limiting functions:

- **Before**: Assumed `JSON.parse(cached)` always returned an array
- **After**: Validates data type and structure before using array methods

```typescript
// Before (vulnerable)
let attempts: number[] = cached ? JSON.parse(cached) : [];

// After (robust)
let attempts: number[] = [];

if (cached) {
  try {
    const parsed = JSON.parse(cached);
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'number')) {
      attempts = parsed;
    } else {
      console.warn(`Invalid rate limit cache data for key ${cacheKey}, resetting:`, parsed);
      await redisManager.del(cacheKey);
      attempts = [];
    }
  } catch (parseError) {
    console.error(`Failed to parse rate limit cache data for key ${cacheKey}:`, parseError);
    await redisManager.del(cacheKey);
    attempts = [];
  }
}
```

### 2. Self-Healing Cache

The system now:

- Detects corrupted cache entries automatically
- Logs warnings about invalid data
- Removes corrupted entries from Redis
- Continues operation with empty arrays (fail-safe)

### 3. Affected Functions

Fixed in the following functions in `lib/redis.ts`:

- `RateLimitCache.checkRateLimit()`
- `RateLimitCache.recordAttempt()`
- `RateLimitCache.getRateLimitStatus()` (calls checkRateLimit internally)
- `NotificationQueueCache.queueNotification()`
- `NotificationQueueCache.getPendingNotifications()`
- `NotificationQueueCache.removeProcessedNotifications()`

## Cleanup Script

Created `scripts/cleanup-corrupted-redis-cache.ts` to identify and clean existing corrupted entries:

### Usage

```bash
# Run the cleanup script
npm run tsx scripts/cleanup-corrupted-redis-cache.ts

# Or with environment variables
UPSTASH_REDIS_REST_URL=your_url UPSTASH_REDIS_REST_TOKEN=your_token npm run tsx scripts/cleanup-corrupted-redis-cache.ts
```

### What it does

- Scans all `rate_limit:*` keys in Redis
- Scans all `notification_queue:*` keys in Redis
- Validates data format and content
- Removes corrupted entries
- Provides detailed cleanup report

## Prevention Measures

### 1. Defensive Programming

All Redis cache operations now include:

- JSON parse error handling
- Data type validation
- Graceful fallbacks
- Automatic cleanup of invalid data

### 2. Monitoring

Enhanced logging to detect cache corruption:

- Warnings for invalid data types
- Errors for JSON parse failures
- Tracking of cleanup operations

### 3. Testing

Consider adding tests for:

- Corrupted cache data scenarios
- JSON parse error handling
- Rate limiting with invalid data

## Impact

### Before Fix

- Payment creation failures due to rate limit errors
- System instability when cache was corrupted
- Manual intervention required to clear cache

### After Fix

- Self-healing cache system
- Graceful handling of corrupted data
- Improved system reliability
- Automatic cleanup of invalid entries

## Deployment Notes

1. **Backward Compatibility**: ✅ The fix is backward compatible and doesn't break existing functionality

2. **Performance Impact**: ⚠️ Minimal - adds data validation overhead but improves reliability

3. **Rollout Strategy**:
   - Deploy the code fix first
   - Run the cleanup script to clear existing corrupted data
   - Monitor logs for any remaining issues

## Monitoring

After deployment, monitor for:

- Reduction in "filter is not a function" errors
- Cache cleanup warnings in logs
- Rate limiting system performance
- Payment creation success rates

## Related Files

- `lib/redis.ts` - Main implementation
- `app/api/create-payment-intent/route.ts` - Where errors were occurring
- `scripts/cleanup-corrupted-redis-cache.ts` - Cleanup utility
- `docs/fixes/redis-rate-limit-filter-error-fix.md` - This documentation

## Future Improvements

1. **Schema Validation**: Consider adding more strict schema validation for cache data
2. **Cache Versioning**: Implement cache versioning to handle data structure changes
3. **Health Checks**: Add Redis cache health checks to monitoring
4. **Automatic Cleanup**: Schedule periodic cleanup of stale/corrupted cache entries
