# Next.js 16 Quick Reference Guide

## 🚀 Quick Start Patterns

### Async Params (Required in Next.js 16)

```typescript
// ✅ Correct
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <div>{id}</div>
}

// ❌ Wrong (Next.js 15 pattern)
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params
  return <div>{id}</div>
}
```

### Search Params

```typescript
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { locale } = await params
  const { q, page } = await searchParams
  return <div>Search: {q}</div>
}
```

## 🗄️ Caching Strategies

### 1. 'use cache' Directive

```typescript
import { cacheLife, cacheTag } from 'next/cache';

// Static data
async function getStaticData() {
  'use cache';
  cacheLife({ expire: 3600 }); // 1 hour
  cacheTag('static-data');
  return await db.query();
}

// Shared runtime data
async function getSharedData() {
  'use cache: remote';
  cacheLife({ expire: 300 }); // 5 minutes
  cacheTag('shared-data');
  return await db.query();
}

// User-specific data
async function getUserData() {
  'use cache: private';
  cacheLife({ expire: 60 }); // 1 minute
  const sessionId = (await cookies()).get('session-id')?.value;
  return await db.query({ sessionId });
}
```

### 2. Fetch Caching

```typescript
// Static (cached until manually invalidated)
const data = await fetch('https://...', { cache: 'force-cache' })

// Dynamic (refetched on every request)
const data = await fetch('https://...', { cache: 'no-store' })

// Time-based revalidation
const data = await fetch('https://...', {
  next: { revalidate: 60 } // 60 seconds
})
```

## 🔄 Cache Invalidation

### When to Use Each API

| API               | Use Case                              | Pattern                |
| ----------------- | ------------------------------------- | ---------------------- |
| `updateTag()`     | User needs to see changes immediately | Read-your-writes       |
| `revalidateTag()` | Slight delay acceptable               | Stale-while-revalidate |
| `refresh()`       | Update UI without full reload         | Client refresh         |

### Examples

```typescript
'use server';

import { refresh, revalidateTag, updateTag } from 'next/cache';

// 1. updateTag - Immediate updates
export async function createPost(data: FormData) {
  const post = await db.post.create({ data });

  // User sees changes immediately
  updateTag('posts');
  updateTag(`post-${post.id}`);

  return post;
}

// 2. revalidateTag - Background updates
export async function updateArticle(id: string, data: any) {
  await db.articles.update(id, data);

  // Users see stale data while fresh data fetches
  revalidateTag(`article-${id}`, 'max');
}

// 3. refresh - Client refresh
export async function markNotificationAsRead(id: string) {
  await db.notifications.markAsRead(id);

  // Refresh UI without full page reload
  refresh();
}
```

## 📝 Server Actions

```typescript
'use server';

import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createItem(formData: FormData) {
  // 1. Validate input
  const data = validateFormData(formData);

  // 2. Perform mutation
  const item = await db.items.create({ data });

  // 3. Invalidate cache
  updateTag('items');
  updateTag(`item-${item.id}`);

  // 4. Redirect
  redirect(`/items/${item.id}`);
}
```

## 🎯 Data Fetching Patterns

### Parallel Fetching

```typescript
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Fetch in parallel
  const [user, posts, comments] = await Promise.all([
    getUser(id),
    getPosts(id),
    getComments(id),
  ])

  return <UserProfile user={user} posts={posts} comments={comments} />
}
```

### Sequential with Suspense

```typescript
import { Suspense } from 'react'

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // First fetch
  const user = await getUser(id)

  return (
    <div>
      <UserHeader user={user} />

      {/* Second fetch streams in */}
      <Suspense fallback={<PostsSkeleton />}>
        <Posts userId={id} />
      </Suspense>
    </div>
  )
}

async function Posts({ userId }: { userId: string }) {
  const posts = await getPosts(userId)
  return <PostList posts={posts} />
}
```

## 🛡️ Error Handling

### Error Boundary

```typescript
// app/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      {error.digest && <p>Error ID: {error.digest}</p>}
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### Not Found

```typescript
// app/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h2>404 - Not Found</h2>
      <p>Could not find the requested resource</p>
    </div>
  )
}
```

## ⚙️ Route Segment Config

```typescript
// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Force static rendering
export const dynamic = 'force-static'

// Revalidate every 60 seconds
export const revalidate = 60

// Override fetch caching
export const fetchCache = 'force-cache' // or 'force-no-store'
```

## 🧪 Testing Patterns

### Mock Next.js 16 APIs

```typescript
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  updateTag: jest.fn(),
  refresh: jest.fn(),
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn().mockImplementation(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
```

### Test Cache Invalidation

```typescript
it('should invalidate cache tags', async () => {
  const updateTagMock = require('next/cache').updateTag;

  await serverAction({ name: 'Test' });

  expect(updateTagMock).toHaveBeenCalledWith('resources');
  expect(updateTagMock).toHaveBeenCalledWith('resource-123');
});
```

### Test Async Params

```typescript
it('should handle async params', async () => {
  const params = Promise.resolve({ id: 'test-123' });
  const result = await pageComponent({ params });
  expect(result).toBeDefined();
});
```

## 📊 Performance Checklist

- [ ] Use Server Components by default
- [ ] Add `'use cache'` to cacheable functions
- [ ] Set appropriate `cacheLife()` expiration
- [ ] Tag cached data with `cacheTag()`
- [ ] Use `updateTag()` after mutations
- [ ] Implement Suspense for slow data
- [ ] Use parallel fetching with `Promise.all()`
- [ ] Optimize images with `next/image`
- [ ] Dynamic import large components
- [ ] Monitor Core Web Vitals

## 🔍 Common Mistakes

### ❌ Forgetting to await params

```typescript
// Wrong
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = params // Error: params is a Promise
}

// Correct
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params // ✅
}
```

### ❌ Using wrong cache invalidation

```typescript
// Wrong: Using revalidatePath for immediate updates
export async function createPost(data: FormData) {
  const post = await db.post.create({ data })
  revalidatePath('/posts') // User might see stale data
}

// Correct: Use updateTag for immediate updates
export async function createPost(data: FormData) {
  const post = await db.post.create({ data })
  updateTag('posts') // User sees changes immediately
}
```

### ❌ Not using 'use cache' directive

```typescript
// Wrong: Missing cache directive
async function getData() {
  cacheLife({ expire: 300 }) // Won't work without 'use cache'
  return await db.query()
}

// Correct
async function getData() {
  'use cache' // ✅
  cacheLife({ expire: 300 })
  return await db.query()
}
```

## 📚 Additional Resources

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Caching in Next.js 16](https://nextjs.org/docs/app/building-your-application/caching)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-16)

---

**Pro Tip:** Use Context7 MCP for up-to-date Next.js 16 documentation and examples directly in your IDE!
