# WorkOS Widgets Scope Fix

**Date:** November 9, 2025
**Issue:** TypeScript compilation error with WorkOS widget scopes
**Status:** ✅ Fixed

## Problem

TypeScript build was failing with the following error:

```
Type error: Type '"widgets:users-table:read"' is not assignable to type 'WidgetScope'.
Did you mean '"widgets:users-table:manage"'?
```

The error occurred in `app/(private)/dashboard/widgets-kitchen-sink/page.tsx` at line 47.

## Root Cause

According to the WorkOS Node SDK type definitions (`@workos-inc/node@7.72.1`), the `WidgetScope` type only supports three specific scopes:

```typescript
type WidgetScope =
  | 'widgets:users-table:manage'
  | 'widgets:sso:manage'
  | 'widgets:domain-verification:manage';
```

The scope `'widgets:users-table:read'` does **not exist** in the WorkOS SDK. This was a misunderstanding of the available widget scopes.

## Solution

### Changes Made

1. **Updated widget token generation** in `page.tsx`:
   - Changed all references from `'widgets:users-table:read'` to `'widgets:users-table:manage'`
   - Added proper TypeScript types for `Widget` interface
   - Fixed return type handling - `workos.widgets.getToken()` returns `Promise<string>` directly, not an object with a `token` property

2. **Updated `WidgetShowcase.tsx`**:
   - Changed `authToken` prop to return `Promise<string>` instead of `string`
   - Updated from `authToken: () => widget.token` to `authToken: async () => widget.token`
   - Updated implementation examples to reflect correct async signature

3. **Fixed unrelated script error** in `scripts/utilities/cleanup-broken-organizations.ts`:
   - Removed reference to non-existent `membership.organization?.name` property

## Key Insights from WorkOS Documentation

From the Context7 WorkOS documentation:

1. **Widget Token Generation:**

   ```typescript
   const widgetToken = await workos.widgets.getToken({
     organizationId: 'org_12345',
     userId: 'user_12345',
     scopes: [
       'widgets:users-table:manage',
       'widgets:sso:manage',
       'widgets:domain-verification:manage',
     ],
   });
   ```

2. **Available Widget Scopes:**
   - `widgets:users-table:manage` - For user-related widgets (UserProfile, UserSecurity, UserSessions, ApiKeys, UsersManagement)
   - `widgets:sso:manage` - For SSO configuration widget
   - `widgets:domain-verification:manage` - For domain verification widget

3. **Important:** The "manage" scope doesn't necessarily mean users can perform destructive actions - each widget internally controls what permissions it grants based on the user's role and context.

## Widget Scope Mapping

| Widget                        | Required Scope                       | Description                         |
| ----------------------------- | ------------------------------------ | ----------------------------------- |
| UsersManagement               | `widgets:users-table:manage`         | Full user management for org admins |
| UserProfile                   | `widgets:users-table:manage`         | View/edit own profile               |
| UserSecurity                  | `widgets:users-table:manage`         | Manage password and MFA             |
| UserSessions                  | `widgets:users-table:manage`         | View/revoke sessions                |
| ApiKeys                       | `widgets:users-table:manage`         | Manage API keys                     |
| AdminPortalDomainVerification | `widgets:domain-verification:manage` | Verify domains for SSO              |
| AdminPortalSsoConnection      | `widgets:sso:manage`                 | Configure SSO connections           |

## Files Changed

1. `app/(private)/dashboard/widgets-kitchen-sink/page.tsx`
   - Updated scope references
   - Added Widget interface definition
   - Fixed token handling

2. `app/(private)/dashboard/widgets-kitchen-sink/WidgetShowcase.tsx`
   - Updated `authToken` to async function
   - Updated implementation examples

3. `scripts/utilities/cleanup-broken-organizations.ts`
   - Fixed organization name reference

## Verification

Build now completes successfully:

```bash
✓ Compiled successfully in 10.6s
   Running TypeScript ...
   Collecting page data ...
✅ Build completed successfully
```

## References

- WorkOS Node SDK: `@workos-inc/node@7.72.1`
- Type definition: `node_modules/@workos-inc/node/lib/widgets/interfaces/get-token.d.ts`
- WorkOS Documentation: https://workos.com/docs/widgets/tokens
- Context7 WorkOS Docs: `/workos/workos-node`

## Lessons Learned

1. **Always check SDK type definitions** - The WorkOS SDK has strict TypeScript types that prevent invalid scopes
2. **Read scope semantics carefully** - "manage" doesn't always mean destructive operations
3. **Widget-level permissions** - Individual widgets control their own permission logic based on user context
4. **Async requirements** - WorkOS widgets expect `authToken` to be an async function returning `Promise<string>`
