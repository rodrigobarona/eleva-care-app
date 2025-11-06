# WorkOS Migration - In Progress

**Date:** November 5, 2025  
**Status:** ✅ **Core Framework Complete** | ⚠️ **51 Files Need Update**

---

## ✅ What's Complete

### 1. Auth Pages Fixed (Sign-In Error Resolved)

- ✅ Deleted old Clerk `app/[locale]/(auth)/` folder (was conflicting)
- ✅ Created WorkOS auth pages in `app/(auth)/`:
  - `sign-in/page.tsx`
  - `sign-up/page.tsx`
  - `unauthorized/page.tsx`
  - `onboarding/page.tsx`

**Result:** `/sign-in` now works without Clerk errors!

### 2. New WorkOS Provider System Created

- ✅ **`components/providers/workos-user-provider.tsx`**
  - Client-side user context (replaces Clerk's `useUser()`)
  - Hook: `useWorkOSUser()`
- ✅ **`app/providers-workos.tsx`**
  - Removed `ClerkProvider`
  - Added `WorkOSUserProvider`
  - Updated PostHog to use WorkOS user data
  - Updated Novu to use WorkOS user data
  - Kept ThemeProvider, CookieManager, etc.

- ✅ **`components/shared/providers/AuthorizationProvider.tsx`**
  - Updated to fetch roles from database via API
  - Removed Clerk dependency
  - Uses `useWorkOSUser()` hook

- ✅ **`app/api/user/roles/route.ts`**
  - New API endpoint to fetch user roles
  - Used by AuthorizationProvider

- ✅ **`app/layout.tsx`**
  - Fetches user with `getUser()` from WorkOS
  - Passes user to `ClientProviders`
  - Uses new `providers-workos.tsx`

---

## 🔄 Migration Architecture

### Before (Clerk)

```
ClerkProvider
  └─> useUser() in client components
  └─> auth() in server components
  └─> User data from Clerk API
  └─> Roles in Clerk metadata
```

### After (WorkOS)

```
AuthKitProvider (WorkOS)
  └─> WorkOSUserProvider (our wrapper)
      └─> useWorkOSUser() in client components
      └─> withAuth() in server components
      └─> User data from WorkOS API
      └─> Roles in our database (RolesTable)
```

---

## ⚠️ What Still Needs Migration (51 Files)

### Critical Files Using Clerk

#### Private Layouts (Priority 1)

- `app/(private)/admin/layout.tsx` - Uses `auth()` from Clerk
- `app/(private)/setup/layout.tsx` - Uses `auth()` from Clerk
- `app/(private)/booking/layout.tsx` - Uses `auth()` from Clerk
- `app/(private)/appointments/layout.tsx` - Uses `auth()` from Clerk

#### API Routes (~20 files)

- `app/api/user/**` - Various user endpoints
- `app/api/admin/**` - Admin endpoints
- `app/api/stripe/**` - Stripe integration
- `app/api/appointments/**` - Appointment endpoints
- `app/api/experts/**` - Expert endpoints
  All use `auth()` or `currentUser()` from Clerk

#### Server Actions (~10 files)

- `server/actions/expert-setup.ts` - Uses Clerk
- `server/actions/events.ts` - Uses Clerk
- `server/actions/billing.ts` - Uses Clerk
- `server/actions/schedule.ts` - Uses Clerk

#### Client Components (~15 files)

- `components/layout/sidebar/NavUser.tsx` - Uses `useUser()`
- `components/features/forms/EventForm.tsx` - Uses `useUser()`
- Various pages in `app/(private)/**` - Use `useUser()`

#### Other

- `app/sitemap.ts` - Uses Clerk
- `app/api/webhooks/clerk/route.ts` - Clerk webhook (delete this)
- `lib/cache/clerk-cache.ts` - Clerk caching utilities

---

## 🚀 Next Steps

### Phase 1: Update Layouts (Must Do First)

Replace Clerk `auth()` with WorkOS `withAuth()`:

```typescript
// OLD (Clerk)
import { auth } from '@clerk/nextjs/server';
// NEW (WorkOS)
import { withAuth } from '@workos-inc/authkit-nextjs';

const { userId } = await auth();

const { user } = await withAuth({ ensureSignedIn: true });
```

Files to update:

1. `app/(private)/admin/layout.tsx`
2. `app/(private)/setup/layout.tsx`
3. `app/(private)/booking/layout.tsx`
4. `app/(private)/appointments/layout.tsx`
5. All other private layouts

### Phase 2: Update API Routes

Replace Clerk auth with WorkOS:

```typescript
// OLD (Clerk)
import { auth } from '@clerk/nextjs/server';
const { userId } = await auth();

// NEW (WorkOS)
import { withAuth } from '@workos-inc/authkit-nextjs';
const { user } = await withAuth();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### Phase 3: Update Client Components

Replace `useUser()` with `useWorkOSUser()`:

```typescript
// OLD (Clerk)
import { useUser } from '@clerk/nextjs';
const { user, isLoaded } = useUser();

// NEW (WorkOS)
import { useWorkOSUser } from '@/components/providers/workos-user-provider';
const { user, isLoaded } = useWorkOSUser();
```

### Phase 4: Update Server Actions

Same as API routes - replace Clerk with WorkOS.

### Phase 5: Clean Up

1. Delete `app/providers.tsx` (old Clerk version)
2. Rename `app/providers-workos.tsx` to `app/providers.tsx`
3. Delete Clerk webhook: `app/api/webhooks/clerk/route.ts`
4. Remove Clerk from `package.json`:
   ```bash
   pnpm remove @clerk/nextjs @clerk/localizations
   ```
5. Remove Clerk cache utilities: `lib/cache/clerk-cache.ts`

---

## 🧪 Testing Checklist

After each phase:

- [ ] App builds without errors (`pnpm build`)
- [ ] Can sign in successfully
- [ ] Private routes redirect to sign-in when not authenticated
- [ ] User data displays correctly
- [ ] Roles/permissions work
- [ ] PostHog tracking works
- [ ] Novu notifications work

---

## 📋 Quick Reference

### WorkOS Auth Patterns

**Server Components:**

```typescript
import { withAuth } from '@workos-inc/authkit-nextjs';

// Require authentication
const { user } = await withAuth({ ensureSignedIn: true });

// Optional authentication
const { user } = await getUser();
```

**Client Components:**

```typescript
import { useWorkOSUser } from '@/components/providers/workos-user-provider';

const { user, isLoaded, isSignedIn } = useWorkOSUser();
```

**API Routes:**

```typescript
import { withAuth } from '@workos-inc/authkit-nextjs';

const { user, accessToken } = await withAuth();
// Use accessToken for external API calls
```

**Role Checking:**

```typescript
import { getUserApplicationRole, isUserExpert } from '@/lib/integrations/workos/roles';

const isExpert = await isUserExpert(user.id);
const role = await getUserApplicationRole(user.id);
```

---

## 🎯 Why WorkOS?

You made the right choice because WorkOS provides:

- ✅ **Organizations** - Multi-tenant support with `org_id`
- ✅ **Enterprise SSO** - SAML, AD FS, Okta, etc.
- ✅ **Directory Sync** - SCIM provisioning
- ✅ **Audit Logs** - Enterprise compliance
- ✅ **Lower cost** at scale
- ✅ **Better for B2B SaaS**

The embedded UI limitation is minor compared to these enterprise features.

---

## 📞 Questions?

- WorkOS Docs: https://workos.com/docs/authkit-nextjs
- AuthKit Reference: https://workos.com/docs/reference/authkit
- Organizations Guide: https://workos.com/docs/organizations

---

## 🚨 Current State

**Can you test the app right now?**

- ✅ Yes! The sign-in page works
- ✅ Root layout and providers are updated
- ⚠️ Private routes may still have Clerk dependencies
- ⚠️ Some API calls will fail until updated

**Recommendation:** Update layouts first (Phase 1), then test private routes.
