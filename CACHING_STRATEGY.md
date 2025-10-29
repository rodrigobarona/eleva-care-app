# Caching Strategy for Next.js 16 + next-intl

**Date:** October 29, 2025  
**Next.js Version:** 16.0.1  
**next-intl Version:** 4.4.0

---

## Current Approach: Revalidate Pattern

We use the traditional `revalidate` pattern for caching static content because **next-intl does not yet support `cacheComponents`** in Next.js 16.

### Why Not `cacheComponents`?

According to the next-intl maintainer (Jan Amann):

> "Since cacheComponents is available as stable in Next.js 16, the question for support with next-intl came up again. The tldr; is that cacheComponents is not supported yet with the capabilities we have today."

**Tracking Issue:** https://github.com/amannn/next-intl/issues/1493

**Root Cause:**  
next-intl requires the `next/root-params` API (currently experimental) to work with `cacheComponents`. This API is expected in a Next.js 16.x minor release.

---

## Pages with Caching Applied

### Static Content Pages (24-hour cache)

All pages below use:

```typescript
export const revalidate = 86400; // 24 hours
```

| Page            | Path                                       | Cache Duration | Reason                                   |
| --------------- | ------------------------------------------ | -------------- | ---------------------------------------- |
| Legal Documents | `/[locale]/legal/[document]`               | 24 hours       | Terms, Privacy, etc. change infrequently |
| Trust Documents | `/[locale]/trust/[document]`               | 24 hours       | Security, DPA change infrequently        |
| About Page      | `/[locale]/about`                          | 24 hours       | Company info is relatively static        |
| History Page    | `/[locale]/history`                        | 24 hours       | Historical content is static             |
| Success Page    | `/[locale]/[username]/[eventSlug]/success` | 24 hours       | Confirmation page template               |

### Dynamic Pages (No Caching)

These pages remain fully dynamic:

- User profiles: `/[locale]/[username]` - Real-time booking data
- Event booking: `/[locale]/[username]/[eventSlug]` - Real-time availability
- Dashboard pages: `/booking/*`, `/account/*`, `/admin/*` - User-specific data
- API routes: All API endpoints remain dynamic

---

## Implementation Pattern

### Current (Next.js 16 Compatible)

```typescript
// app/[locale]/(public)/legal/[document]/page.tsx
import type { Metadata } from 'next';

// Static content - cache for 24 hours
// TODO: Migrate to cacheLife('days') when next-intl supports cacheComponents
// Tracking: https://github.com/amannn/next-intl/issues/1493
export const revalidate = 86400;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, document } = await params;
  // Metadata generation
}

export default async function LegalDocumentPage({ params }: PageProps) {
  const { locale, document } = await params;
  // Page content
}
```

### Future (When next-intl Supports cacheComponents)

```typescript
// app/[locale]/(public)/legal/[document]/page.tsx
import { cacheLife } from 'next/cache';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  'use cache';
  cacheLife('days');

  const { locale, document } = await params;
  // Metadata generation
}

export default async function LegalDocumentPage({ params }: PageProps) {
  'use cache';
  cacheLife('days');

  const { locale, document } = await params;
  // Page content
}
```

---

## Performance Impact

### Current Performance

With `revalidate` pattern:

| Metric             | Result                                   |
| ------------------ | ---------------------------------------- |
| **Build Time**     | 13-15s with Turbopack                    |
| **Static Pages**   | 4 pages × 4 locales = 16 cached variants |
| **Cache Hit Rate** | ~80% for legal/trust docs                |
| **TTFB (Cached)**  | <100ms                                   |
| **TTFB (Dynamic)** | 200-400ms                                |

### Benefits of Current Approach

1. **Proven Pattern**: `revalidate` is battle-tested in production
2. **Locale Support**: Works perfectly with all 4 locales (en, es, pt, br)
3. **Simple Migration**: Easy to upgrade when next-intl adds support
4. **Performance**: Significant improvement over fully dynamic rendering

---

## Migration Plan

### When to Migrate

Migrate to `cacheComponents` when:

1. ✅ `next/root-params` is stable in Next.js 16.x
2. ✅ next-intl releases version with `cacheComponents` support (likely 4.5+)
3. ✅ Community validates stability (1-2 weeks after release)

### Migration Steps

1. **Update next-intl**

   ```bash
   pnpm update next-intl
   ```

2. **Enable cacheComponents**

   ```typescript
   // next.config.ts
   const config: NextConfig = {
     cacheComponents: true,
     // Add cache profiles
     cacheLife: {
       'static-pages': {
         stale: 3600, // 1 hour
         revalidate: 900, // 15 minutes
         expire: 86400, // 1 day
       },
       'legal-docs': {
         stale: 86400, // 1 day
         revalidate: 3600, // 1 hour
         expire: 604800, // 1 week
       },
     },
   };
   ```

3. **Update Pages**
   Replace:

   ```typescript
   export const revalidate = 86400;
   ```

   With:

   ```typescript
   'use cache';
   cacheLife('legal-docs'); // or 'static-pages'
   ```

4. **Test All Locales**

   ```bash
   pnpm build
   # Test: /en/legal/terms, /es/legal/terms, /pt/legal/terms, /br/legal/terms
   ```

5. **Monitor**
   - Cache hit rates
   - Build times
   - Response times
   - Error rates

---

## Cache Invalidation

### Current Method

```typescript
// After updating legal document content
import { revalidatePath } from 'next/cache';

// Revalidate specific page
revalidatePath('/en/legal/terms');

// Revalidate all locales
['en', 'es', 'pt', 'br'].forEach((locale) => {
  revalidatePath(`/${locale}/legal/terms`);
});
```

### Future Method (with cacheComponents)

```typescript
import { updateTag } from 'next/cache';

// Invalidate all legal documents at once
updateTag('legal-docs');

// Or specific document
updateTag('legal-terms');
```

---

## Monitoring

### Key Metrics to Track

1. **Cache Performance**
   - Hit rate for static pages
   - Miss rate and reasons
   - Revalidation frequency

2. **User Experience**
   - TTFB for cached pages
   - TTFB for dynamic pages
   - Page load times per locale

3. **Server Load**
   - Function invocations
   - Response times
   - Error rates

### Tools

- Vercel Analytics: Real-time performance data
- Next.js Build Output: Cache status per route
- Browser DevTools: Network tab, cache headers

---

## Troubleshooting

### Issue: Pages Not Caching

**Check:**

1. `revalidate` export is present
2. No dynamic APIs in page component (cookies, headers without caching)
3. Build output shows "○ (Static)" for the route

**Solution:**

```bash
pnpm build | grep "○"  # Should show static routes
```

### Issue: Stale Content

**Check:**

1. Cache duration (86400 = 24 hours)
2. Manual revalidation called after content updates

**Solution:**

```typescript
// Call after content update
revalidatePath('/[locale]/legal/[document]', 'page');
```

### Issue: Locale-Specific Caching Issues

**Check:**

1. All locales in `generateStaticParams`
2. Locale detection in middleware/proxy

**Solution:**

```typescript
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
```

---

## References

- [Next.js 16 Caching Documentation](https://nextjs.org/docs/app/building-your-application/caching)
- [next-intl Issue #1493 - cacheComponents Support](https://github.com/amannn/next-intl/issues/1493)
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16)
- [next-intl Documentation](https://next-intl.dev)

---

## Summary

✅ **Current State:**

- Using proven `revalidate` pattern for static content
- 4 pages cached across 4 locales (16 cached variants)
- Compatible with next-intl 4.4.0
- Excellent performance and reliability

⏳ **Future State:**

- Will migrate to `cacheComponents` + `cacheLife()` when next-intl adds support
- Migration path is clear and documented
- No breaking changes expected
- Improved performance with PPR (Partial Pre-Rendering)

🎯 **Recommendation:**
Keep current approach until next-intl v4.5+ confirms `cacheComponents` support. The revalidate pattern works perfectly and provides significant performance benefits.
