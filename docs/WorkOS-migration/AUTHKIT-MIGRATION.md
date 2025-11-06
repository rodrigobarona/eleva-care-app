# AuthKit Next.js Migration Guide

## Overview

Migrating from custom WorkOS implementation to official `@workos-inc/authkit-nextjs` package for self-hosted authentication components.

## Why Migrate?

- **No external redirects**: Sign-in UI rendered on your domain (eleva.care)
- **Built-in middleware**: Automatic session management and refresh
- **Official SDK**: Better maintained, more features
- **Type-safe**: Full TypeScript support
- **Best practices**: Follows Next.js 16 App Router patterns

## Required Environment Variables

Add to `.env.local`:

```env
# WorkOS Core (Already have these)
WORKOS_API_KEY="your_workos_api_key"
WORKOS_CLIENT_ID="your_workos_client_id"

# AuthKit Next.js Required
WORKOS_REDIRECT_URI="http://localhost:3000/api/auth/callback"
WORKOS_COOKIE_PASSWORD="kKrr/dtGJ6MiQ3Ds83aoGxBcfXArlA42nfDnv/FRJTw="

# Optional (defaults are fine for most cases)
WORKOS_COOKIE_MAX_AGE="600"  # 10 minutes
WORKOS_COOKIE_NAME="wos-session"
WORKOS_COOKIE_DOMAIN="localhost"  # Change to "eleva.care" in production
```

**IMPORTANT**: The `WORKOS_COOKIE_PASSWORD` must be at least 32 characters and should be different for each environment.

## Migration Checklist

### ✅ Step 1: Install Package

```bash
pnpm add @workos-inc/authkit-nextjs
```

### Step 2: Update Root Layout

- [ ] Add `<AuthKitProvider>` wrapper to `app/layout.tsx`
- [ ] Enable client-side auth with `useAuth()` hook

### Step 3: Update Middleware

- [ ] Replace `clerkMiddleware` with `authkitMiddleware`
- [ ] Keep i18n logic
- [ ] Keep role-based access control
- [ ] Update session handling

### Step 4: Update Callback Handler

- [ ] Replace `app/api/auth/callback/route.ts` with `handleAuth()`
- [ ] Migrate custom logic to `onSuccess` callback
- [ ] Remove manual session creation

### Step 5: Update Protected Routes

- [ ] Replace custom `requireAuth()` with `withAuth()`
- [ ] Update all `(private)` pages
- [ ] Update API routes

### Step 6: Update Sign-In/Sign-Up

- [ ] Use `getSignInUrl()` instead of manual URL construction
- [ ] Consider self-hosted UI components (future enhancement)

### Step 7: Clean Up

- [ ] Remove `lib/auth/workos-session.ts` (replaced by AuthKit)
- [ ] Remove custom session management
- [ ] Update type definitions

### Step 8: Testing

- [ ] Test sign-in flow
- [ ] Test session refresh
- [ ] Test role-based access
- [ ] Test sign-out
- [ ] Test i18n with auth

## Key API Changes

### Before (Custom Implementation)

```typescript
import { requireAuth } from '@/lib/auth/workos-session';

const session = await requireAuth();
const user = await db.query.UsersTable.findFirst({
  where: eq(UsersTable.workosUserId, session.userId),
});
```

### After (AuthKit Next.js)

```typescript
import { withAuth } from '@workos-inc/authkit-nextjs';

const { user, sessionId, organizationId, role, permissions } = await withAuth();
// user is already populated with WorkOS data
```

### Before (Middleware)

```typescript
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  if (!userId) await auth.protect();
});
```

### After (AuthKit Middleware)

```typescript
import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/', '/about', '/pricing'],
  },
});
```

## Benefits of AuthKit Next.js

1. **Automatic Session Management**: Handles token refresh automatically
2. **Built-in Security**: HTTP-only cookies, CSRF protection
3. **Performance**: Optimized for Next.js App Router
4. **Developer Experience**: Simple API, great TypeScript support
5. **Self-Hosted UI**: No redirects to external domains
6. **Organization Support**: Built-in multi-tenancy
7. **RBAC Integration**: Native role and permission checking

## Migration Timeline

- **Phase 1** (30 min): Install package, update env vars, test in dev
- **Phase 2** (1 hour): Update middleware and root layout
- **Phase 3** (2 hours): Update all protected routes
- **Phase 4** (1 hour): Update callback and auth flows
- **Phase 5** (1 hour): Testing and cleanup

Total: ~5-6 hours for complete migration

## Rollback Plan

If issues arise:

1. Keep Clerk packages installed temporarily
2. Use feature flags to toggle between implementations
3. Monitor error rates
4. Have backup `.env` ready

## Resources

- [AuthKit Next.js Docs](https://github.com/workos/authkit-nextjs)
- [WorkOS Dashboard](https://dashboard.workos.com)
- [Migration Support](https://workos.com/support)
