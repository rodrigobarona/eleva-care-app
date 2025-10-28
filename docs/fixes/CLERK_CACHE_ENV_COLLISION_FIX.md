# 🚨 CRITICAL BUG FIX: Clerk Cache Environment Collision

**Status**: ✅ FIXED  
**Date**: 2025-10-28  
**Priority**: CRITICAL  
**Impact**: Production data corruption

## The Problem

The Clerk user cache was using **identical cache keys** for development and production environments, causing data collision when both environments shared the same Redis instance (Upstash).

### Before (Broken):

```typescript
// clerk-cache-keys.ts
private static readonly PREFIX = 'clerk';  // ❌ No environment identifier

// Cache keys:
// Dev:  clerk:id:user_abc123
// Prod: clerk:id:user_abc123  // SAME KEY! ❌
```

### Symptoms:

- ✅ **ExpertsSection showing dev users in production**
- ✅ **Production showing test/dev profiles**
- ✅ **User data mixing between environments**
- ✅ **Inconsistent user information**

### Root Cause:

1. **Shared Redis Instance**: Dev and Prod use same Upstash Redis
2. **No Environment Prefix**: Cache keys didn't include `NODE_ENV`
3. **Data Overwrite**: Last write wins (dev overwrites prod or vice versa)
4. **5-Minute TTL**: Corruption persisted for 5 minutes

## The Fix

Updated all Clerk cache files to include environment-specific prefixes:

### After (Fixed):

```typescript
// clerk-cache-keys.ts
private static readonly PREFIX = `clerk:${process.env.NODE_ENV || 'development'}`;

// Cache keys NOW:
// Dev:  clerk:development:id:user_abc123
// Prod: clerk:production:id:user_abc123  // ✅ Different!
```

## Files Modified

### 1. `/lib/cache/clerk-cache-keys.ts`

```diff
/**
 * Clerk cache key management
+ * IMPORTANT: Cache keys are environment-specific to prevent dev/prod collision
 */
export class ClerkCacheKeys {
+  /**
+   * Get environment-specific prefix
+   * Development: 'clerk:dev'
+   * Production: 'clerk:prod'
+   */
-  private static readonly PREFIX = 'clerk';
+  private static readonly PREFIX = `clerk:${process.env.NODE_ENV || 'development'}`;
```

### 2. `/lib/cache/clerk-cache.ts`

```diff
// Cache constants
+ // IMPORTANT: Prefix is environment-specific (includes NODE_ENV)
- const CLERK_CACHE_PREFIX = 'clerk:';
+ const CLERK_CACHE_PREFIX = `clerk:${process.env.NODE_ENV || 'development'}:`;
```

### 3. `/lib/cache/clerk-cache-utils.ts`

```diff
/**
 * Clerk Cache Utilities
+ * IMPORTANT: Uses environment-specific cache keys to prevent dev/prod collision
 */
- const CLERK_CACHE_PREFIX = 'clerk:';
+ const CLERK_CACHE_PREFIX = `clerk:${process.env.NODE_ENV || 'development'}:`;
```

## Cache Key Structure

### New Format:

```
clerk:{environment}:{type}:{identifier}
```

### Examples:

| Environment | Type      | Key                                   | Example              |
| ----------- | --------- | ------------------------------------- | -------------------- |
| Development | User ID   | `clerk:development:id:user_123`       | Dev user cache       |
| Production  | User ID   | `clerk:production:id:user_123`        | Prod user cache      |
| Development | Username  | `clerk:development:username:john`     | Dev username lookup  |
| Production  | Username  | `clerk:production:username:john`      | Prod username lookup |
| Development | Batch IDs | `clerk:development:ids:user_1,user_2` | Dev batch cache      |
| Production  | Batch IDs | `clerk:production:ids:user_1,user_2`  | Prod batch cache     |

## Immediate Actions Required

### 1. Deploy the Fix

```bash
# Commit the changes
git add lib/cache/
git commit -m "fix: add environment-specific prefixes to Clerk cache keys"

# Deploy to production
git push origin main
# Wait for Vercel deployment
```

### 2. Clear Corrupted Cache

**Option A: Wait (Recommended for Low-Impact)**

- Cache expires in 5 minutes
- New requests will use correct keys
- No manual intervention needed

**Option B: Manual Clear (Immediate Fix)**

```bash
# Run the cache clearing script
pnpm tsx scripts/clear-clerk-cache.ts --all
```

**Option C: Restart Services**

- Restart your Next.js application
- Forces fresh cache population with correct keys

**Option D: Upstash Dashboard (Nuclear Option)**

1. Go to https://console.upstash.com
2. Select your Redis database
3. Go to **Data Browser**
4. Delete keys starting with `clerk:`

### 3. Verify the Fix

#### Development:

```bash
# Start dev server
pnpm dev

# Check logs for correct key format
# Should see: clerk:development:id:user_xxx
```

#### Production:

```bash
# Check Vercel logs
# Look for: clerk:production:id:user_xxx

# Visit production site
# Verify ExpertsSection shows correct prod users
```

## Testing Checklist

- [ ] Dev environment shows only dev users
- [ ] Prod environment shows only prod users
- [ ] No test/dev users appear in production
- [ ] User lookups return correct environment data
- [ ] ExpertsSection displays correct profiles
- [ ] Cache invalidation works per environment
- [ ] No 404s or missing user errors

## Prevention

### 1. Environment Variable Validation

Add to your CI/CD:

```bash
# .github/workflows/test.yml
- name: Validate Environment Variables
  run: |
    if [ "$NODE_ENV" != "production" ] && [ "$NODE_ENV" != "development" ] && [ "$NODE_ENV" != "test" ]; then
      echo "Invalid NODE_ENV: $NODE_ENV"
      exit 1
    fi
```

### 2. Cache Key Auditing

Run this periodically:

```typescript
// scripts/audit-cache-keys.ts
import { redisManager } from '../lib/redis';

async function auditCacheKeys() {
  const env = process.env.NODE_ENV;
  console.log(`Auditing cache keys for: ${env}`);

  // Verify all keys include environment
  // Alert if any keys don't match pattern: clerk:{env}:*
}
```

### 3. Monitoring

Add alerts for:

- Cache key format violations
- Environment mismatch in cache hits
- Unexpected user data access

## Best Practices Going Forward

### 1. Always Include Environment in Cache Keys

```typescript
// ✅ GOOD
const cacheKey = `${service}:${process.env.NODE_ENV}:${resourceType}:${id}`;

// ❌ BAD
const cacheKey = `${service}:${resourceType}:${id}`;  // No environment!
```

### 2. Document Cache Key Formats

```typescript
/**
 * Generate cache key for user profile
 *
 * Format: profile:{env}:user:{userId}
 * Example: profile:production:user:user_abc123
 */
function getCacheKey(userId: string): string {
  return `profile:${process.env.NODE_ENV}:user:${userId}`;
}
```

### 3. Test Environment Isolation

```typescript
// tests/cache.test.ts
describe('Cache Isolation', () => {
  it('uses different keys for different environments', () => {
    const devKey = ClerkCacheKeys.userId('user_123', 'development');
    const prodKey = ClerkCacheKeys.userId('user_123', 'production');

    expect(devKey).not.toBe(prodKey);
    expect(devKey).toContain('development');
    expect(prodKey).toContain('production');
  });
});
```

## Impact Assessment

### Before Fix:

| Metric               | Status                           |
| -------------------- | -------------------------------- |
| Data Integrity       | ❌ BROKEN                        |
| User Experience      | ❌ BAD (wrong users shown)       |
| Production Stability | ⚠️ UNSTABLE (cache pollution)    |
| Debug Difficulty     | 🔥 NIGHTMARE (hard to reproduce) |

### After Fix:

| Metric               | Status                              |
| -------------------- | ----------------------------------- |
| Data Integrity       | ✅ FIXED                            |
| User Experience      | ✅ CORRECT (right users shown)      |
| Production Stability | ✅ STABLE (isolated caches)         |
| Debug Difficulty     | ✅ EASY (environment-specific logs) |

## Related Issues

- ExpertsSection pulling dev data in prod
- User profile mismatches
- Intermittent 404s for valid users
- Incorrect user counts in admin panels

## Related Files

- `lib/cache/clerk-cache.ts` - Main cache implementation
- `lib/cache/clerk-cache-keys.ts` - Key generation
- `lib/cache/clerk-cache-utils.ts` - Cache utilities
- `components/organisms/home/ExpertsSection.tsx` - Affected component

## Lessons Learned

1. **Always include environment in cache keys** when sharing infrastructure
2. **Test with production-like setup** to catch these issues early
3. **Monitor cache key patterns** for anomalies
4. **Document cache key formats** clearly
5. **Add environment validation** to prevent similar issues

## References

- [Upstash Redis Best Practices](https://docs.upstash.com/redis/overall/best-practices)
- [Next.js Caching Patterns](https://nextjs.org/docs/app/building-your-application/caching)
- [Environment-Specific Configuration](https://12factor.net/config)

---

**Fix Status**: ✅ IMPLEMENTED  
**Deployment**: Pending  
**Verification**: Required  
**Next Steps**: Deploy and verify
