# Next.js 16 Migration Summary for Cursor Rules

## Overview

All Cursor rules have been updated to reflect Next.js 16 patterns, best practices, and new APIs. This document summarizes the key changes and new patterns introduced.

## Updated Rules

### Core Rules

#### 1. `core/api-actions.mdc`

**Key Updates:**

- Updated from Next.js 15 to Next.js 16
- Added Next.js 16 cache invalidation APIs:
  - `updateTag()` for read-your-writes (immediate updates)
  - `revalidateTag()` for stale-while-revalidate pattern
  - `refresh()` for client-side router refresh
- Added data fetching patterns with async params
- Added comprehensive examples for each cache invalidation strategy

**New Patterns:**

```typescript
// Read-your-writes pattern
'use server'
import { updateTag } from 'next/cache'

export async function createPost(formData: FormData) {
  const post = await db.post.create({ data: formData })
  updateTag('posts')
  updateTag(`post-${post.id}`)
  return post
}

// Async params pattern
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getData(id)
  return <div>{data.title}</div>
}
```

#### 2. `core/architecture.mdc`

**Key Updates:**

- Completely rewritten for Next.js 16
- Added comprehensive data flow patterns with cache invalidation
- Added async params examples throughout
- Added streaming with Suspense patterns
- Added route segment config options
- Added migration guide from Next.js 15 to 16

**New Sections:**

- Next.js 16 Caching Strategies
- Route Segment Config
- Migration from Next.js 15 to 16
- Enhanced Data Fetching Patterns

#### 3. `core/app-router-i18n.mdc`

**Key Updates:**

- Updated all examples to use async params pattern
- Updated metadata generation with async params
- Added search params pattern
- Updated authentication flows

**New Patterns:**

```typescript
// Async params with multiple dynamic segments
export default async function BlogPost({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const post = await getPost(slug, locale)
  return <article>{post.content}</article>
}

// Search params
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { locale } = await params
  const { q, page } = await searchParams
  const results = await searchContent(q, page, locale)
  return <SearchResults results={results} />
}
```

#### 4. `core/performance.mdc`

**Key Updates:**

- Completely rewritten for Next.js 16
- Added 'use cache' directive patterns
- Added cacheLife() and cacheTag() usage
- Added mixed caching strategies (static, remote, private)
- Added comprehensive cache invalidation patterns
- Added Next.js 16 caching checklist

**New Sections:**

- Next.js 16 Caching with 'use cache' Directive
- Mixed Caching Strategies
- Cache Invalidation Patterns
- Performance Monitoring Metrics

**New Patterns:**

```typescript
// Basic 'use cache' usage
import { cacheLife, cacheTag } from 'next/cache';

async function getExperts() {
  'use cache';
  cacheLife({ expire: 300 }); // 5 minutes
  cacheTag('experts');

  const experts = await db.experts.findMany();
  return experts;
}

// Mixed caching strategies
async function getProduct(id: string) {
  'use cache'; // Static
  cacheTag(`product-${id}`);
  return db.products.find({ where: { id } });
}

async function getProductPrice(id: string) {
  'use cache: remote'; // Shared runtime
  cacheTag(`product-price-${id}`);
  cacheLife({ expire: 300 });
  return db.products.getPrice({ where: { id } });
}

async function getRecommendations(productId: string) {
  'use cache: private'; // User-specific
  cacheLife({ expire: 60 });
  const sessionId = (await cookies()).get('session-id')?.value;
  return db.recommendations.findMany({ where: { productId, sessionId } });
}
```

#### 5. `core/error-handling.mdc`

**Key Updates:**

- Updated error boundaries for Next.js 16
- Added error digest support
- Added not-found handling
- Updated server actions error handling with cache invalidation

#### 6. `core/general-rules.mdc`

**Key Updates:**

- Updated from Next.js 15 to Next.js 16
- Added caching strategy section
- Updated API & Server Actions guidelines
- Added async params pattern requirement
- Fixed typo: "Drizzler" → "Drizzle ORM"

### Testing Rules

#### 1. `testing/server-action-testing.mdc`

**Key Updates:**

- Updated for Next.js 16
- Added mocks for new cache APIs (updateTag, revalidateTag, refresh, cacheTag, cacheLife)
- Added testing patterns for cache invalidation
- Added testing patterns for 'use cache' functions
- Added testing patterns for async params

**New Testing Patterns:**

```typescript
// Mock Next.js 16 cache APIs
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  updateTag: jest.fn(),
  refresh: jest.fn(),
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
}));

// Test updateTag
it('should invalidate cache tags immediately', async () => {
  const updateTagMock = require('next/cache').updateTag;
  await serverAction({ name: 'Test' });
  expect(updateTagMock).toHaveBeenCalledWith('resources');
});

// Test 'use cache' functions
it('should cache function results with proper tags', async () => {
  const cacheTagMock = require('next/cache').cacheTag;
  const cacheLifeMock = require('next/cache').cacheLife;

  await getCachedData('123');

  expect(cacheTagMock).toHaveBeenCalledWith('data-123');
  expect(cacheLifeMock).toHaveBeenCalledWith({ expire: 300 });
});
```

#### 2. `testing/component-testing.mdc`

**Key Updates:**

- Updated title to Next.js 16

## Key Next.js 16 Patterns

### 1. Async Params Pattern

All `params` and `searchParams` are now Promises and must be awaited:

```typescript
// Before (Next.js 15)
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params
}

// After (Next.js 16)
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
}
```

### 2. Cache Invalidation APIs

#### updateTag() - Read-Your-Writes

Use when users need to see their changes immediately:

```typescript
'use server';

import { updateTag } from 'next/cache';

export async function createPost(data: FormData) {
  const post = await db.post.create({ data });
  updateTag('posts');
  updateTag(`post-${post.id}`);
  return post;
}
```

#### revalidateTag() - Stale-While-Revalidate

Use when slight delays are acceptable:

```typescript
'use server';

import { revalidateTag } from 'next/cache';

export async function updateArticle(id: string) {
  await db.articles.update(id);
  revalidateTag(`article-${id}`, 'max');
}
```

#### refresh() - Client Router Refresh

Use to update UI without full page reload:

```typescript
'use server';

import { refresh } from 'next/cache';

export async function markNotificationAsRead(id: string) {
  await db.notifications.markAsRead(id);
  refresh();
}
```

### 3. 'use cache' Directive

#### Basic Usage

```typescript
import { cacheLife, cacheTag } from 'next/cache';

async function getData(id: string) {
  'use cache';
  cacheLife({ expire: 300 }); // 5 minutes
  cacheTag(`data-${id}`);

  return await db.query();
}
```

#### Cache Types

- `'use cache'` - Static data (build time or first request)
- `'use cache: remote'` - Shared runtime data
- `'use cache: private'` - User-specific data

### 4. Data Fetching Strategies

#### Force Cache (Static)

```typescript
const data = await fetch('https://...', { cache: 'force-cache' });
```

#### No Store (Dynamic)

```typescript
const data = await fetch('https://...', { cache: 'no-store' });
```

#### Time-based Revalidation

```typescript
const data = await fetch('https://...', {
  next: { revalidate: 60 },
});
```

## Migration Checklist

When updating code to Next.js 16:

- [ ] Update all `params` to `Promise<{ ... }>` and await them
- [ ] Update all `searchParams` to `Promise<{ ... }>` and await them
- [ ] Replace `revalidatePath()` with appropriate cache invalidation API:
  - Use `updateTag()` for immediate updates
  - Use `revalidateTag()` for stale-while-revalidate
  - Use `refresh()` for client-side updates
- [ ] Add `'use cache'` directive to cacheable functions
- [ ] Implement `cacheLife()` for expiration control
- [ ] Use `cacheTag()` for selective invalidation
- [ ] Update tests to mock new cache APIs
- [ ] Update error boundaries to include `digest` property
- [ ] Review and optimize caching strategies

## Testing Updates

All tests should now mock the new Next.js 16 cache APIs:

```typescript
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  updateTag: jest.fn(),
  refresh: jest.fn(),
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
}));
```

## Documentation References

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Next.js 16 Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Next.js 16 Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Next.js 16 Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-16)

## Summary

All Cursor rules have been comprehensively updated to:

1. Use Next.js 16 patterns and APIs
2. Implement async params pattern throughout
3. Use new cache invalidation APIs (updateTag, revalidateTag, refresh)
4. Leverage 'use cache' directive for optimal caching
5. Include proper testing patterns for Next.js 16 features

The rules now provide a complete guide for building Next.js 16 applications with best practices for caching, data fetching, error handling, and testing.
