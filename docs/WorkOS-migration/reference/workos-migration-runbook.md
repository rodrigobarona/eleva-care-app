# Clerk to WorkOS Migration Runbook

## Overview

This runbook provides step-by-step instructions for migrating Eleva Care from Clerk authentication to WorkOS + Neon Auth with org-per-user model and hybrid audit logging.

**Migration Type:** Immediate cutover (1-2 weeks)  
**Last Updated:** November 3, 2025  
**Owner:** DevOps + Engineering Team  
**Risk Level:** High (Authentication system replacement)

---

## Pre-Migration Checklist

### Requirements Verification

- [ ] **< 10 active users** (verified)
- [ ] All users known personally
- [ ] Access to all user email addresses
- [ ] Access to all user passwords (for informing reset process)
- [ ] Backup plan: Legacy database will remain accessible
- [ ] Rollback plan documented
- [ ] Stakeholder approval obtained

### Infrastructure Prerequisites

- [ ] WorkOS account created
- [ ] Neon.tech account with Scale plan access
- [ ] Vercel deployment access
- [ ] Stripe account access (for payment migration)
- [ ] Domain DNS access (for callback URLs)
- [ ] Monitoring/alerts configured (Sentry, BetterStack)

### Team Coordination

- [ ] Engineering team briefed
- [ ] Migration date scheduled
- [ ] User communication plan approved
- [ ] Support documentation prepared
- [ ] Rollback coordinator assigned

---

## Migration Timeline

### Week 1: Infrastructure & Schema

| Day | Tasks                         | Duration | Owner   |
| --- | ----------------------------- | -------- | ------- |
| 1-2 | Phase 1: Infrastructure Setup | 16h      | DevOps  |
| 3-4 | Phase 2: New Schema Creation  | 16h      | Backend |
| 5   | Phase 3: WorkOS Integration   | 8h       | Backend |

### Week 2: Code & Data Migration

| Day | Tasks                       | Duration | Owner     |
| --- | --------------------------- | -------- | --------- |
| 6-7 | Phase 4: Code Refactoring   | 16h      | Full Team |
| 8   | Phase 5: Calendar Migration | 8h       | Backend   |
| 9   | Phase 6: Data Migration     | 8h       | Backend   |
| 10  | Phase 7: User Communication | 4h       | Support   |

### Week 3: Testing & Deployment

| Day   | Tasks                | Duration | Owner     |
| ----- | -------------------- | -------- | --------- |
| 11-12 | Phase 8: Testing     | 16h      | QA        |
| 13    | Phase 9: Deployment  | 8h       | DevOps    |
| 14-15 | Phase 10: Monitoring | 16h      | Full Team |

---

## Phase 1: Infrastructure Setup

### 1.1 Create WorkOS Account

```bash
# Visit https://dashboard.workos.com/signup
# Create account
# Verify email
```

**Configure Development Environment:**

```
Name: Eleva Care - Development
Redirect URIs:
  - http://localhost:3000/auth/callback
  - http://localhost:3000/api/auth/callback
```

**Configure Production Environment:**

```
Name: Eleva Care - Production
Redirect URIs:
  - https://eleva.care/auth/callback
  - https://eleva.care/api/auth/callback
```

**Enable Authentication Providers:**

- ✅ Email/Password
- ✅ Google OAuth
- ✅ Magic Link

**Configure RBAC Roles:**

```typescript
// In WorkOS Dashboard → RBAC → Roles
roles: [
  { name: 'owner', permissions: ['*'] },
  { name: 'admin', permissions: ['org:*', 'members:*', 'bookings:*'] },
  { name: 'member', permissions: ['org:read', 'bookings:read', 'bookings:create'] },
  { name: 'billing_admin', permissions: ['org:read', 'billing:*'] },
];
```

**Copy API Keys:**

```bash
# Development
WORKOS_API_KEY=sk_test_...
WORKOS_CLIENT_ID=client_...

# Production
WORKOS_API_KEY=sk_prod_...
WORKOS_CLIENT_ID=client_...
```

### 1.2 Create New Neon Database

```bash
# Create new project in Neon Console
# https://console.neon.tech/

Project Name: eleva-care-workos
Plan: Scale ($69/month)
Region: US East (or closest to users)
Postgres Version: 16
```

**Enable Required Features:**

- ✅ Connection pooling
- ✅ Point-in-time restore
- ✅ Autoscaling (optional)

**Copy Connection Strings:**

```bash
# Pooled connection (for serverless)
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require&pooler=true"

# Direct connection (for migrations)
DATABASE_URL_DIRECT="postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
```

**Rename Legacy Database:**

```bash
# In Neon Console:
# 1. Navigate to old project
# 2. Rename to: eleva-care-legacy
# 3. Set to read-only mode
# 4. Copy connection string for migration scripts

DATABASE_URL_LEGACY="postgresql://..."
```

### 1.3 Configure Neon Auth

**Get WorkOS JWKS URL:**

```bash
WORKOS_JWKS_URL="https://api.workos.com/.well-known/jwks.json"
```

**Configure via API:**

```bash
#!/bin/bash
# scripts/setup/configure-neon-auth.sh

NEON_API_KEY="your-neon-api-key"
NEON_PROJECT_ID="your-project-id"
WORKOS_JWKS_URL="https://api.workos.com/.well-known/jwks.json"

curl -X POST \
  "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/auth/jwks" \
  -H "Authorization: Bearer ${NEON_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "jwks_url": "'${WORKOS_JWKS_URL}'",
    "role_names": ["neondb_owner"]
  }'
```

**Verify Configuration:**

```sql
-- Connect to new database
psql $DATABASE_URL_DIRECT

-- Check auth configuration
SELECT * FROM pg_settings WHERE name LIKE '%jwt%';

-- Test auth.user_id() function (should exist)
SELECT auth.user_id();
-- Expected: NULL (no JWT yet)
```

### 1.4 Update Dependencies

```bash
# Install WorkOS
pnpm add @workos-inc/node iron-session

# Remove Clerk
pnpm remove @clerk/nextjs @clerk/themes @clerk/localizations

# Verify no Clerk dependencies remain
grep -r "@clerk" package.json
# Should return nothing
```

### 1.5 Set Environment Variables

**Development (.env.local):**

```bash
# WorkOS
WORKOS_API_KEY=sk_test_...
WORKOS_CLIENT_ID=client_...
WORKOS_COOKIE_PASSWORD=generate-32-character-random-password
WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback

# Neon
DATABASE_URL=postgresql://...?pooler=true
DATABASE_URL_LEGACY=postgresql://...
AUDITLOG_DATABASE_URL=postgresql://...

# Neon API (for migrations)
NEON_API_KEY=...
NEON_PROJECT_ID=...
```

**Production (Vercel Environment Variables):**

```bash
# Same keys, production values
# Set via: vercel env add WORKOS_API_KEY
```

---

## Phase 2: New Schema Creation

### 2.1 Create Schema File

```bash
# Create new schema file
touch drizzle/schema-workos.ts
```

**Add Core Tables:**

```typescript
// drizzle/schema-workos.ts
import { authenticatedRole, crudPolicy } from 'drizzle-orm/neon';
import { boolean, jsonb, pgTable, sql, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Organizations
export const OrganizationsTable = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosOrgId: text('workos_org_id').unique().notNull(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    features: jsonb('features'),
    subscriptionTier: text('subscription_tier').default('free'),
    subscriptionStatus: text('subscription_status').default('active'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    billingEmail: text('billing_email'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    crudPolicy({
      role: authenticatedRole,
      read: sql`EXISTS (
        SELECT 1 FROM user_org_memberships
        WHERE user_org_memberships.org_id = ${table.id}
        AND user_org_memberships.workos_user_id = auth.user_id()
        AND user_org_memberships.status = 'active'
      )`,
      modify: sql`EXISTS (
        SELECT 1 FROM user_org_memberships
        WHERE user_org_memberships.org_id = ${table.id}
        AND user_org_memberships.workos_user_id = auth.user_id()
        AND user_org_memberships.role IN ('owner', 'admin')
      )`,
    }),
  ],
);

// Users
export const UsersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  workosUserId: text('workos_user_id').notNull().unique(),
  email: text('email').notNull(),
  primaryOrgId: uuid('primary_org_id').references(() => OrganizationsTable.id),
  platformRole: text('platform_role').default('user'),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeConnectAccountId: text('stripe_connect_account_id').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User-Org Memberships
export const UserOrgMembershipsTable = pgTable(
  'user_org_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id').notNull(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => OrganizationsTable.id, {
        onDelete: 'cascade',
      }),
    workosOrgMembershipId: text('workos_org_membership_id').unique(),
    role: text('role').notNull(),
    status: text('status').default('active'),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    invitedAt: timestamp('invited_at'),
    invitedBy: text('invited_by'),
  },
  (table) => [
    crudPolicy({
      role: authenticatedRole,
      read: sql`${table.workosUserId} = auth.user_id()`,
      modify: sql`false`,
    }),
  ],
);

// ... Add other tables (Events, Meetings, etc.) with org_id columns
```

### 2.2 Run Migrations

```bash
# Generate migration files
pnpm drizzle-kit generate:pg

# Review generated SQL
cat drizzle/migrations/0001_workos_migration.sql

# Apply to database
pnpm drizzle-kit push:pg
```

### 2.3 Create Indexes

```sql
-- Connect to database
psql $DATABASE_URL_DIRECT

-- Organization indexes
CREATE INDEX idx_orgs_workos_id ON organizations(workos_org_id);
CREATE INDEX idx_orgs_type ON organizations(type);
CREATE INDEX idx_orgs_subscription ON organizations(subscription_tier);

-- User indexes
CREATE INDEX idx_users_workos_id ON users(workos_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_primary_org ON users(primary_org_id);

-- Membership indexes (IMPORTANT for RLS performance)
CREATE INDEX idx_memberships_user_org ON user_org_memberships(workos_user_id, org_id);
CREATE INDEX idx_memberships_org ON user_org_memberships(org_id);
CREATE INDEX idx_memberships_status ON user_org_memberships(status) WHERE status = 'active';

-- Verify indexes created
\di
```

---

## Phase 3: WorkOS Integration

### 3.1 Create WorkOS Client

```typescript
// lib/integrations/workos/client.ts
import { WorkOS } from '@workos-inc/node';

export const workos = new WorkOS(process.env.WORKOS_API_KEY!, {
  clientId: process.env.WORKOS_CLIENT_ID!,
});
```

### 3.2 Create Session Management

```typescript
// lib/auth/workos-session.ts
import { sealData, unsealData } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export interface WorkOSSession {
  userId: string;
  email: string;
  organizationId?: string;
  role?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export async function setSession(session: WorkOSSession) {
  const sealed = await sealData(session, {
    password: process.env.WORKOS_COOKIE_PASSWORD!,
    ttl: 60 * 60 * 24 * 7,
  });

  (await cookies()).set('workos_session', sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export async function getSession(): Promise<WorkOSSession | null> {
  const sessionCookie = (await cookies()).get('workos_session');

  if (!sessionCookie) {
    return null;
  }

  try {
    const session = await unsealData<WorkOSSession>(sessionCookie.value, {
      password: process.env.WORKOS_COOKIE_PASSWORD!,
    });

    if (Date.now() >= session.expiresAt) {
      return await refreshSession(session);
    }

    return session;
  } catch (error) {
    console.error('Session unsealing error:', error);
    return null;
  }
}

export async function requireAuth(): Promise<WorkOSSession> {
  const session = await getSession();

  if (!session) {
    redirect('/sign-in');
  }

  return session;
}

export async function clearSession() {
  (await cookies()).delete('workos_session');
}

async function refreshSession(session: WorkOSSession): Promise<WorkOSSession | null> {
  try {
    const { accessToken, refreshToken } = await workos.userManagement.refreshToken({
      refreshToken: session.refreshToken,
      clientId: process.env.WORKOS_CLIENT_ID!,
    });

    const newSession = {
      ...session,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 60 * 60 * 1000,
    };

    await setSession(newSession);
    return newSession;
  } catch (error) {
    console.error('Token refresh failed:', error);
    await clearSession();
    return null;
  }
}
```

### 3.3 Create Auth Routes

**Sign-in page:**

```typescript
// app/sign-in/page.tsx
import { workos } from '@/lib/integrations/workos/client';
import { redirect } from 'next/navigation';

export default function SignInPage() {
  async function handleSignIn() {
    'use server';

    const authUrl = workos.userManagement.getAuthorizationUrl({
      provider: 'authkit',
      clientId: process.env.WORKOS_CLIENT_ID!,
      redirectUri: process.env.WORKOS_REDIRECT_URI!,
      state: JSON.stringify({ returnTo: '/dashboard' }),
    });

    redirect(authUrl);
  }

  return (
    <form action={handleSignIn}>
      <button type="submit">Sign In</button>
    </form>
  );
}
```

**Callback handler:**

```typescript
// app/auth/callback/route.ts
import { setSession } from '@/lib/auth/workos-session';
import { workos } from '@/lib/integrations/workos/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/sign-in?error=no_code', req.url));
  }

  try {
    const { user, organizationId, accessToken, refreshToken } =
      await workos.userManagement.authenticateWithCode({
        code,
        clientId: process.env.WORKOS_CLIENT_ID!,
      });

    await setSession({
      userId: user.id,
      email: user.email,
      organizationId,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    return NextResponse.redirect(new URL('/dashboard', req.url));
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(new URL('/sign-in?error=auth_failed', req.url));
  }
}
```

### 3.4 Create Neon RLS Client

```typescript
// lib/integrations/neon/rls-client.ts
import * as schema from '@/drizzle/schema-workos';
import { requireAuth } from '@/lib/auth/workos-session';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

export function getDrizzleClient(jwtToken: string) {
  const sql = neon(process.env.DATABASE_URL!, {
    authToken: jwtToken,
    fetchOptions: {
      cache: 'no-store',
    },
  });

  return drizzle(sql, { schema });
}

export async function getOrgScopedDb() {
  const session = await requireAuth();
  return getDrizzleClient(session.accessToken);
}

// Admin DB (use with caution)
export function getAdminDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}
```

### 3.5 Update Middleware

```typescript
// proxy.ts
import { getSession } from '@/lib/auth/workos-session';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/sign-in', '/sign-up', '/auth/callback', '/', '/api/webhooks'];

export async function middleware(req: NextRequest) {
  const isPublic = publicRoutes.some((route) => req.nextUrl.pathname.startsWith(route));

  if (!isPublic) {
    const session = await getSession();

    if (!session) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|static|favicon.ico).*)'],
};
```

---

## Phase 4-10: Continued in Next Message...

**This runbook continues with:**

- Phase 4: Code Refactoring
- Phase 5: Google Calendar Migration
- Phase 6: Data Migration Execution
- Phase 7: User Communication
- Phase 8: Testing & Validation
- Phase 9: Deployment & Cutover
- Phase 10: Post-Migration Monitoring

---

**To be continued...**

---

**Questions?** Contact: devops@eleva.care
