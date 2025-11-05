# 🚀 Next Steps - WorkOS Migration

**Status:** Phase 1-2 Complete ✅  
**Current Step:** Configure Neon Auth & Generate Migrations  
**Estimated Time:** 30 minutes

---

## ⚡ Quick Start

### 1️⃣ Configure Neon Auth via Data API UI (5 min)

**Much easier than the command-line approach!** 🎉

1. **Go to Neon Console** → Your Project → **Data API** (Beta)
2. **Enable the Data API** (toggle switch)
3. **Configure Authentication Provider:**
   - Select: **"Other Provider"** (not "Neon Auth")
   - **JWKS URL**: `https://api.workos.com/sso/jwks/{YOUR_CLIENT_ID}` (Standard approach using SET LOCAL - see docs/WorkOS-migration/READY-TO-MIGRATE.md)
   - **JWT Audience** (optional): Leave blank or use `api://default`
4. **Check**: ✅ **"Grant public schema access to authenticated users"**
5. Click **Save** or **Enable**

**Verify it worked:**

```sql
-- In Neon Console → SQL Editor
SELECT auth.user_id();
-- Should return: NULL (no JWT yet)

-- After implementing auth, it will return the WorkOS user ID
```

**What this does:**

- Neon Auth will validate WorkOS JWTs automatically
- The `auth.user_id()` function extracts the `sub` claim (WorkOS user ID)
- RLS policies can now use `auth.user_id()` to filter data

---

### 2️⃣ Update Environment Variables (2 min)

Update `.env.local`:

```bash
# WorkOS (you already have these)
WORKOS_API_KEY="sk_test_..."
WORKOS_CLIENT_ID="client_..."
WORKOS_REDIRECT_URI="http://localhost:3000/auth/callback"

# Neon Databases
DATABASE_URL="postgresql://...neon.tech/eleva_workos?sslmode=require"
DATABASE_DEV_URL="postgresql://...neon.tech/eleva_dev?sslmode=require"
DATABASE_URL_LEGACY="postgresql://...neon.tech/eleva_legacy?sslmode=require"

# Encryption (existing)
ENCRYPTION_KEY="your-existing-key"

# ❌ REMOVE THIS (no longer needed with unified audit):
# AUDITLOG_DATABASE_URL="..."
```

**Note:** No need for `NEON_API_KEY` or `NEON_PROJECT_ID` since we're using the UI!

---

### 3️⃣ Create RLS Policies SQL File (5 min)

Since Drizzle ORM doesn't support RLS syntax yet, we'll create a manual SQL migration:

**Create:** `drizzle/migrations-manual/001_enable_rls.sql`

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
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see orgs they belong to
CREATE POLICY organizations_read ON organizations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = organizations.id
    AND user_org_memberships.workos_user_id = auth.user_id()
    AND user_org_memberships.status = 'active'
  )
);

-- User Memberships: Users can only see their own
CREATE POLICY memberships_read ON user_org_memberships
FOR SELECT USING (workos_user_id = auth.user_id());

-- Events: Org-scoped access
CREATE POLICY events_read ON events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = events.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
  )
);

CREATE POLICY events_modify ON events
FOR ALL USING (workos_user_id = auth.user_id());

-- Audit Logs: Org-scoped read (append-only)
CREATE POLICY audit_logs_read ON audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_org_memberships
    WHERE user_org_memberships.org_id = audit_logs.org_id
    AND user_org_memberships.workos_user_id = auth.user_id()
  )
);

-- Add more policies for other tables...
```

See full example in the migration plan!

---

### 4️⃣ Generate & Apply Migrations (10 min)

```bash
# Step 1: Generate Drizzle migrations
pnpm db:generate

# Step 2: Apply to development database
pnpm db:migrate

# Step 3: Apply RLS policies
psql $DATABASE_DEV_URL -f drizzle/migrations-manual/001_enable_rls.sql

# Step 4: Verify in Neon Console → Tables
# Should see all tables with RLS enabled
```

**Verify RLS is enabled:**

```sql
-- In Neon Console SQL Editor
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
-- All tables should have rowsecurity = true
```

---

### 5️⃣ Test Authentication (10 min)

```bash
# Start dev server
pnpm dev
```

**Test Flow:**

1. Visit `http://localhost:3000/sign-in`
2. Should redirect to WorkOS AuthKit
3. Sign in with test account
4. Should redirect to `/dashboard`

**Verify Session:**
Create a test server action:

```typescript
// server/actions/test.ts
'use server';

import { OrganizationsTable } from '@/drizzle/schema-workos';
import { requireAuth } from '@/lib/auth/workos-session';
import { getOrgScopedDb } from '@/lib/integrations/neon/rls-client';

// server/actions/test.ts

// server/actions/test.ts

// server/actions/test.ts

// server/actions/test.ts

// server/actions/test.ts

// server/actions/test.ts

// server/actions/test.ts

// server/actions/test.ts

export async function testAuth() {
  // Test 1: Session
  const session = await requireAuth();
  console.log('✅ Session:', session);

  // Test 2: RLS
  const db = await getOrgScopedDb();
  const orgs = await db.select().from(OrganizationsTable);
  console.log('✅ Organizations (RLS filtered):', orgs);

  return { session, orgs };
}
```

---

## 📊 What You Have Now

### ✅ Complete Infrastructure

| Component              | Status      | File                                        |
| ---------------------- | ----------- | ------------------------------------------- |
| **WorkOS Schema**      | ✅ Complete | `drizzle/schema-workos.ts`                  |
| **WorkOS Client**      | ✅ Complete | `lib/integrations/workos/client.ts`         |
| **Session Management** | ✅ Complete | `lib/auth/workos-session.ts`                |
| **RLS Client**         | ✅ Complete | `lib/integrations/neon/rls-client.ts`       |
| **Auth Routes**        | ✅ Complete | `app/(auth)/sign-in/`, `app/auth/callback/` |
| **Audit Logging**      | ✅ Complete | `lib/utils/server/audit-workos.ts`          |
| **Configuration**      | ⏳ Pending  | Run `configure-neon-auth.sh`                |

### 🎯 Key Features Implemented

1. **Org-Per-User Model**
   - Each user gets their own organization
   - Complete data isolation
   - B2B ready (can invite members)

2. **Automatic RLS via Neon Auth**
   - No manual context setting!
   - JWT validated at database level
   - `auth.user_id()` extracts WorkOS user ID

3. **Unified Audit Logging**
   - Single database (saves $240/year)
   - RLS protected (org-scoped)
   - Automatic context from JWT

4. **WorkOS RBAC**
   - Roles: owner, admin, member, billing_admin
   - Permission checks: `requirePermission('org:update')`
   - WorkOS Admin Portal integration

---

## 🔄 Migration Workflow (After Testing)

Once testing is complete, follow this sequence:

### Phase 4: User Migration

1. Create user organizations
2. Migrate user data with org mappings
3. Migrate events, meetings, profiles
4. Validate data integrity

### Phase 5: Code Refactoring

1. Update API routes (replace `auth()` → `requireAuth()`)
2. Update server actions (use `getOrgScopedDb()`)
3. Update components (use WorkOS user data)
4. Remove Clerk imports

### Phase 6: Testing

1. Integration tests
2. Manual testing
3. Load testing
4. Security validation

### Phase 7: Deployment

1. Configure production environment
2. Deploy to Vercel
3. Execute cutover
4. Monitor for issues

---

## 📚 Documentation

All documentation is in `/docs`:

- **[IMPLEMENTATION-STATUS.md](./docs/IMPLEMENTATION-STATUS.md)** - What's done, what's next
- **[WORKOS-MIGRATION.md](./docs/WORKOS-MIGRATION.md)** - Complete migration plan
- **[GETTING-STARTED-WITH-WORKOS.md](./docs/GETTING-STARTED-WITH-WORKOS.md)** - Quick reference
- **[AUDIT-MIGRATION-SUMMARY.md](./docs/AUDIT-MIGRATION-SUMMARY.md)** - Audit logging decisions

**Technical Deep Dives:**

- `docs/09-integrations/workos-authentication.md` - WorkOS setup
- `docs/03-infrastructure/neon-auth-rls.md` - Neon Auth + RLS
- `docs/04-development/org-per-user-model.md` - Multi-tenancy
- `docs/06-legal/unified-audit-logging.md` - Audit logging

---

## 🆘 Troubleshooting

### Error: "auth.user_id() does not exist"

**Solution:** Enable the Data API in Neon Console:

1. Go to Neon Console → Your Project → Data API
2. Enable Data API
3. Set JWKS URL to: `https://api.workos.com/.well-known/jwks.json`
4. Grant public schema access to authenticated users

### Error: "WORKOS_API_KEY is required"

**Solution:** Check `.env.local` has all WorkOS variables set.

### Error: "Table does not exist"

**Solution:** Run migrations:

```bash
pnpm db:migrate
```

### RLS policies return no data

**Solution:**

1. Check session has `accessToken`
2. Verify `auth.user_id()` returns correct ID
3. Check user has org membership

---

## ✅ Checklist

Before continuing to Phase 4 (User Migration):

- [ ] Neon Data API enabled with WorkOS JWKS URL
- [ ] Environment variables updated (`.env.local`)
- [ ] RLS policies SQL file created (`001_enable_rls.sql`)
- [ ] Migrations generated (`pnpm db:generate`)
- [ ] Migrations applied (`pnpm db:migrate`)
- [ ] RLS policies applied (`psql ... -f 001_enable_rls.sql`)
- [ ] Auth flow tested (sign-in → callback → session)
- [ ] RLS tested (queries filter by org)
- [ ] Audit logging tested (`logAuditEvent()`)
- [ ] `auth.user_id()` function verified

---

## 🎉 You're Ready!

Phase 1-2 are complete! You have:

- ✅ Complete WorkOS schema with RLS
- ✅ WorkOS integration & session management
- ✅ Auth routes & callbacks
- ✅ Neon RLS client with automatic JWT validation
- ✅ Unified audit logging system
- ✅ Comprehensive documentation

**Next:** Follow steps 1-5 above to configure and test! 🚀

---

**Questions?** See `docs/IMPLEMENTATION-STATUS.md` for detailed status and next steps.
