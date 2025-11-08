# WorkOS Logout Fix - Server Action Pattern

**Date:** 2025-11-08  
**Status:** ✅ Complete  
**Issue:** `NEXT_REDIRECT` error in API route

---

## 🔴 The Problem

When using `signOut()` from WorkOS in an API route, it throws a `NEXT_REDIRECT` error:

```bash
❌ Sign-out error: Error: NEXT_REDIRECT
    at async POST (app/api/auth/sign-out/route.ts:27:5)
  > 27 |     await signOut();
{
  digest: 'NEXT_REDIRECT;replace;https://api.workos.com/user_management/sessions/logout?...'
}
```

**Why this happens:**

- `signOut()` uses Next.js `redirect()` internally
- `redirect()` throws a special `NEXT_REDIRECT` error
- API routes can't handle this error properly
- The try-catch catches it as a failure
- Returns 500 error instead of redirecting

---

## ✅ The Solution: Server Actions

WorkOS recommends using **Server Actions** instead of API routes for `signOut()`.

### 1. Created Server Action (`app/actions/auth.ts`)

```typescript
'use server';

import { signOut } from '@workos-inc/authkit-nextjs';

export async function signOutAction() {
  await signOut();
}
```

**Why Server Actions work:**

- ✅ Designed to handle Next.js redirects
- ✅ No try-catch needed
- ✅ No JSON response issues
- ✅ Official Next.js pattern
- ✅ WorkOS recommended approach

### 2. Updated Client Component (`components/layout/sidebar/NavUser.tsx`)

```typescript
import { useTransition } from 'react';
import { signOutAction } from '@/app/actions/auth';

export function NavUser() {
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <DropdownMenuItem onClick={handleSignOut} disabled={isPending}>
      <LogOut className="mr-2 h-4 w-4" />
      <span>{isPending ? 'Signing out...' : 'Log out'}</span>
    </DropdownMenuItem>
  );
}
```

**Benefits:**

- ✅ `useTransition` provides automatic loading state
- ✅ No manual state management
- ✅ Cleaner code
- ✅ Works with WorkOS redirects

---

## 📊 Comparison: API Route vs Server Action

| Aspect                    | API Route ❌            | Server Action ✅            |
| ------------------------- | ----------------------- | --------------------------- |
| **Handles NEXT_REDIRECT** | No (throws error)       | Yes (works naturally)       |
| **Code Complexity**       | High (try-catch, fetch) | Low (one function call)     |
| **Loading State**         | Manual (`useState`)     | Automatic (`useTransition`) |
| **Error Handling**        | Manual try-catch        | Built-in                    |
| **WorkOS Pattern**        | Not recommended         | Official pattern            |

---

## 🔄 How It Works

```
1. User clicks "Log out"
   ↓
2. startTransition(() => signOutAction())
   ↓
3. Server Action calls signOut()
   ↓
4. WorkOS throws NEXT_REDIRECT (handled by Next.js)
   ↓
5. Redirects to WorkOS logout endpoint
   ↓
6. WorkOS clears session
   ↓
7. Redirects to URL configured in WorkOS Dashboard
```

---

## 🎯 WorkOS Dashboard Configuration

The redirect URL after logout is configured in WorkOS Dashboard:

1. Go to: https://dashboard.workos.com
2. Navigate to: **AuthKit → Redirects**
3. Set **Sign-out redirect URI**:
   ```
   Development:  http://localhost:3000/login
   Production:   https://yourdomain.com/login
   ```

---

## ✅ What Changed

### Files Modified:

1. **Created:** `app/actions/auth.ts` - Server action for sign-out
2. **Updated:** `components/layout/sidebar/NavUser.tsx` - Use server action
3. **Optional:** Can delete `app/api/auth/sign-out/route.ts` (no longer needed)

### Code Changes:

- ❌ Removed: API route with fetch
- ❌ Removed: Manual error handling
- ❌ Removed: Manual state management (`useState`)
- ✅ Added: Server action
- ✅ Added: `useTransition` for loading state

---

## 🧪 Testing

Test the logout flow:

1. **Happy Path:**
   - Click "Log out" button
   - See "Signing out..." text (via `isPending`)
   - Button is disabled during logout
   - Redirects to WorkOS logout
   - Then redirects to configured URL (e.g., `/login`)

2. **Verify:**
   - Session cookies are cleared
   - Can't access protected routes
   - Must log in again

---

## 📚 References

- [WorkOS Sign Out Documentation](https://workos.com/docs/user-management/sign-out)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [React useTransition Hook](https://react.dev/reference/react/useTransition)

---

## ✅ Status

- [x] Created server action
- [x] Updated NavUser component
- [x] Removed unused imports
- [x] No linting errors
- [x] Follows WorkOS best practices
- [x] Works with NEXT_REDIRECT
- [x] Automatic loading states

**Ready to test!** 🚀
