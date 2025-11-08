# RLS Missing Tables Analysis

**Date:** 2025-11-08  
**Status:** ⚠️ CRITICAL - Multiple tables lack RLS protection

## Executive Summary

Seven tables in the database currently lack Row-Level Security (RLS) policies, creating a significant security gap. These tables store sensitive financial, application, and user data that must be protected at the database level.

## Missing RLS Tables

### 1. **`annual_plan_eligibility`** (Created: Migration 0013)

- **Data Sensitivity:** Medium - Financial metrics and eligibility status
- **Contains:** Commission totals, revenue averages, eligibility calculations
- **Current Status:** ❌ No RLS enabled
- **Risk:** Users could view other users' financial metrics

### 2. **`blocked_dates`** (Created: Migration 0004)

- **Data Sensitivity:** Low - Schedule availability
- **Contains:** Expert unavailable dates
- **Current Status:** ❌ No RLS enabled
- **Risk:** Users could view/modify other experts' schedules

### 3. **`expert_applications`** (Created: Migration 0016 - NEW)

- **Data Sensitivity:** High - PII and application data
- **Contains:** Credentials, experience, resume URLs, review notes
- **Current Status:** ❌ No RLS enabled
- **Risk:** Users could view other applicants' sensitive information

### 4. **`roles`** (Created: Migration 0006)

- **Data Sensitivity:** High - Authorization data
- **Contains:** User roles for RBAC
- **Current Status:** ❌ No RLS enabled
- **Risk:** Users could view/modify role assignments

### 5. **`slot_reservations`** (Created: Migration 0004)

- **Data Sensitivity:** Medium - Temporary booking data
- **Contains:** Payment intents, guest emails, reservation times
- **Current Status:** ❌ No RLS enabled
- **Risk:** Users could view/manipulate reservation system

### 6. **`subscription_events`** (Created: Migration 0013)

- **Data Sensitivity:** High - Audit trail for billing
- **Contains:** Plan changes, Stripe event IDs, financial events
- **Current Status:** ❌ No RLS enabled
- **Risk:** Users could view other users' subscription history

### 7. **`transaction_commissions`** (Created: Migration 0013)

- **Data Sensitivity:** Very High - Financial transactions
- **Contains:** Commission amounts, payment intents, expert earnings
- **Current Status:** ❌ No RLS enabled
- **Risk:** Users could view other experts' earnings and financial data

## Existing RLS Coverage (✅ GOOD)

The following tables already have RLS enabled via `001_enable_rls.sql`:

- ✅ `organizations`
- ✅ `users`
- ✅ `user_org_memberships`
- ✅ `events`
- ✅ `schedules`
- ✅ `schedule_availabilities`
- ✅ `meetings`
- ✅ `categories` (public read)
- ✅ `profiles` (public read, owner write)
- ✅ `records` (PHI protection)
- ✅ `payment_transfers`
- ✅ `scheduling_settings`
- ✅ `audit_logs` (append-only)

The following tables have RLS via `002_phase3_enable_rls.sql`:

- ✅ `expert_setup`
- ✅ `user_preferences` (note: table deprecated, data moved to `users`)

## Recommended RLS Policies

### For `annual_plan_eligibility`:

```sql
-- Users can only view their own eligibility data
-- Admins can view all (for analytics dashboard)
```

### For `blocked_dates`:

```sql
-- Users can CRUD their own blocked dates
-- Organization members can view (for scheduling coordination)
```

### For `expert_applications`:

```sql
-- Users can view/update only their own application
-- Admins can view all applications (for review)
-- Admins can update status (approve/reject)
```

### For `roles`:

```sql
-- Users can view their own roles (read-only)
-- Admins can manage all roles
```

### For `slot_reservations`:

```sql
-- Users can CRUD their own reservations
-- Experts can view reservations for their events
```

### For `subscription_events`:

```sql
-- Users can view events for their org
-- Append-only for audit trail integrity
```

### For `transaction_commissions`:

```sql
-- Users can view commissions for their org
-- Read-only (managed by payment system)
```

## Action Plan

1. ✅ Create comprehensive RLS migration: `003_enable_rls_missing_tables.sql`
2. ✅ Include all 7 missing tables
3. ✅ Test policies with sample users
4. ✅ Apply to development database
5. ✅ Verify with `pg_tables` and `pg_policies` queries
6. ✅ Apply to staging/production

## Security Impact

**Before RLS:**

- Any authenticated user could query any table and see all data
- No database-level protection against data leaks
- Security relies entirely on application logic

**After RLS:**

- Database enforces org-scoped and user-scoped access
- Even if application has bugs, users can't access other users' data
- HIPAA/GDPR/SOC 2 compliant data isolation

## Migration File

**File:** `drizzle/migrations-manual/003_enable_rls_missing_tables.sql`  
**Dependencies:** Requires `001_enable_rls.sql` to be applied first (provides `auth.user_id()` function)

## Verification Queries

After applying migration:

```sql
-- 1. Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'annual_plan_eligibility',
  'blocked_dates',
  'expert_applications',
  'roles',
  'slot_reservations',
  'subscription_events',
  'transaction_commissions'
);

-- 2. Check policies exist
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'annual_plan_eligibility',
  'blocked_dates',
  'expert_applications',
  'roles',
  'slot_reservations',
  'subscription_events',
  'transaction_commissions'
)
ORDER BY tablename, policyname;
```

## References

- [Neon RLS Documentation](https://neon.tech/docs/guides/row-level-security)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- WorkOS JWT Integration: Uses `auth.user_id()` from Neon Auth
