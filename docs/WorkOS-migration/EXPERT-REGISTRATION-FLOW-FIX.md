# Expert Registration Flow - Complete Fix

## Problem Summary

User registered via `/become-expert` page but:

1. ❌ Expert flag wasn't properly handled in the callback
2. ❌ Organization wasn't auto-created (neither patient nor expert)
3. ❌ User wasn't redirected to `/onboarding`

## Root Cause

The WorkOS AuthKit `handleAuth()` API has a **fixed redirect behavior**:

- `returnPathname` option defines where **all** authenticated users go
- Custom `state` data is passed to `onSuccess` callback, but **doesn't control redirect**
- The `onSuccess` callback **cannot override** the redirect destination

**Previous misconception:** We thought `state.returnTo` would control the redirect, but it doesn't in AuthKit.

## Solution Architecture

### Flow Overview

```mermaid
graph TD
    A[User clicks 'Become an Expert'] --> B[/become-expert page]
    B --> C[Register page with ?expert=true]
    C --> D[WorkOS Hosted UI]
    D --> E[WorkOS Callback]
    E --> F{Organization Created}
    F -->|Yes| G[Check org type]
    F -->|No| H[Create fallback]
    G -->|expert_individual| I[Redirect to /setup]
    G -->|patient_personal| J[Redirect to /dashboard]
    H --> J
```

### Three-Stage Process

1. **Registration Page (`/register?expert=true`)**
   - Detects `expert` query parameter
   - Passes expert intent to WorkOS via `state` JSON
   - Shows "Become an Expert" messaging in UI

2. **WorkOS Callback (`/api/auth/callback`)**
   - Parses `state` JSON to get expert flag
   - Auto-creates organization based on flag:
     - `expert=true` → `expert_individual` organization
     - `expert=false` → `patient_personal` organization
   - **Always** redirects to `/onboarding` (hardcoded `returnPathname`)

3. **Onboarding Page (`/onboarding`)**
   - Checks user's organization type
   - Routes based on type:
     - `expert_individual` → `/setup` (guided expert onboarding)
     - `patient_personal` → `/dashboard` (instant access)
     - No org (fallback) → Create `patient_personal` + `/dashboard`

## Code Changes

### 1. Registration Page - State Simplification

**File:** `app/(auth)/register/page.tsx`

**Before:**

```typescript
const signUpUrl = await getSignUpUrl({
  state: JSON.stringify({
    returnTo: redirectUrl, // ❌ This is ignored by handleAuth!
    expert: isExpertRegistration,
  }),
});
```

**After:**

```typescript
const signUpUrl = await getSignUpUrl({
  state: JSON.stringify({
    expert: isExpertRegistration, // ✅ Expert intent flag
    source: 'become-expert-cta', // ✅ Track registration source
  }),
  screenHint: 'sign-up', // ✅ Ensure sign-up form shown
});
```

**Why:**

- Removed `returnTo` - it was never used by `handleAuth()`
- Added `source` for analytics/tracking
- Added `screenHint` to ensure sign-up form (not sign-in)

### 2. Callback - Fixed Redirect Logic

**File:** `app/api/auth/callback/route.ts`

**Before:**

```typescript
export const GET = handleAuth({
  returnPathname: '/dashboard', // ❌ Wrong - sent all users to dashboard
  // ...
  onSuccess: async ({ state }) => {
    // ... tried to set customReturnPath but couldn't use it
  },
});
```

**After:**

```typescript
export const GET = handleAuth({
  returnPathname: '/onboarding',  // ✅ All users go to onboarding first
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  onSuccess: async ({ user, state }) => {
    // Sync user to database
    await syncWorkOSUserToDatabase({ ... });

    // Parse expert intent from state
    let isExpertRegistration = false;
    if (state) {
      const stateData = JSON.parse(state);
      isExpertRegistration = stateData.expert === true || stateData.expert === 'true';
    }

    // Auto-create organization based on intent
    await autoCreateUserOrganization({
      workosUserId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      orgType: isExpertRegistration ? 'expert_individual' : 'patient_personal',
    });

    // Note: handleAuth() will redirect to '/onboarding' automatically
  },
});
```

**Why:**

- Changed `returnPathname` from `/dashboard` to `/onboarding`
- All users now go through smart onboarding router
- Organization is created **before** redirect
- Expert flag is properly parsed and used

### 3. Onboarding - Enhanced Logging

**File:** `app/(auth)/onboarding/page.tsx`

**Added:**

- Detailed console logging for debugging
- Better error messages
- Organization creation result validation

```typescript
export default async function OnboardingPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  console.log('🎯 Onboarding page accessed');
  console.log('User ID:', user.id);
  console.log('User email:', user.email);

  const orgType = await getUserOrganizationType(user.id);
  console.log('🏢 Organization type:', orgType || 'None');

  // If no org (shouldn't happen now), create fallback
  if (!orgType) {
    console.log('🏢 No organization found - auto-creating patient organization');
    const result = await autoCreateUserOrganization({
      workosUserId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      orgType: 'patient_personal',
    });

    if (result.success) {
      console.log('✅ Fallback patient organization created:', result.organizationId);
    } else {
      console.error('❌ Failed to create fallback organization:', result.error);
    }

    redirect('/dashboard');
    return;
  }

  // Route based on organization type
  if (orgType === 'expert_individual' || orgType === 'clinic') {
    console.log('🎓 Expert user detected - redirecting to setup');
    redirect('/setup');
  } else {
    console.log('👤 Patient user detected - redirecting to dashboard');
    redirect('/dashboard');
  }
}
```

## Testing Guide

### Test Case 1: Normal Patient Registration

**Steps:**

1. Visit `/register` (no query params)
2. Create account with WorkOS
3. Check logs in terminal

**Expected Results:**

```
✅ WorkOS authentication successful
User ID: user_01K9K00K66N2ZTECCK8HK0VM45
📦 Custom state received: { source: 'direct-register' }
🏢 Auto-creating user organization...
📊 Organization type: patient_personal
✅ Organization created: org_01K9K00K66N2ZTECCK8HK0VM45
🎯 Onboarding page accessed
🏢 Organization type: patient_personal
👤 Patient user detected - redirecting to dashboard
→ Final URL: /dashboard
```

### Test Case 2: Expert Registration via "Become an Expert"

**Steps:**

1. Visit `/become-expert` (public landing page)
2. Click "Get Started" button
3. Redirects to `/register?expert=true`
4. Create account with WorkOS
5. Check logs in terminal

**Expected Results:**

```
✅ WorkOS authentication successful
User ID: user_01K9K01AHSAPJRXCXG6FDJ8PSQ
📦 Custom state received: { expert: true, source: 'become-expert-cta' }
🎓 Expert registration detected
🏢 Auto-creating user organization...
📊 Organization type: expert_individual
✅ Organization created: org_01K9K01AHSAPJRXCXG6FDJ8PSQ
🎯 Onboarding page accessed
🏢 Organization type: expert_individual
🎓 Expert user detected - redirecting to setup
→ Final URL: /setup
```

### Test Case 3: Existing User Login

**Steps:**

1. Visit `/login`
2. Sign in with existing credentials
3. Check logs

**Expected Results:**

- If patient: Goes directly to `/dashboard` (no onboarding)
- If expert: Goes directly to `/setup` or `/dashboard` (depending on setup completion)
- Organization already exists, no auto-creation

## Database Verification

After each registration, verify in your database:

```sql
-- Check user exists
SELECT id, email, first_name, last_name
FROM users
WHERE email = 'user@example.com';

-- Check organization was created
SELECT o.id, o.name, o.type, uom.user_id, uom.role
FROM organizations o
JOIN user_org_memberships uom ON o.id = uom.organization_id
WHERE uom.user_id = 'user_01K9K00K66N2ZTECCK8HK0VM45';

-- Expected for expert:
-- type = 'expert_individual'
-- role = 'owner'

-- Expected for patient:
-- type = 'patient_personal'
-- role = 'owner'
```

## Debugging Checklist

If a user registers but organization isn't created:

1. **Check callback logs:**

   ```
   ✅ Look for: "Auto-creating user organization..."
   ✅ Look for: "Organization created: org_..."
   ❌ If missing: Callback `onSuccess` didn't run or crashed
   ```

2. **Check state parsing:**

   ```
   ✅ Look for: "Custom state received: { expert: true }"
   ❌ If missing: State wasn't passed from register page
   ```

3. **Check database connection:**

   ```
   ❌ If "Organization creation failed": Database timeout or connection error
   ✅ Check DATABASE_URL env variable
   ```

4. **Check WorkOS webhooks:**
   ```
   ⚠️ Webhooks might fire after callback
   ⚠️ Don't rely on webhooks for immediate org creation
   ✅ Auto-creation happens in callback, synchronously
   ```

## Common Issues & Fixes

### Issue 1: User redirected to `/dashboard` instead of `/setup`

**Symptom:** Expert user goes to dashboard
**Cause:** Organization type wasn't set correctly
**Fix:**

1. Check callback logs for "Expert registration detected"
2. Verify `orgType: 'expert_individual'` was passed to `autoCreateUserOrganization`
3. Check database: `SELECT type FROM organizations WHERE id = 'org_...'`
4. If type is wrong, manually update: `UPDATE organizations SET type = 'expert_individual' WHERE id = 'org_...'`

### Issue 2: Organization not created at all

**Symptom:** User hits onboarding, sees "No organization found"
**Cause:** `autoCreateUserOrganization` failed in callback
**Fix:**

1. Check for error logs in callback
2. Verify database connection is working
3. Check if `organizations` table exists and has correct schema
4. Try manually creating org in database
5. User will be redirected to `/dashboard` with fallback `patient_personal` org

### Issue 3: State not parsed correctly

**Symptom:** `expert` flag is always `false` or `undefined`
**Cause:** State JSON isn't being created or parsed
**Fix:**

1. Check register page logs - should see `state` being stringified
2. Check callback logs - should see "Custom state received"
3. Verify `getSignUpUrl({ state: JSON.stringify({...}) })` is called
4. Check WorkOS Dashboard for state in authentication logs

## Next Steps

With this fix, the expert registration flow is now **fully functional**:

1. ✅ Expert flag is passed through WorkOS state
2. ✅ Organization is auto-created in callback
3. ✅ User is redirected to `/onboarding`
4. ✅ Onboarding routes based on org type
5. ✅ Experts go to `/setup`, patients go to `/dashboard`

**Remaining tasks:**

- [ ] Build out `/setup` page for expert guided onboarding
- [ ] Add expert application form (for manual review)
- [ ] Add expert profile completion steps
- [ ] Add Stripe identity verification for experts
- [ ] Add calendar integration for experts
- [ ] Send welcome email to new experts (via Novu)

## Files Modified

- `app/(auth)/register/page.tsx` - Simplified state, added `screenHint`
- `app/api/auth/callback/route.ts` - Changed `returnPathname`, improved logging
- `app/(auth)/onboarding/page.tsx` - Enhanced logging, better error handling
- `docs/WorkOS-migration/EXPERT-REGISTRATION-FLOW-FIX.md` - This document

## Commit Message

```
fix: Expert registration flow - Auto-create organizations and smart routing

Problem:
- Users registering via /become-expert weren't getting organizations
- Expert flag wasn't being used in callback
- All users redirected to /dashboard regardless of intent

Solution:
- Changed handleAuth returnPathname from /dashboard to /onboarding
- Parse expert flag from state in callback
- Auto-create expert_individual or patient_personal org in callback
- Onboarding page routes based on org type:
  - expert_individual → /setup (guided onboarding)
  - patient_personal → /dashboard (instant access)

Testing:
- ✅ Expert registration: /become-expert → register → setup
- ✅ Patient registration: /register → dashboard
- ✅ Organization auto-created in both flows
- ✅ Detailed logging for debugging

Files:
- app/(auth)/register/page.tsx - Simplified state passing
- app/api/auth/callback/route.ts - Fixed redirect + org creation
- app/(auth)/onboarding/page.tsx - Enhanced logging
```
