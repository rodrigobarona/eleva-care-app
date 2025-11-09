# Database Cleanup Script for Test Data

## 📋 **Overview**

This script cleans up incorrect test data created before the critical fixes.

**Test User:** `rbarona+basic-user@gmail.com`  
**WorkOS User ID:** `user_01K9K0RTE1Q62KRWNDEWD6W5GR`

---

## 🧹 **SQL Cleanup Script**

```sql
-- ============================================================================
-- DATABASE CLEANUP: Remove incorrect records for test user
-- ============================================================================
-- User: rbarona+basic-user@gmail.com
-- WorkOS ID: user_01K9K0RTE1Q62KRWNDEWD6W5GR
-- ============================================================================

-- 1. Delete incorrect profile record (patients shouldn't have profiles)
DELETE FROM profiles
WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR';
-- Expected: 1 row deleted

-- 2. Delete incorrect expert_setup record (patients shouldn't have setup)
DELETE FROM expert_setup
WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR';
-- Expected: 1 row deleted

-- 3. Delete any user_org_memberships (if they exist)
DELETE FROM user_org_memberships
WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR';
-- Expected: 0 rows deleted (none were created due to org creation failure)

-- 4. Delete the test user (final cleanup)
DELETE FROM users
WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR';
-- Expected: 1 row deleted

-- 5. Verify cleanup
SELECT 'Cleanup complete' AS status;

-- 6. Count remaining orphaned records
SELECT
  (SELECT COUNT(*) FROM profiles WHERE workos_user_id NOT IN (SELECT workos_user_id FROM users)) AS orphaned_profiles,
  (SELECT COUNT(*) FROM expert_setup WHERE workos_user_id NOT IN (SELECT workos_user_id FROM users)) AS orphaned_expert_setup;
```

---

## 🔧 **WorkOS Dashboard Cleanup**

### Step 1: Delete Test User

1. Go to https://dashboard.workos.com
2. Navigate to **"User Management"** → **"Users"**
3. Search for: `rbarona+basic-user@gmail.com`
4. Click on the user
5. Click **"Delete User"**
6. Confirm deletion

**This will cascade delete:**

- All sessions for this user
- All authentication events

---

### Step 2: Delete Orphaned Organizations

Two organizations were created but never linked to the user:

**Organization 1:**

- ID: `org_01K9K0SB208GH1Q2NRX0Y9VXYW`
- Name: "Basic user's Account"
- Members: 0 (empty)

**Organization 2:**

- ID: `org_01K9K0SA2XG4S85FJE4CW86B0G`
- Name: "Basic user's Account"
- Members: 0 (empty)

**Steps:**

1. Navigate to **"Organizations"**
2. Search for: "Basic user's Account"
3. For each organization:
   - Click on the organization
   - Verify **Members: 0**
   - Click **"Delete Organization"**
   - Confirm deletion

---

## ✅ **Verification**

After cleanup, verify everything is clean:

### Database Verification

```sql
-- Should return 0 rows for all queries
SELECT * FROM profiles WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR';
SELECT * FROM expert_setup WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR';
SELECT * FROM user_org_memberships WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR';
SELECT * FROM users WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR';
```

### WorkOS Dashboard Verification

1. Search for `rbarona+basic-user@gmail.com` → Should return **0 results**
2. Search for `org_01K9K0SB208GH1Q2NRX0Y9VXYW` → Should return **0 results**
3. Search for `org_01K9K0SA2XG4S85FJE4CW86B0G` → Should return **0 results**

---

## 🔄 **Optional: Clean Up ALL Orphaned Records**

If you want to clean up orphaned records for other test users:

```sql
-- Find all profiles without corresponding users
SELECT p.*
FROM profiles p
LEFT JOIN users u ON p.workos_user_id = u.workos_user_id
WHERE u.workos_user_id IS NULL;

-- Find all expert_setup without corresponding users
SELECT es.*
FROM expert_setup es
LEFT JOIN users u ON es.workos_user_id = u.workos_user_id
WHERE u.workos_user_id IS NULL;

-- Delete orphaned profiles
DELETE FROM profiles
WHERE workos_user_id NOT IN (SELECT workos_user_id FROM users);

-- Delete orphaned expert_setup
DELETE FROM expert_setup
WHERE workos_user_id NOT IN (SELECT workos_user_id FROM users);
```

---

## 📊 **Audit Log**

If you want to keep a record of what was deleted:

```sql
-- Before deletion, export to a temp table
CREATE TEMP TABLE deleted_records AS
SELECT
  'user' AS record_type,
  workos_user_id,
  email,
  created_at,
  NOW() AS deleted_at
FROM users
WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR'

UNION ALL

SELECT
  'profile' AS record_type,
  workos_user_id,
  first_name || ' ' || last_name AS email,
  created_at,
  NOW() AS deleted_at
FROM profiles
WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR'

UNION ALL

SELECT
  'expert_setup' AS record_type,
  workos_user_id,
  NULL AS email,
  created_at,
  NOW() AS deleted_at
FROM expert_setup
WHERE workos_user_id = 'user_01K9K0RTE1Q62KRWNDEWD6W5GR';

-- View the audit log
SELECT * FROM deleted_records;

-- Export to CSV (optional)
\copy deleted_records TO '/tmp/deleted_records.csv' WITH CSV HEADER;
```

---

## ⚠️ **Important Notes**

1. **Backup First**
   - Always create a database backup before running cleanup scripts
   - In Neon: Dashboard → Backups → Create Manual Backup

2. **Test in Development**
   - Run this script in your dev database first
   - Verify the cleanup works as expected
   - Then run in production

3. **Cascading Deletes**
   - WorkOS: Deleting a user cascades to sessions/events
   - Database: Check foreign key constraints before deleting

4. **RLS Policies**
   - These scripts may be affected by RLS policies
   - Run as a database admin or disable RLS temporarily:
     ```sql
     SET ROLE TO 'postgres'; -- or your admin role
     -- Run cleanup scripts
     RESET ROLE;
     ```

---

## ✅ **After Cleanup**

Once cleanup is complete:

1. **Test new registration**
   - Register a new patient user
   - Verify no profile/expert_setup created
   - Verify organization created successfully

2. **Test expert registration**
   - Register via `/become-expert`
   - Verify expert_individual organization created
   - Verify profile/setup created during onboarding

3. **Monitor logs**
   - Check for organization creation errors
   - Verify profile/setup only created for experts

---

## 📝 **Files Modified**

This cleanup corresponds to fixes in:

- `lib/integrations/workos/sync.ts` - Removed profile sync
- `app/(private)/dashboard/page.tsx` - Conditional setup check
- `app/api/auth/callback/route.ts` - Enhanced error logging

**Commit:** `8de3c909`  
**Branch:** `clerk-workos`
