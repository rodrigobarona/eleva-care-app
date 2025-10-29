# Next.js 16 Quick Reference

## 📁 Consolidated Rules Structure

We've streamlined from 30+ rules to **4 focused files**:

1. **`nextjs-core.mdc`** - Next.js 16 patterns, caching, server components, server actions  
   _Applies to: app/\*\*/_, components/\*\*/_, lib/\*\*/\*_

2. **`testing.mdc`** - Testing patterns for Next.js 16  
   _Applies to: tests/\*\*/_, _.test.\*, _.spec.\*\_

3. **`database-security.mdc`** - Database, auth, Stripe, security  
   _Applies to: drizzle/\*\*/_, lib/auth/\*\*/_, lib/stripe/\*\*/\*_

4. **`ui-components.mdc`** - UI patterns, Atomic Design, forms, accessibility  
   _Applies to: components/\*\*/_, app/\*\*/\*\_

## 🎯 When Each Rule Applies

Cursor automatically activates rules based on the file you're editing:

- Editing `app/page.tsx` → **nextjs-core.mdc** + **ui-components.mdc**
- Editing `tests/api.test.ts` → **testing.mdc**
- Editing `drizzle/schema.ts` → **database-security.mdc**

## 🚀 Most Common Patterns

### Async Params (Must Use)

```typescript
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

### Cache Invalidation

```typescript
'use server';

import { updateTag } from 'next/cache';

export async function createPost(data: FormData) {
  const post = await db.posts.create({ data });
  updateTag('posts'); // User sees changes immediately
}
```

### Caching Functions

```typescript
import { cacheLife, cacheTag } from 'next/cache';

async function getData() {
  'use cache';
  cacheLife({ expire: 300 });
  cacheTag('data');

  return await db.query();
}
```

### Server Component

```typescript
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData(id);

  return <div>{data.title}</div>;
}
```

### Client Component

```typescript
'use client';

export function Button() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

## 📊 Performance Checklist

Before committing:

- [ ] Used async params (`params: Promise<...>`)
- [ ] Added `'use cache'` to cacheable functions
- [ ] Used correct cache invalidation (updateTag/revalidateTag/refresh)
- [ ] Implemented Suspense for slow operations
- [ ] Used Server Components by default
- [ ] Added `'use client'` only when necessary

## 🛠️ Tech Stack

- Next.js 16 + TypeScript
- TailwindCSS + Shadcn/ui
- Drizzle ORM + Neon.tech
- Clerk.com (auth)
- Stripe (payments)
- pnpm (package manager)

## 📚 Old Rules

Previous detailed rules moved to:

- `.cursor/rules/_archive/` - Reference only
- `NEXT_JS_16_MIGRATION_SUMMARY.md` - Detailed migration guide
- `NEXT_JS_16_QUICK_REFERENCE.md` - Extended reference

## 💡 Tips

1. **Start simple** - Rules apply automatically based on file type
2. **Focus on patterns** - Not memorizing syntax
3. **Use examples** - Copy-paste from rules as templates
4. **Test often** - Run tests to catch issues early

---

**Questions?** Check the detailed guides in `.cursor/rules/_archive/`
