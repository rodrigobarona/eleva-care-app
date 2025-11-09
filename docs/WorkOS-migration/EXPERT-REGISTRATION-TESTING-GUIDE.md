# Expert Registration Flow - Testing Guide

## ✅ What Was Fixed

### Problem

User registered via `/become-expert` but:

1. ❌ Organization wasn't created
2. ❌ Expert flag wasn't used
3. ❌ User went to `/dashboard` instead of `/setup`

### Solution

- Changed `handleAuth returnPathname` from `/dashboard` to `/onboarding`
- Parse `expert` flag from state in callback
- Auto-create `expert_individual` or `patient_personal` organization
- `/onboarding` routes based on organization type

---

## 🧪 Testing Instructions

### Test 1: Normal Patient Registration

**Steps:**

1. Open incognito window
2. Navigate to `http://localhost:3000/register`
3. Create account (email + password or OAuth)
4. Complete email verification if needed
5. Wait for redirect

**Expected Flow:**

```
/register → WorkOS UI → /api/auth/callback → /onboarding → /dashboard
```

**Expected Terminal Logs:**

```bash
✅ WorkOS authentication successful
User ID: user_01K9...
User email: user@example.com
🏢 Auto-creating user organization...
📊 Organization type: patient_personal
✅ Organization created: org_01K9...
🎯 Onboarding page accessed
🏢 Organization type: patient_personal
👤 Patient user detected - redirecting to dashboard
```

**Expected Database State:**

- User exists in `users` table
- Organization exists with `type = 'patient_personal'`
- Membership exists with `role = 'owner'`

---

### Test 2: Expert Registration (Full Flow)

**Steps:**

1. Open incognito window
2. Navigate to `http://localhost:3000/become-expert`
3. Click "Get Started" button (redirects to `/register?expert=true`)
4. Create account (email + password or OAuth)
5. Complete email verification if needed
6. Wait for redirect

**Expected Flow:**

```
/become-expert → /register?expert=true → WorkOS UI →
/api/auth/callback → /onboarding → /setup
```

**Expected Terminal Logs:**

```bash
✅ WorkOS authentication successful
User ID: user_01K9...
User email: expert@example.com
📦 Custom state received: { expert: true, source: 'become-expert-cta' }
🎓 Expert registration detected
🏢 Auto-creating user organization...
📊 Organization type: expert_individual
✅ Organization created: org_01K9...
🎯 Onboarding page accessed
🏢 Organization type: expert_individual
🎓 Expert user detected - redirecting to setup
```

**Expected Database State:**

- User exists in `users` table
- Organization exists with `type = 'expert_individual'`
- Membership exists with `role = 'owner'`
- User should land on `/setup` page

---

### Test 3: Direct Expert Registration URL

**Steps:**

1. Open incognito window
2. Navigate directly to `http://localhost:3000/register?expert=true`
3. Create account
4. Complete verification
5. Wait for redirect

**Expected:**

- Same flow as Test 2
- Should go to `/setup` (not `/dashboard`)

---

### Test 4: Existing User Login

**Steps:**

1. Use credentials from Test 1 or Test 2
2. Navigate to `http://localhost:3000/login`
3. Sign in
4. Wait for redirect

**Expected for Patient:**

```
/login → WorkOS UI → /api/auth/callback → /dashboard
(Skips /onboarding because org already exists)
```

**Expected for Expert:**

```
/login → WorkOS UI → /api/auth/callback → /setup or /dashboard
(Depends on setup completion status)
```

---

## 🔍 Debugging Checklist

### 1. Check Terminal Logs

**Look for these key messages:**

✅ **User Authentication:**

```
✅ WorkOS authentication successful
User ID: user_01K9...
```

✅ **State Parsing (for expert registration):**

```
📦 Custom state received: { expert: true, source: 'become-expert-cta' }
🎓 Expert registration detected
```

✅ **Organization Creation:**

```
🏢 Auto-creating user organization...
📊 Organization type: expert_individual (or patient_personal)
✅ Organization created: org_01K9...
```

✅ **Onboarding Routing:**

```
🎯 Onboarding page accessed
🏢 Organization type: expert_individual
🎓 Expert user detected - redirecting to setup
```

### 2. Check Database

**Query 1: Verify User Exists**

```sql
SELECT
  id,
  email,
  first_name,
  last_name,
  workos_user_id
FROM users
WHERE email = 'your-test-email@example.com';
```

**Query 2: Verify Organization Exists**

```sql
SELECT
  o.id,
  o.name,
  o.type,
  o.workos_org_id,
  uom.user_id,
  uom.role
FROM organizations o
JOIN user_org_memberships uom ON o.id = uom.organization_id
WHERE uom.user_id = (
  SELECT id FROM users WHERE email = 'your-test-email@example.com'
);
```

**Expected Results for Expert:**

- `o.type` = `'expert_individual'`
- `uom.role` = `'owner'`

**Expected Results for Patient:**

- `o.type` = `'patient_personal'`
- `uom.role` = `'owner'`

### 3. Check WorkOS Dashboard

1. Go to https://dashboard.workos.com
2. Navigate to "Users" section
3. Find your test user
4. Check events:
   - `user.created`
   - `session.created`
5. Check "Organizations" section
6. Find auto-created organization
7. Verify membership

---

## ❌ Common Issues & Fixes

### Issue 1: User Created But No Organization

**Symptom:**

```
🏢 No organization found - auto-creating patient organization
```

**Possible Causes:**

1. Callback `autoCreateUserOrganization` failed
2. Database connection error
3. WorkOS API error

**Debug:**

1. Check terminal for error messages
2. Check database connection: `SELECT 1;`
3. Check WorkOS API key is valid

**Fix:**

- If database error: Check `DATABASE_URL` env variable
- If WorkOS error: Check `WORKOS_API_KEY` env variable
- If persistent: Try manually creating org in database

### Issue 2: Expert Goes to Dashboard Instead of Setup

**Symptom:**

- User registers with `?expert=true`
- Lands on `/dashboard` instead of `/setup`

**Possible Causes:**

1. State not passed correctly
2. Organization type set to `patient_personal` instead of `expert_individual`

**Debug:**

1. Check terminal logs for "Expert registration detected"
2. If missing, state wasn't parsed correctly
3. Check database: `SELECT type FROM organizations WHERE ...`

**Fix:**

```sql
-- Update organization type
UPDATE organizations
SET type = 'expert_individual'
WHERE id = 'org_01K9...';

-- Then reload the page
```

### Issue 3: Redirect Loop

**Symptom:**

- User keeps getting redirected between pages
- Never lands on final destination

**Possible Causes:**

1. `withAuth()` misconfiguration
2. Middleware redirect logic issue
3. Session not being set correctly

**Debug:**

1. Check browser console for errors
2. Check Network tab for redirect chain
3. Check cookies: `wos-session` should be set

**Fix:**

- Clear cookies and try again
- Check `proxy.ts` for redirect logic
- Verify AuthKit middleware is running

---

## 📊 Success Criteria

All these should be ✅ after testing:

### For Patient Registration:

- [ ] User created in database
- [ ] `patient_personal` organization created
- [ ] User is owner of organization
- [ ] User redirected to `/dashboard`
- [ ] Can access dashboard features

### For Expert Registration:

- [ ] User created in database
- [ ] `expert_individual` organization created
- [ ] User is owner of organization
- [ ] User redirected to `/setup`
- [ ] Expert setup wizard appears
- [ ] Can complete expert profile setup

### For Both:

- [ ] Email verification works
- [ ] OAuth (Google) works
- [ ] Session persists after refresh
- [ ] Logout works correctly
- [ ] Re-login works correctly

---

## 🚀 Next Steps

After verifying the flow works:

1. **Build Expert Setup Wizard (`/setup`)**
   - Multi-step form
   - Profile information
   - Services & rates
   - Calendar integration
   - Stripe Connect
   - Identity verification

2. **Add Expert Application Review**
   - Admin dashboard for reviewing applications
   - Approve/reject workflow
   - Email notifications (Novu)

3. **Polish UX**
   - Loading states
   - Error messages
   - Success toasts
   - Welcome emails

---

## 📝 Files Changed

- `app/(auth)/register/page.tsx` - Simplified state passing
- `app/api/auth/callback/route.ts` - Fixed returnPathname, org creation
- `app/(auth)/onboarding/page.tsx` - Enhanced logging
- `docs/WorkOS-migration/EXPERT-REGISTRATION-FLOW-FIX.md` - Implementation guide
- `docs/WorkOS-migration/EXPERT-REGISTRATION-TESTING-GUIDE.md` - This document

---

## 📞 Need Help?

If something isn't working:

1. Check terminal logs first
2. Check database state
3. Check WorkOS Dashboard
4. Review this guide's debugging section
5. Check implementation guide for technical details

**Common log locations:**

- Next.js dev server: Terminal where you ran `pnpm dev`
- WorkOS events: https://dashboard.workos.com/events
- Database logs: Neon dashboard (if using Neon)

**Key files to check:**

- `app/api/auth/callback/route.ts` - Organization creation
- `app/(auth)/onboarding/page.tsx` - Routing logic
- `lib/integrations/workos/auto-organization.ts` - Org utilities

---

## ✅ Commit

Changes have been committed and pushed:

**Commit:** `ec1dd8e1`
**Message:** "fix: Expert registration flow - Auto-create organizations and smart routing"
**Branch:** `clerk-workos`

You can now test the flow locally with `pnpm dev`! 🎉
