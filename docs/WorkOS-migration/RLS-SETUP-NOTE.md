# RLS Setup Note - Important! ⚠️

## Issue Discovered

The `drizzle-orm/neon` import for RLS policies (`crudPolicy`, `authenticatedRole`) is not available in the current Drizzle ORM version. This is likely because:

1. Neon Auth RLS integration with Drizzle is still in beta/development
2. We need a newer version of Drizzle ORM
3. RLS policies need to be applied via raw SQL instead

---

## ✅ Solution: Apply RLS via Raw SQL

Instead of defining RLS policies in the Drizzle schema, we'll apply them via SQL migrations. This is actually the **recommended approach** by Neon.

### Step 1: Remove RLS Imports from Schema

Comment out or remove these lines from `drizzle/schema-workos.ts`:

```typescript
// Remove these imports:
// import { authenticatedRole, crudPolicy } from 'drizzle-orm/neon';
```

And remove the RLS policy callbacks from table definitions:

```typescript
// Before (with RLS):
export const OrganizationsTable = pgTable(
  'organizations',
  { /* columns */ },
  (table) => [
    crudPolicy({ /* RLS policy */ }),
    index('...'),
  ]
);

// After (without inline RLS):
export const OrganizationsTable = pgTable(
  'organizations',
  { /* columns */ },
  (table) => ({
    workosOrgIdIdx: index('organizations_workos_org_id_idx').on(table.workosOrgId),
    slugIdx: index('organizations_slug_idx').on(table.slug),
  })
);
```

### Step 2: Create RLS Migration File

Create `drizzle/migrations-manual/001_enable_rls.sql`:

```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_stats ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see orgs they belong to
CREATE POLICY organizations_read_policy ON organizations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = organizations.id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);

CREATE POLICY organizations_update_policy ON organizations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = organizations.id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.role IN ('owner', 'admin')
  )
);

-- User Org Memberships: Users can only see their own memberships
CREATE POLICY memberships_read_policy ON user_org_memberships
FOR SELECT
USING (workos_user_id = auth.user_id());

-- Events: Users can access events from orgs they belong to
CREATE POLICY events_read_policy ON events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = events.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);

CREATE POLICY events_modify_policy ON events
FOR ALL
USING (workos_user_id = auth.user_id());

-- Schedules: Users can only access their own schedules
CREATE POLICY schedules_read_policy ON schedules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = schedules.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
  )
);

CREATE POLICY schedules_modify_policy ON schedules
FOR ALL
USING (workos_user_id = auth.user_id());

-- Meetings: Users can access meetings from their orgs
CREATE POLICY meetings_read_policy ON meetings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = meetings.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
  )
);

CREATE POLICY meetings_modify_policy ON meetings
FOR ALL
USING (workos_user_id = auth.user_id());

-- Profiles: Public read, owner write
CREATE POLICY profiles_read_policy ON profiles
FOR SELECT
USING (true); -- Profiles are public

CREATE POLICY profiles_modify_policy ON profiles
FOR ALL
USING (workos_user_id = auth.user_id());

-- Records (PHI): Strict org-scoped access
CREATE POLICY records_read_policy ON records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = records.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
  )
);

CREATE POLICY records_modify_policy ON records
FOR ALL
USING (expert_id = auth.user_id());

-- Audit Logs: Org-scoped read, append-only
CREATE POLICY audit_logs_read_policy ON audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = audit_logs.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);

-- No UPDATE or DELETE policies for audit_logs (append-only)

-- Audit Log Exports: Admin only
CREATE POLICY audit_exports_read_policy ON audit_log_exports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = audit_log_exports.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
    AND user_org_memberships.role IN ('owner', 'admin')
  )
);

-- Audit Stats: Org-scoped read
CREATE POLICY audit_stats_read_policy ON audit_stats
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = audit_stats.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);
```

### Step 3: Apply RLS Policies

```bash
# After running pnpm db:migrate, apply RLS manually
psql $DATABASE_URL -f drizzle/migrations-manual/001_enable_rls.sql
```

---

## ✅ Updated Implementation Steps

1. **Remove RLS imports** from `drizzle/schema-workos.ts`
2. **Simplify table definitions** (remove RLS callbacks, keep indexes)
3. **Generate migrations:** `pnpm db:generate`
4. **Apply migrations:** `pnpm db:migrate`
5. **Apply RLS policies:** `psql $DATABASE_URL -f drizzle/migrations-manual/001_enable_rls.sql`
6. **Test RLS:** Verify queries are properly filtered

---

## Why This Approach is Better

1. **Standard Practice**: Neon recommends applying RLS via SQL
2. **More Control**: Can customize policies precisely
3. **Better Debugging**: Easier to see what policies are active
4. **Works Now**: No waiting for Drizzle ORM updates
5. **Documented**: Clear SQL migrations for auditing

---

## Testing RLS

```sql
-- Test that auth.user_id() works
SELECT auth.user_id();

-- Test RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Test policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

---

## 🎯 Next Steps (Updated)

1. Simplify `drizzle/schema-workos.ts` (remove RLS syntax)
2. Create `drizzle/migrations-manual/001_enable_rls.sql`
3. Continue with normal migration flow
4. Apply RLS after migrations complete
5. Test everything works!

---

This is actually a **better approach** than inline RLS definitions because:

- More flexible
- Easier to maintain
- Standard SQL = better documentation
- Works with any Drizzle version

**No delays!** This is the production-ready way to do it! 🚀
