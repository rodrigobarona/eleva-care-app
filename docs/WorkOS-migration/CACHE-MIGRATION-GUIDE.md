# Cache Migration Guide: unstable_cache → 'use cache: remote'

## Current Situation

We're currently using `unstable_cache` for API route caching because `cacheComponents: false` in our Next.js config. This is disabled due to next-intl compatibility issues with Next.js 16.

## Future Migration (When next-intl Supports cacheComponents)

Once next-intl adds support for `cacheComponents` (expected in a Next.js 16.x minor release), we can migrate to the modern `'use cache: remote'` directive.

### Migration Steps

#### Step 1: Enable cacheComponents

```ts filename="next.config.ts"
const config: NextConfig = {
  // Enable Cache Components
  cacheComponents: true,
  
  // ... rest of config
}
```

#### Step 2: Update API Routes

**Before (Current - unstable_cache):**

```ts filename="app/api/user/profile/route.ts"
import { unstable_cache } from 'next/cache';

function getCachedUserProfile(userId: string) {
  return unstable_cache(
    async () => {
      const dbUser = await getUserByClerkId(userId);
      return dbUser;
    },
    [`user-profile-${userId}`],
    {
      revalidate: 300,
      tags: ['user-profile', `user-profile-${userId}`],
    }
  )();
}

export async function GET() {
  const { user } = await withAuth();
  const dbUser = await getCachedUserProfile(user.id);
  // ...
}
```

**After (Future - 'use cache: remote'):**

```ts filename="app/api/user/profile/route.ts"
import { cacheLife, cacheTag } from 'next/cache';

async function getCachedUserProfile(userId: string) {
  'use cache: remote'
  cacheTag('user-profile', `user-profile-${userId}`)
  cacheLife({ expire: 300 }) // 5 minutes
  
  const dbUser = await getUserByClerkId(userId);
  return dbUser;
}

export async function GET() {
  const { user } = await withAuth();
  const dbUser = await getCachedUserProfile(user.id);
  // ...
}
```

### Why 'use cache: remote' is Better

1. **Cleaner Syntax**: No wrapper function needed
2. **Better DX**: More declarative, less boilerplate
3. **Official API**: `unstable_cache` may change, `'use cache'` is stable
4. **Better Integration**: Works seamlessly with Next.js 16 caching system
5. **Consistent**: Same pattern as Server Components

### Comparison Table

| Feature | `unstable_cache` | `'use cache: remote'` |
|---------|------------------|----------------------|
| Requires `cacheComponents` | No | Yes |
| Syntax | Wrapper function | Directive |
| Tag-based invalidation | ✅ | ✅ |
| Time-based revalidation | ✅ | ✅ |
| Works in API routes | ✅ | ✅ |
| Works in Server Components | ✅ | ✅ |
| Stability | Unstable (may change) | Stable |

### Migration Checklist

When migrating:

- [ ] Update `next.config.ts` to enable `cacheComponents: true`
- [ ] Test that next-intl pages still work with the new config
- [ ] Convert all `unstable_cache` calls in API routes to `'use cache: remote'`
- [ ] Test cache invalidation with `revalidateTag()` / `updateTag()`
- [ ] Update documentation to reflect new caching approach

### Files to Update

1. `/app/api/user/profile/route.ts` - User profile caching
2. Any other API routes using `unstable_cache`
3. Server Actions using `unstable_cache`

### Cache Invalidation (No Change)

Both approaches use the same invalidation methods:

```ts
import { revalidateTag, updateTag } from 'next/cache';

// Background update (stale-while-revalidate)
await revalidateTag('user-profile-{userId}');

// Immediate update (read-your-writes)
await updateTag('user-profile-{userId}');
```

## References

- [Next.js 16 'use cache: remote' documentation](https://nextjs.org/docs/app/api-reference/directives/use-cache-remote)
- [Next.js 16 cacheComponents config](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
- [next-intl GitHub issue tracking cacheComponents support](https://github.com/amannn/next-intl/issues/1493)

---

**Last Updated:** 2025-01-06  
**Status:** Waiting for next-intl cacheComponents support  
**Tracking Issue:** https://github.com/amannn/next-intl/issues/1493

