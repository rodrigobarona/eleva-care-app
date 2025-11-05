# Phase 3 RLS Policies Guide

**Date**: November 5, 2025  
**Status**: ✅ Applied and Active  
**Tables**: `expert_setup`, `user_preferences`  
**Approach**: Standard (SET LOCAL + app.current_user_id())

---

## Overview

Row-Level Security (RLS) policies have been **successfully applied** to the two new Phase 3 tables using the **Standard Approach** (not Neon Auth). Data isolation and security are now active at the database level.

---

## Security Model

### Data Isolation Strategy

Both `expert_setup` and `user_preferences` tables use **user-scoped RLS**:

```
Users can ONLY access their own records
WHERE workos_user_id = app.current_user_id()
```

**How it works**:

1. Application authenticates user with WorkOS
2. Application sets context: `SET LOCAL app.user_id = 'user_xxx'`
3. RLS policies use `app.current_user_id()` to read context
4. Database automatically filters queries to user's data only

**Benefits**:

- ✅ Prevents data leaks between users
- ✅ Enforced at database level (even if app code has bugs)
- ✅ Uses production-tested Standard Approach (`SET LOCAL`)
- ✅ No dependency on beta features (Neon Auth)

---

## RLS Policies Created

### Expert Setup Table (4 Policies)

| Policy Name                         | Operation | Rule                              |
| ----------------------------------- | --------- | --------------------------------- |
| `Users can view own expert setup`   | SELECT    | `workos_user_id = auth.user_id()` |
| `Users can create own expert setup` | INSERT    | `workos_user_id = auth.user_id()` |
| `Users can update own expert setup` | UPDATE    | `workos_user_id = auth.user_id()` |
| `Users can delete own expert setup` | DELETE    | `workos_user_id = auth.user_id()` |

### User Preferences Table (4 Policies)

| Policy Name                        | Operation | Rule                              |
| ---------------------------------- | --------- | --------------------------------- |
| `Users can view own preferences`   | SELECT    | `workos_user_id = auth.user_id()` |
| `Users can create own preferences` | INSERT    | `workos_user_id = auth.user_id()` |
| `Users can update own preferences` | UPDATE    | `workos_user_id = auth.user_id()` |
| `Users can delete own preferences` | DELETE    | `workos_user_id = auth.user_id()` |

**Total**: 8 policies across 2 tables

---

## Application Status

### ✅ APPLIED - November 5, 2025

**Completed Steps**:

1. ✅ Phase 3 tables created (`expert_setup`, `user_preferences`)
2. ✅ Standard RLS approach decided (no Neon Auth dependency)
3. ✅ Helper functions exist (`app.current_user_id()` from 001_enable_rls_standard.sql)
4. ✅ RLS policies applied via `scripts/apply-phase3-rls.ts`
5. ✅ Verification successful - 8 policies active

**Why Standard Approach?**:

- More portable (works with any Postgres)
- Production-tested (used by GitHub, Linear, Notion)
- Better control over context setting
- No dependency on Neon Auth beta features

---

## How It Was Applied

### Step 1: Updated RLS Migration File

Updated `drizzle/migrations-manual/002_phase3_enable_rls.sql` to use:

- `app.current_user_id()` instead of `auth.user_id()`
- Standard `SET LOCAL` approach
- No dependency on Neon Auth

### Step 2: Applied RLS Policies

```bash
# From project root
pnpm tsx scripts/apply-phase3-rls.ts
```

**Result**:

```
✅ RLS enabled on expert_setup and user_preferences
✅ Created 4 policies for expert_setup
✅ Created 4 policies for user_preferences
✅ Total: 8 policies active
```

### Step 3: Verified Policies

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('expert_setup', 'user_preferences');

-- Expected:
-- tablename         | rowsecurity
-- -----------------+-------------
-- expert_setup     | t (true)
-- user_preferences | t (true)

-- Check policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('expert_setup', 'user_preferences')
ORDER BY tablename, policyname;

-- Expected: 8 policies (4 per table)
```

### Step 4: Test RLS Enforcement

```sql
-- Set test user context (must be in transaction)
BEGIN;
SET LOCAL app.user_id = 'user_01K8QT17KX25XPHVQ4H1K0HTR7';

-- Try to select preferences (should only see own record)
SELECT * FROM user_preferences;

-- Try to insert own record (should succeed)
INSERT INTO user_preferences (workos_user_id, org_id)
VALUES ('user_01K8QT17KX25XPHVQ4H1K0HTR7', 'some-org-id');

-- Try to insert someone else's record (should fail - 0 rows affected)
INSERT INTO user_preferences (workos_user_id, org_id)
VALUES ('user_DIFFERENT_USER', 'some-org-id');
-- Expected: 0 rows inserted (RLS WITH CHECK prevents it)

ROLLBACK;  -- Clean up test data
```

---

## Security Benefits

### Before RLS (Current State)

```typescript
// Application code must enforce access control
const prefs = await db.query.UserPreferencesTable.findMany();
// ❌ Returns ALL users' preferences! Security bug!
```

### After RLS (Phase 6+)

```typescript
// Database automatically filters by authenticated user
const prefs = await db.query.UserPreferencesTable.findMany();
// ✅ Only returns current user's preferences, even if we forget to filter!
```

**Protection Against**:

- ❌ SQL injection attacks
- ❌ Application logic bugs
- ❌ Forgotten WHERE clauses
- ❌ Malicious API queries

---

## Performance Impact

### Query Performance

RLS policies use existing indexes:

- `expert_setup_user_id_idx` on `workos_user_id`
- `user_preferences_user_id_idx` on `workos_user_id`

**Expected performance**: <10ms per query (similar to manual WHERE clause)

### Query Plan Example

```sql
EXPLAIN ANALYZE
SELECT * FROM user_preferences
WHERE workos_user_id = auth.user_id();

-- Expected plan:
-- Index Scan using user_preferences_user_id_idx
-- Planning Time: 0.1ms
-- Execution Time: 2.5ms
```

---

## Admin Access (Future)

Admin policies are commented out in the SQL file and can be enabled when needed:

```sql
-- Uncomment to enable admin access
CREATE POLICY "Admins can view all expert setups"
  ON expert_setup
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.workos_user_id = auth.user_id()
      AND users.role IN ('admin', 'superadmin')
    )
  );
```

**Considerations**:

- Adds subquery to every SELECT
- May impact performance at scale
- Consider separate admin views instead
- Test thoroughly before enabling

---

## Organization-Scoped Access (Future B2B)

Policies for multi-member organizations are also prepared:

```sql
-- Allow org members to view each other's data
CREATE POLICY "Org members can view member preferences"
  ON user_preferences
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_org_memberships
      WHERE workos_user_id = auth.user_id()
    )
  );
```

**When to enable**:

- Expanding to multi-member organizations
- B2B features requiring shared data access
- Team-based expert groups

---

## Rollback Plan

If RLS causes issues, you can temporarily disable it:

```sql
-- Disable RLS (NOT RECOMMENDED for production)
ALTER TABLE expert_setup DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;

-- To re-enable:
ALTER TABLE expert_setup ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
```

**⚠️ Warning**: Disabling RLS removes security protection. Only do this for debugging, never in production.

---

## Monitoring RLS

### Check Policy Usage

```sql
-- View policy statistics
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('expert_setup', 'user_preferences');
```

### Monitor Performance

```sql
-- Check slow queries with RLS
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%expert_setup%'
   OR query LIKE '%user_preferences%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Comparison with Other Tables

### Existing RLS Tables (from Phase 1-2)

| Table           | RLS Status | Policy Type             |
| --------------- | ---------- | ----------------------- |
| `organizations` | ✅ Enabled | Org-scoped              |
| `users`         | ✅ Enabled | User-scoped             |
| `events`        | ✅ Enabled | Org-scoped              |
| `meetings`      | ✅ Enabled | Expert + Guest access   |
| `profiles`      | ✅ Enabled | User-scoped             |
| `audit_logs`    | ✅ Enabled | Org-scoped, append-only |

### New RLS Tables (Phase 3)

| Table              | RLS Status | Policy Type |
| ------------------ | ---------- | ----------- |
| `expert_setup`     | ⏳ Pending | User-scoped |
| `user_preferences` | ⏳ Pending | User-scoped |

**Consistency**: All tables follow the same RLS pattern for uniform security.

---

## Documentation

- **RLS SQL Script**: `drizzle/migrations-manual/002_phase3_enable_rls.sql`
- **Schema Documentation**: `drizzle/schema-workos.ts` (RLS comments)
- **Neon Auth Setup**: `docs/WorkOS-migration/reference/neon-auth-rls.md`
- **Phase 6 Plan**: `.cursor/plans/clerk-to-workos-migration-7ad57dce.plan.md`

---

## Testing Checklist

Before deploying to production:

- [ ] Verify `auth.user_id()` function works
- [ ] Apply RLS policies without errors
- [ ] Test SELECT returns only own records
- [ ] Test INSERT allows own records only
- [ ] Test INSERT rejects other users' records
- [ ] Test UPDATE works for own records
- [ ] Test UPDATE fails for other users' records
- [ ] Test DELETE works for own records
- [ ] Test DELETE fails for other users' records
- [ ] Verify query performance <10ms
- [ ] Test with multiple users simultaneously
- [ ] Monitor for any unexpected errors

---

## Summary

- ✅ **RLS policies created** for Phase 3 tables
- ✅ **Security model defined** (user-scoped access)
- ✅ **Schema documented** with RLS comments
- ⏳ **Application pending** until Phase 6
- ✅ **Future-proof** for admin and org access
- ✅ **Performance optimized** with indexes
- ✅ **Rollback plan** available if needed

**Next**: Apply in Phase 6 after Neon Auth configuration!

---

**Created**: November 5, 2025  
**Status**: Ready for Phase 6 deployment  
**File**: `drizzle/migrations-manual/002_phase3_enable_rls.sql`
