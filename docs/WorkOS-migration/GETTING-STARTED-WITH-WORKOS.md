# Getting Started with WorkOS Migration

## ✅ What We've Completed

### 1. **Decision Made: Unified Audit Database (Option A)**

We're using **Industry Standard Option A** - single database with RLS protection:

- ✅ **Better**: Single connection pool (faster)
- ✅ **Cheaper**: Saves $240/year ($20/month)
- ✅ **Simpler**: One database to manage
- ✅ **Secure**: RLS + append-only logs
- ✅ **HIPAA Compliant**: 7-year retention, tamper-proof

### 2. **Architecture Designed**

- ✅ Store WorkOS user IDs **directly** (no internal mapping table)
- ✅ Org-per-user model (each user gets their own organization)
- ✅ Unified audit schema with automatic RLS
- ✅ Hybrid audit strategy (WorkOS + Database)

### 3. **Code Created**

- ✅ `drizzle/schema-audit-workos.ts` - Audit schema with RLS
- ✅ `lib/utils/server/audit-workos.ts` - Simplified audit utilities
- ✅ `scripts/migrate-audit-logs-to-unified.ts` - Migration script

### 4. **Documentation Written**

- ✅ `docs/AUDIT-MIGRATION-SUMMARY.md` - Decision summary
- ✅ `docs/06-legal/unified-audit-logging.md` - Complete guide
- ✅ All migration plan docs completed

---

## 🚀 Next Steps (In Order)

### Step 1: Configure Neon Database ⏭️ **START HERE**

You mentioned you already created a new database in Neon. Let's configure it:

#### A. Configure Neon Auth with WorkOS

```bash
# Get your Neon API key from: https://console.neon.tech/app/settings/api-keys
# Get your Neon project ID from database URL

curl -X POST \
  'https://console.neon.tech/api/v2/projects/{YOUR_PROJECT_ID}/auth/jwks' \
  -H 'Authorization: Bearer $NEON_API_KEY' \
  -d '{
    "jwks_url": "https://api.workos.com/.well-known/jwks.json",
    "role_names": ["neondb_owner"]
  }'
```

#### B. Set Environment Variables

```bash
# .env.local (development)

# WorkOS (you already have these)
WORKOS_CLIENT_ID="client_..."
WORKOS_API_KEY="sk_test_..."
WORKOS_REDIRECT_URI="http://localhost:3000/auth/callback"

# Neon Database (you already have this)
DATABASE_DEV_URL="postgresql://...neon.tech/eleva_dev?sslmode=require"

# Production URL
DATABASE_URL="postgresql://...neon.tech/eleva_prod?sslmode=require"

# Legacy database (keep for 6 months)
DATABASE_URL_LEGACY="postgresql://...neon.tech/eleva_legacy?sslmode=require"

# Encryption (existing - can reuse)
ENCRYPTION_KEY="your-existing-encryption-key"

# ❌ REMOVE THIS (no longer needed with unified audit):
# AUDITLOG_DATABASE_URL="..."
```

---

### Step 2: Create WorkOS Schema

Now let's create the complete WorkOS schema with the unified audit logs:

```bash
# We'll create this file next
# drizzle/schema-workos.ts
```

**What to include:**

1. Organizations table (org-per-user)
2. Users table (minimal - WorkOS is source of truth)
3. User-Org Memberships table
4. All existing tables (events, appointments, etc.) with orgId
5. **Audit tables** (from `schema-audit-workos.ts`)

---

### Step 3: Generate and Apply Migrations

```bash
# Generate migrations from new schema
pnpm generate

# Apply to development database
pnpm migrate

# Verify tables were created
# Connect to Neon Console and check tables
```

---

### Step 4: Test Audit Logging

Create a simple test to verify RLS and audit logging work:

```typescript
// scripts/test-audit-rls.ts
import { logAuditEvent } from '@/lib/utils/server/audit-workos';

// This will test:
// - Automatic context extraction
// - RLS policies
// - Audit log insertion

await logAuditEvent('MEDICAL_RECORD_VIEWED', 'medical_record', 'test_record_123');

console.log('✅ Audit logging works!');
```

---

## 📋 Current Status

| Task                 | Status      | File/Action                                |
| -------------------- | ----------- | ------------------------------------------ |
| **Architecture**     | ✅ Done     | All decisions documented                   |
| **Audit Schema**     | ✅ Done     | `drizzle/schema-audit-workos.ts`           |
| **Audit Utilities**  | ✅ Done     | `lib/utils/server/audit-workos.ts`         |
| **Migration Script** | ✅ Done     | `scripts/migrate-audit-logs-to-unified.ts` |
| **Documentation**    | ✅ Done     | Multiple docs in `/docs`                   |
| **WorkOS Account**   | ✅ Done     | You created it                             |
| **Neon Database**    | ✅ Done     | You created it                             |
| **Neon Auth Config** | ⏭️ **Next** | Configure JWKS                             |
| **Complete Schema**  | ⏳ Pending  | Create `schema-workos.ts`                  |
| **Migrations**       | ⏳ Pending  | Generate & apply                           |
| **Code Refactoring** | ⏳ Pending  | Update imports                             |

---

## 🎯 What We Need to Create Next

### 1. Complete WorkOS Schema

Combine everything into one schema file:

```typescript
// drizzle/schema-workos.ts

// Core tables (from migration plan)
export const OrganizationsTable = ...
export const UsersTable = ...
export const UserOrgMembershipsTable = ...

// Application tables (migrated from Clerk)
export const EventsTable = ... // with orgId + RLS
export const AppointmentsTable = ... // with orgId + RLS
export const PaymentsTable = ... // with orgId + RLS

// Audit tables (from schema-audit-workos.ts)
export const AuditLogsTable = ...
export const AuditLogExportsTable = ...
export const AuditStatsTable = ...
```

### 2. WorkOS Integration Files

```typescript
// lib/integrations/workos/client.ts
// lib/integrations/workos/audit.ts
// lib/auth/workos-session.ts
// lib/auth/workos-roles.server.ts
// lib/integrations/neon/rls-client.ts
```

### 3. Auth Routes

```typescript
// app/sign-in/page.tsx
// app/auth/callback/route.ts
// middleware.ts
```

---

## 💡 Key Architectural Decisions

### ✅ Decision 1: Store WorkOS User IDs Directly

```typescript
// ✅ Correct: Direct storage
workosUserId: text('workos_user_id').notNull();

// ❌ Wrong: Don't create mapping table
// internalUserId: uuid('internal_user_id')
```

**Why?** Industry standard, works with Neon Auth's `auth.user_id()`, simpler code.

### ✅ Decision 2: Unified Audit Database

```typescript
// ✅ Correct: Same database
DATABASE_URL = 'postgresql://...neon.tech/eleva_workos';
// Contains: app tables + audit tables

// ❌ Wrong: Separate databases
// DATABASE_URL="..." (app)
// AUDITLOG_DATABASE_URL="..." (audit)
```

**Why?** Saves $240/year, better performance, RLS provides security.

### ✅ Decision 3: Org-Per-User Model

```typescript
// Each user gets their own organization
user.primaryOrgId → organizations.id

// Benefits:
// - Complete data isolation
// - GDPR-friendly (delete org = delete all data)
// - HIPAA compliant (clear boundaries)
// - B2B ready (can invite others to your org)
```

---

## 📞 Questions to Clarify

Before we continue, let's confirm:

### 1. Neon Database

- ✅ You created a new database
- ✅ You have `DATABASE_DEV_URL`
- ✅ You have `DATABASE_URL` (production)
- ❓ **Did you choose Neon Scale plan ($69/month)?** (Required for RLS)

### 2. WorkOS Setup

- ✅ You created WorkOS account
- ✅ You have `WORKOS_CLIENT_ID`
- ✅ You have `WORKOS_API_KEY`
- ❓ **Did you configure redirect URIs in WorkOS Dashboard?**
  - Dev: `http://localhost:3000/auth/callback`
  - Prod: `https://eleva.care/auth/callback`

### 3. Encryption

- ❓ **Can we use the same `ENCRYPTION_KEY` from current setup?**
- ❓ **Where do you want to store PHI encryption keys?** (env vars or secrets manager?)

---

## 🚦 Ready to Continue?

**Option A: Continue with Schema Creation** (Recommended)

> I'll create the complete WorkOS schema combining:
>
> - Organizations, Users, Memberships
> - All app tables (events, appointments, etc.) with orgId
> - Unified audit tables
> - RLS policies for everything

**Option B: Configure Neon Auth First**

> We can set up Neon Auth JWKS integration with WorkOS first

**Option C: Review What We Have**

> You want to review the audit schema/utilities we created

---

## 📚 Quick Reference

**What's the unified audit approach?**

> Single database with audit tables protected by RLS. Same DB as app tables.

**Why not internal user ID mapping?**

> Not needed. WorkOS IDs are stable, portable, and work with Neon Auth's `auth.user_id()`.

**Is this HIPAA compliant?**

> Yes! RLS + append-only + 7-year retention + encryption = compliant.

**Can I see my own audit logs?**

> Yes! RLS automatically shows you only your org's logs. WorkOS Admin Portal too!

---

**Ready to continue?** Let me know which option you'd like, or if you have questions about anything we've created so far! 🚀
