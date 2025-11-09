# Critical Fixes - Patient Registration & Database Pollution

## 🔴 **Problems Found**

### Issue 1: Profiles Created for ALL Users

**File:** `lib/integrations/workos/sync.ts`  
**Line:** 153 (OLD: called `syncUserProfileData` for all users)

**Problem:**

- `ProfilesTable` records were being created for **every** user during registration
- This table should **ONLY** contain public profiles for experts
- Patients don't need profiles - they only book appointments

**Impact:**

- Database bloat (unnecessary records)
- RLS confusion (profiles without proper org associations)
- Potential security issues (patient data in expert-only table)

**Fix:**

```typescript
// ❌ OLD: Sync profile for ALL users
await syncUserProfileData(userData);

// ✅ NEW: Do NOT create profiles here
// Profiles are ONLY created when:
// 1. User registers via /become-expert (expert_individual org)
// 2. User's expert application is approved
```

---

### Issue 2: Expert Setup Created for ALL Users

**File:** `app/(private)/dashboard/page.tsx`  
**Line:** 29 (OLD: called `checkExpertSetupStatus()` for all users)

**Problem:**

- Dashboard called `checkExpertSetupStatus()` for **every** user
- This function auto-creates `ExpertSetupTable` records if they don't exist
- Patients don't need setup tracking - they're not experts

**Impact:**

- Database bloat (unnecessary expert_setup records)
- Confusing UI (setup banners for non-experts)
- Incorrect business logic (patients appearing as incomplete experts)

**Fix:**

```typescript
// ❌ OLD: Check setup for ALL users (auto-creates record)
const [isExpert, setupData, profile] = await Promise.all([
  isUserExpert(user.id),
  checkExpertSetupStatus(), // 🚨 BUG! Creates record for patients
  // ...
]);

// ✅ NEW: Only check setup for experts
const [isExpert, profile] = await Promise.all([/*...*/]);

if (isExpert) {
  setupData = await checkExpertSetupStatus(); // ✅ Only for experts
}
```

---

### Issue 3: Organization Creation Failures Not Logged

**File:** `app/api/auth/callback/route.ts`  
**Line:** 92-116 (OLD: errors wrapped in try/catch and silently ignored)

**Problem:**

- `autoCreateUserOrganization()` failures were caught but not properly logged
- Users would be stuck on `/onboarding` page with no clear error
- WorkOS was creating empty organizations (no members)

**Impact:**

- Users stuck in infinite loop on `/onboarding`
- Orphaned organizations in WorkOS (created but not linked to users)
- No way to debug why organization creation failed

**Fix:**

```typescript
// ✅ NEW: Better error logging
const orgResult = await autoCreateUserOrganization({
  /*...*/
});

if (orgResult.success) {
  console.log(`✅ Organization created: ${orgResult.organizationId}`);
  console.log(`🔗 Internal org ID: ${orgResult.internalOrgId}`);
} else {
  console.error('❌ CRITICAL: Organization creation failed!');
  console.error('Error:', orgResult.error);
  console.error('User will be stuck on /onboarding page');
}
```

---

## 📊 **Test Data Cleanup Required**

Your test user `rbarona+basic-user@gmail.com` created incorrect records:

### WorkOS (https://dashboard.workos.com)

```
❌ User: user_01K9K0RTE1Q62KRWNDEWD6W5GR
   Email: rbarona+basic-user@gmail.com

❌ Organizations (NO MEMBERS - orphaned):
   - org_01K9K0SB208GH1Q2NRX0Y9VXYW (Basic user's Account)
   - org_01K9K0SA2XG4S85FJE4CW86B0G (Basic user's Account)
```

### Database

```sql
-- ✅ CORRECT: User record
SELECT * FROM users
WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR';

-- ❌ INCORRECT: Profile (shouldn't exist for patients)
SELECT * FROM profiles
WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR';

-- ❌ INCORRECT: Expert setup (shouldn't exist for patients)
SELECT * FROM expert_setup
WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR';

-- ❌ MISSING: Organization membership (should exist but doesn't)
SELECT * FROM user_org_memberships
WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR';
```

---

## 🧹 **Cleanup Script**

```sql
-- 1. Delete incorrect profile record
DELETE FROM profiles
WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR';

-- 2. Delete incorrect expert_setup record
DELETE FROM expert_setup
WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR';

-- 3. Delete the test user (will cascade)
DELETE FROM users
WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR';
```

### WorkOS Cleanup (via Dashboard)

1. Go to https://dashboard.workos.com
2. Navigate to "Users" → Find `rbarona+basic-user@gmail.com`
3. Delete user (will cascade to sessions)
4. Navigate to "Organizations"
5. Delete both empty organizations:
   - `org_01K9K0SB208GH1Q2NRX0Y9VXYW`
   - `org_01K9K0SA2XG4S85FJE4CW86B0G`

---

## ✅ **Testing Guide (After Fixes)**

### Test 1: Normal Patient Registration

**Steps:**

1. Visit `http://localhost:3000/register`
2. Register with new email (e.g., `patient@test.com`)
3. Complete email verification
4. Check terminal logs
5. Check database

**Expected Terminal Logs:**

```bash
✅ WorkOS authentication successful
User ID: user_01K9...
Email: patient@test.com
🏢 Auto-creating user organization...
🚀 Creating WorkOS organization: patient@test.com's Account
✅ WorkOS organization created: org_01K9...
✅ Organization synced to database: patient@test.com's Account
👤 Creating WorkOS membership for user: patient@test.com
✅ WorkOS membership created: om_01K9...
✅ Membership synced to database
🎉 Auto-organization complete for: patient@test.com
🎯 Onboarding page accessed
🏢 Organization type: patient_personal
👤 Patient user detected - redirecting to dashboard
```

**Expected Database Records:**

```sql
-- ✅ User exists
SELECT * FROM users WHERE email = 'patient@test.com';

-- ✅ Organization exists with correct type
SELECT o.*, uom.*
FROM organizations o
JOIN user_org_memberships uom ON o.id = uom.organization_id
WHERE uom.workos_user_id = 'user_01K9...';
-- Expected: type = 'patient_personal', role = 'owner'

-- ❌ Profile should NOT exist
SELECT * FROM profiles WHERE workos_user_id = 'user_01K9...';
-- Expected: 0 rows

-- ❌ Expert setup should NOT exist
SELECT * FROM expert_setup WHERE workos_user_id = 'user_01K9...';
-- Expected: 0 rows
```

**Expected Final State:**

- User lands on `/dashboard`
- No setup banners or expert UI
- Can browse and book appointments

---

### Test 2: Expert Registration

**Steps:**

1. Visit `http://localhost:3000/become-expert`
2. Click "Get Started"
3. Register with new email (e.g., `expert@test.com`)
4. Complete email verification
5. Check terminal logs
6. Check database

**Expected Terminal Logs:**

```bash
✅ WorkOS authentication successful
User ID: user_01K9...
Email: expert@test.com
📦 Custom state received: { expert: true, source: 'become-expert-cta' }
🎓 Expert registration detected
🏢 Auto-creating user organization...
🚀 Creating WorkOS organization: expert@test.com's Practice
✅ WorkOS organization created: org_01K9...
📊 Organization type: expert_individual
✅ Membership synced to database
🎉 Auto-organization complete for: expert@test.com
🎯 Onboarding page accessed
🏢 Organization type: expert_individual
🎓 Expert user detected - redirecting to setup
```

**Expected Database Records:**

```sql
-- ✅ User exists
SELECT * FROM users WHERE email = 'expert@test.com';

-- ✅ Organization exists with correct type
SELECT o.*, uom.*
FROM organizations o
JOIN user_org_memberships uom ON o.id = uom.organization_id
WHERE uom.workos_user_id = 'user_01K9...';
-- Expected: type = 'expert_individual', role = 'owner'

-- ⏳ Profile WILL be created when user completes setup
SELECT * FROM profiles WHERE workos_user_id = 'user_01K9...';
-- Expected: 0 rows initially, created during /setup flow

-- ⏳ Expert setup WILL be created when user lands on /setup
SELECT * FROM expert_setup WHERE workos_user_id = 'user_01K9...';
-- Expected: Created by checkExpertSetupStatus() on /setup page
```

**Expected Final State:**

- User lands on `/setup` (expert onboarding wizard)
- Setup wizard creates `expert_setup` record
- Profile created when user fills out profile form

---

## 🔍 **Root Cause Analysis**

### Why This Happened

1. **Legacy Code from Clerk Migration**
   - Old Clerk logic created profiles for all users
   - During WorkOS migration, this logic was copied
   - No one questioned if it was needed

2. **Dashboard Eager Loading**
   - Dashboard tried to be "smart" by pre-loading setup status
   - `Promise.all()` called `checkExpertSetupStatus()` for everyone
   - Function auto-created records as a "convenience"

3. **Poor Error Boundaries**
   - Organization creation failures were swallowed
   - No clear separation between critical vs non-critical errors
   - Users got stuck with no clear feedback

### Lessons Learned

1. **Don't Auto-Create Records**
   - Only create records when explicitly needed
   - Use database constraints to enforce business rules
   - Log when records are created and why

2. **Separate Concerns**
   - Patient logic ≠ Expert logic
   - Don't mix them in shared functions
   - Use conditional logic based on role/type

3. **Fail Loudly for Critical Errors**
   - Organization creation is CRITICAL
   - Don't swallow errors - log them prominently
   - Give users clear feedback when things fail

---

## 📝 **Files Changed**

| File                               | Changes                                     | Impact                                      |
| ---------------------------------- | ------------------------------------------- | ------------------------------------------- |
| `lib/integrations/workos/sync.ts`  | Removed `syncUserProfileData` call          | Prevents profile creation for patients      |
| `app/(private)/dashboard/page.tsx` | Made `checkExpertSetupStatus()` conditional | Prevents expert_setup creation for patients |
| `app/api/auth/callback/route.ts`   | Enhanced error logging                      | Better debugging for org creation failures  |

---

## ✅ **Commit**

```bash
# Stage changes
git add app/(private)/dashboard/page.tsx \
        lib/integrations/workos/sync.ts \
        app/api/auth/callback/route.ts \
        docs/WorkOS-migration/CRITICAL-FIXES-DATABASE-POLLUTION.md

# Commit
git commit -m "fix: Prevent profile/expert_setup creation for non-experts

Problem:
- Profiles were created for ALL users (should only be experts)
- Expert setup records created for ALL users (should only be experts)
- Organization creation failures not properly logged

Solution:
- Remove syncUserProfileData from user sync (only create for experts)
- Make checkExpertSetupStatus conditional on isExpert
- Add detailed error logging for org creation failures

Impact:
- Prevents database bloat (unnecessary profiles/setup records)
- Prevents confusing UI (setup banners for patients)
- Better debugging (clear error messages)

Testing:
- Patient registration: No profile, no expert_setup
- Expert registration: Profile/setup created during onboarding
- Organization failures: Clear error logs

Files:
- lib/integrations/workos/sync.ts - Removed profile sync
- app/(private)/dashboard/page.tsx - Conditional setup check
- app/api/auth/callback/route.ts - Enhanced logging
- docs/.../CRITICAL-FIXES-DATABASE-POLLUTION.md - This doc"

# Push
git push origin clerk-workos
```

---

## 🚀 **Next Steps**

1. **Clean up test data**
   - Run SQL cleanup script
   - Delete users/orgs in WorkOS Dashboard

2. **Test patient registration**
   - Register new patient user
   - Verify no profile/expert_setup records
   - Verify organization created successfully

3. **Test expert registration**
   - Register via /become-expert
   - Verify redirected to /setup
   - Verify profile/setup created during onboarding

4. **Monitor production**
   - Watch for org creation failures
   - Check audit logs for profile creations
   - Verify RLS policies working correctly
