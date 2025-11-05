# Neon Auth + Row-Level Security (RLS)

## Overview

This document explains Eleva Care's implementation of **Neon Auth** integrated with **WorkOS** for automatic JWT validation and **Row-Level Security (RLS)** for multi-tenant data isolation.

**Last Updated:** November 3, 2025  
**Status:** Active  
**Owner:** Infrastructure Team

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How Neon Auth Works](#how-neon-auth-works)
3. [WorkOS JWT Integration](#workos-jwt-integration)
4. [RLS Policy Patterns](#rls-policy-patterns)
5. [Database Client Setup](#database-client-setup)
6. [Testing RLS Policies](#testing-rls-policies)
7. [Performance Optimization](#performance-optimization)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                   Neon Auth + RLS Data Flow                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. User authenticates via WorkOS                                │
│     └─> Receives JWT with claims: { sub, email, org_id, role }  │
│                                                                   │
│  2. Next.js stores JWT in session                                │
│     └─> Encrypted HTTP-only cookie                              │
│                                                                   │
│  3. Database query initiated                                     │
│     ├─> JWT passed to Neon via authToken                        │
│     └─> Example: getDrizzleClient(session.accessToken)          │
│                                                                   │
│  4. Neon Auth validates JWT                                      │
│     ├─> Fetches public keys from WorkOS JWKS endpoint           │
│     ├─> Verifies signature                                      │
│     ├─> Checks expiration                                       │
│     └─> Extracts user_id from 'sub' claim                       │
│                                                                   │
│  5. RLS policies execute automatically                           │
│     ├─> auth.user_id() returns validated user ID                │
│     ├─> Policies filter rows based on org membership            │
│     └─> User only sees/modifies authorized data                 │
│                                                                   │
│  6. Results returned to application                              │
│     └─> Already filtered by RLS - no app-level filtering needed │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Key Benefits

✅ **Zero manual context setting** - No `SET LOCAL` commands needed  
✅ **Database-level security** - Cannot be bypassed by application bugs  
✅ **JWT validation at DB layer** - More secure than app-level validation  
✅ **Automatic user extraction** - `auth.user_id()` works seamlessly  
✅ **WorkOS integration** - Validates tokens via JWKS endpoint  
✅ **Performance** - Native Postgres, no extra middleware

---

## How Neon Auth Works

### JWKS Integration

Neon Auth uses **JSON Web Key Set (JWKS)** to validate JWT tokens:

```
┌──────────┐      JWKS URL      ┌─────────────┐      Validates    ┌──────────┐
│  WorkOS  │ ──────────────────> │  Neon Auth  │ ────────────────> │ Postgres │
│   API    │  jwks.json          │  Validator  │   JWT signature  │   RLS    │
└──────────┘                     └─────────────┘                   └──────────┘
```

**JWKS URL:** `https://api.workos.com/.well-known/jwks.json`

### Configuration Steps

#### 1. Configure Neon Project

```bash
# Set up Neon Auth with WorkOS JWKS
curl -X POST \
  'https://console.neon.tech/api/v2/projects/{project_id}/auth/jwks' \
  -H 'Authorization: Bearer $NEON_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "jwks_url": "https://api.workos.com/.well-known/jwks.json",
    "role_names": ["neondb_owner"]
  }'
```

#### 2. Verify Configuration

```sql
-- Check Neon Auth configuration
SELECT * FROM pg_settings
WHERE name LIKE '%jwt%';

-- Test auth.user_id() function
SELECT auth.user_id();
-- Should return: NULL (when not authenticated)
```

#### 3. Test with Sample JWT

```bash
# Get a sample JWT from WorkOS
# Then test in psql:

-- Set JWT for testing
SET LOCAL request.jwt.claims = '{"sub":"user_01HXYZ","email":"test@example.com"}';

-- Test auth.user_id()
SELECT auth.user_id();
-- Should return: user_01HXYZ
```

---

## WorkOS JWT Integration

### JWT Structure

WorkOS issues JWTs with the following claims:

```json
{
  "sub": "user_01HXYZ123ABC", // User ID (WorkOS format)
  "email": "expert@eleva.care",
  "email_verified": true,
  "org_id": "org_01HXYZ456DEF", // Current organization
  "role": "owner", // WorkOS RBAC role
  "iat": 1730678400, // Issued at
  "exp": 1730682000, // Expires at
  "iss": "https://api.workos.com", // Issuer
  "aud": "client_123" // Audience (Client ID)
}
```

### Passing JWT to Neon

```typescript
// lib/integrations/neon/rls-client.ts
import * as schema from '@/drizzle/schema-workos';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

export function getDrizzleClient(jwtToken: string) {
  // Neon HTTP client with JWT authentication
  const sql = neon(process.env.DATABASE_URL!, {
    authToken: jwtToken, // <-- JWT passed here
    fetchOptions: {
      cache: 'no-store', // Disable caching for auth queries
    },
  });

  return drizzle(sql, { schema });
}
```

### Helper Function

```typescript
import { requireAuth } from '@/lib/auth/workos-session';

/**
 * Get database client with automatic RLS enforcement
 * Uses JWT from current WorkOS session
 */
export async function getOrgScopedDb() {
  const session = await requireAuth();

  // JWT automatically validated by Neon Auth
  return getDrizzleClient(session.accessToken);
}
```

---

## RLS Policy Patterns

### Pattern 1: User-Scoped Access

**Use Case:** User can only access their own records

```typescript
// Events table - User can only see their own events
export const EventsTable = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id').notNull(),
    title: text('title').notNull(),
    // ... other fields
  },
  (table) => [
    // RLS: Users can only read/modify their own events
    crudPolicy({
      role: authenticatedRole,
      read: sql`${table.workosUserId} = auth.user_id()`,
      modify: sql`${table.workosUserId} = auth.user_id()`,
    }),
  ],
);
```

**Generated SQL:**

```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_policy" ON events
  FOR SELECT
  TO authenticated
  USING (workos_user_id = auth.user_id());

CREATE POLICY "events_update_policy" ON events
  FOR UPDATE
  TO authenticated
  USING (workos_user_id = auth.user_id())
  WITH CHECK (workos_user_id = auth.user_id());

CREATE POLICY "events_delete_policy" ON events
  FOR DELETE
  TO authenticated
  USING (workos_user_id = auth.user_id());
```

### Pattern 2: Organization-Scoped Access

**Use Case:** User can access all records in their organization(s)

```typescript
// Medical Records - Users can access records in their orgs
export const MedicalRecordsTable = pgTable(
  'medical_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => OrganizationsTable.id),
    patientId: uuid('patient_id').notNull(),
    // ... other fields
  },
  (table) => [
    // RLS: Users can access records from their organizations
    crudPolicy({
      role: authenticatedRole,
      read: sql`EXISTS (
        SELECT 1 FROM user_org_memberships
        WHERE user_org_memberships.org_id = ${table.orgId}
        AND user_org_memberships.workos_user_id = auth.user_id()
        AND user_org_memberships.status = 'active'
      )`,
      modify: sql`EXISTS (
        SELECT 1 FROM user_org_memberships
        WHERE user_org_memberships.org_id = ${table.orgId}
        AND user_org_memberships.workos_user_id = auth.user_id()
        AND user_org_memberships.role IN ('owner', 'admin')
        AND user_org_memberships.status = 'active'
      )`,
    }),
  ],
);
```

### Pattern 3: Role-Based Access

**Use Case:** Different access levels based on organizational role

```typescript
// Organizations - Only owners/admins can modify
export const OrganizationsTable = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosOrgId: text('workos_org_id').unique().notNull(),
    name: text('name').notNull(),
    // ... other fields
  },
  (table) => [
    // RLS: Read if member, modify if owner/admin
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
        AND user_org_memberships.status = 'active'
      )`,
    }),
  ],
);
```

### Pattern 4: Shared Resource Access

**Use Case:** Resources can be shared between users

```typescript
// Notes - Owner access + explicit sharing
export const NotesTable = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: text('owner_id').notNull(),
    shared: boolean('shared').default(false),
    // ... other fields
  },
  (table) => [
    // Policy 1: Owner can do anything
    crudPolicy({
      role: authenticatedRole,
      read: sql`${table.ownerId} = auth.user_id()`,
      modify: sql`${table.ownerId} = auth.user_id()`,
    }),

    // Policy 2: Shared notes are readable by authenticated users
    pgPolicy('shared_notes_select', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${table.shared} = true`,
    }),
  ],
);
```

### Pattern 5: Complex Join-Based Access

**Use Case:** Access determined by relationship in another table

```typescript
// Appointments - Access based on participant role
export const AppointmentsTable = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    expertId: text('expert_id').notNull(),
    patientId: text('patient_id').notNull(),
    // ... other fields
  },
  (table) => [
    // Users can access appointments where they're either expert or patient
    crudPolicy({
      role: authenticatedRole,
      read: sql`(
        ${table.expertId} = auth.user_id() OR 
        ${table.patientId} = auth.user_id()
      )`,
      modify: sql`${table.expertId} = auth.user_id()`, // Only expert can modify
    }),
  ],
);
```

---

## Database Client Setup

### Production Setup

```typescript
// lib/integrations/neon/rls-client.ts
import * as schema from '@/drizzle/schema-workos';
import { requireAuth } from '@/lib/auth/workos-session';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

/**
 * Get Drizzle client with RLS enforcement via JWT
 *
 * @param jwtToken - WorkOS access token
 * @returns Drizzle database instance with RLS enabled
 */
export function getDrizzleClient(jwtToken: string) {
  const sql = neon(process.env.DATABASE_URL!, {
    authToken: jwtToken,
    fetchOptions: {
      cache: 'no-store',
    },
  });

  return drizzle(sql, { schema });
}

/**
 * Get organization-scoped database client
 * Automatically uses JWT from current session
 *
 * @throws {Error} If user not authenticated
 * @returns Drizzle database instance with automatic RLS
 */
export async function getOrgScopedDb() {
  const session = await requireAuth();
  return getDrizzleClient(session.accessToken);
}

/**
 * Get admin database client (bypasses RLS)
 * ⚠️ USE WITH EXTREME CAUTION
 * Only for system-level operations
 */
export function getAdminDb() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Admin DB access not allowed in production');
  }

  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}
```

### Usage in Server Actions

```typescript
// server/actions/events.ts
'use server';

import { EventsTable } from '@/drizzle/schema-workos';
import { requireAuth } from '@/lib/auth/workos-session';
import { getOrgScopedDb } from '@/lib/integrations/neon/rls-client';

// server/actions/events.ts

export async function getUserEvents() {
  // Get session (throws if not authenticated)
  const session = await requireAuth();

  // Get RLS-enabled database
  const db = await getOrgScopedDb();

  // Query automatically filtered by RLS
  const events = await db.select().from(EventsTable).orderBy(EventsTable.createdAt);

  // No need to filter by user ID - RLS does it automatically!
  return events;
}
```

### Usage in API Routes

```typescript
// app/api/events/route.ts
import { EventsTable } from '@/drizzle/schema-workos';
import { getOrgScopedDb } from '@/lib/integrations/neon/rls-client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = await getOrgScopedDb();

    // RLS automatically enforced
    const events = await db.select().from(EventsTable);

    return NextResponse.json({ events });
  } catch (error) {
    if (error.message === 'Not authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw error;
  }
}
```

---

## Testing RLS Policies

### Unit Testing with Test JWTs

```typescript
// tests/lib/neon-rls.test.ts
import { EventsTable } from '@/drizzle/schema-workos';
import { getDrizzleClient } from '@/lib/integrations/neon/rls-client';
import { eq } from 'drizzle-orm';

describe('RLS Policies', () => {
  it('should filter events by user', async () => {
    // Create test JWT
    const testJwt = createTestJWT({
      sub: 'user_test_123',
      email: 'test@example.com',
    });

    const db = getDrizzleClient(testJwt);

    // Query events - should only return events for user_test_123
    const events = await db.select().from(EventsTable);

    // All events should belong to the test user
    events.forEach((event) => {
      expect(event.workosUserId).toBe('user_test_123');
    });
  });

  it('should prevent access to other users data', async () => {
    const userAJwt = createTestJWT({ sub: 'user_a' });
    const dbA = getDrizzleClient(userAJwt);

    // Create event as user A
    const [event] = await dbA
      .insert(EventsTable)
      .values({ title: 'User A Event', workosUserId: 'user_a' })
      .returning();

    // Try to access as user B
    const userBJwt = createTestJWT({ sub: 'user_b' });
    const dbB = getDrizzleClient(userBJwt);

    const result = await dbB.select().from(EventsTable).where(eq(EventsTable.id, event.id));

    // User B should not see user A's event
    expect(result).toHaveLength(0);
  });
});
```

### Manual Testing in psql

```sql
-- Connect to database
psql $DATABASE_URL

-- Simulate authenticated user
SET LOCAL request.jwt.claims = '{"sub":"user_01HXYZ","email":"test@example.com"}';

-- Test auth.user_id()
SELECT auth.user_id();
-- Output: user_01HXYZ

-- Test RLS policy
SELECT * FROM events;
-- Should only return events where workos_user_id = 'user_01HXYZ'

-- Try to access other user's data
SELECT * FROM events WHERE workos_user_id = 'different_user';
-- Should return empty (RLS blocks it)

-- Reset session
RESET request.jwt.claims;
```

### Integration Testing

```typescript
// tests/integration/org-access.test.ts
import { createTestOrg, createTestUser } from './helpers';

describe('Organization Access', () => {
  it('should allow access to org data', async () => {
    // Create test organization and user
    const org = await createTestOrg({ name: 'Test Clinic' });
    const user = await createTestUser({
      email: 'expert@test.com',
      orgId: org.id,
      role: 'owner',
    });

    // Get JWT for user
    const jwt = await getTestJWT(user.id);
    const db = getDrizzleClient(jwt);

    // User should see their org
    const orgs = await db.select().from(OrganizationsTable);
    expect(orgs).toHaveLength(1);
    expect(orgs[0].id).toBe(org.id);
  });

  it('should deny access to other orgs', async () => {
    const org1 = await createTestOrg({ name: 'Clinic 1' });
    const org2 = await createTestOrg({ name: 'Clinic 2' });

    const user1 = await createTestUser({ orgId: org1.id });
    const jwt1 = await getTestJWT(user1.id);
    const db1 = getDrizzleClient(jwt1);

    // User 1 should only see org 1
    const orgs = await db1.select().from(OrganizationsTable);
    expect(orgs).toHaveLength(1);
    expect(orgs[0].id).toBe(org1.id);
    expect(orgs[0].id).not.toBe(org2.id);
  });
});
```

---

## Performance Optimization

### Index Strategies

```sql
-- Index on user ID columns (for RLS filtering)
CREATE INDEX idx_events_workos_user_id
ON events(workos_user_id);

-- Index on org ID (for org-scoped queries)
CREATE INDEX idx_events_org_id
ON events(org_id);

-- Composite index for membership lookups
CREATE INDEX idx_user_org_memberships_lookup
ON user_org_memberships(workos_user_id, org_id, status);

-- Partial index for active memberships
CREATE INDEX idx_user_org_memberships_active
ON user_org_memberships(workos_user_id, org_id)
WHERE status = 'active';
```

### Query Optimization

```typescript
// ✅ Good: Let RLS filter automatically
const events = await db
  .select()
  .from(EventsTable)
  .orderBy(EventsTable.createdAt);

// ❌ Bad: Redundant filtering (RLS already does this)
const session = await requireAuth();
const events = await db
  .select()
  .from(EventsTable)
  .where(eq(EventsTable.workosUserId, session.userId))  // Unnecessary!
  .orderBy(EventsTable.createdAt);
```

### Connection Pooling

```typescript
// Neon Scale plan includes automatic connection pooling
// No additional configuration needed

// For high-traffic scenarios, consider:
const sql = neon(process.env.DATABASE_URL!, {
  authToken: jwtToken,
  fetchOptions: {
    cache: 'no-store',
  },
  // Pooler already configured in connection string:
  // ?pooler=true
});
```

---

## Troubleshooting

### Issue: `auth.user_id()` returns NULL

```sql
-- Check if JWT is being passed
SELECT current_setting('request.jwt.claims', true);
-- Should show JWT claims

-- Verify Neon Auth configuration
SELECT * FROM pg_settings WHERE name LIKE '%jwt%';
```

**Solution:**

```typescript
// Ensure JWT is passed to Neon client
const db = getDrizzleClient(session.accessToken); // ← Must pass JWT
```

### Issue: RLS Policy Denying Expected Access

```sql
-- Disable RLS temporarily for debugging (development only!)
ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- Check what data exists
SELECT * FROM events;

-- Re-enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Test with specific user
SET LOCAL request.jwt.claims = '{"sub":"user_123"}';
SELECT * FROM events;
```

**Solution:**

- Check membership records in `user_org_memberships`
- Verify `status = 'active'`
- Ensure `workos_user_id` matches JWT `sub` claim

### Issue: Performance Degradation

```sql
-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT * FROM events
WHERE workos_user_id = 'user_123';

-- Should show index scan, not sequential scan
```

**Solution:**

- Add missing indexes (see Performance Optimization)
- Analyze tables: `ANALYZE events;`
- Update statistics: `VACUUM ANALYZE;`

### Issue: JWT Validation Failing

```bash
# Test JWKS endpoint
curl https://api.workos.com/.well-known/jwks.json

# Should return public keys

# Verify Neon Auth configuration
neon auth list --project-id=your-project-id
```

**Solution:**

- Verify JWKS URL is correct
- Check JWT expiration
- Ensure JWT audience (`aud`) matches WorkOS client ID

---

## Best Practices

### 1. Always Use Org-Scoped Client

```typescript
// ✅ Good
const db = await getOrgScopedDb();

// ❌ Bad (bypasses RLS)
const db = getAdminDb();
```

### 2. Trust RLS, Don't Double-Filter

```typescript
// ✅ Good - Let RLS handle filtering
const events = await db.select().from(EventsTable);

// ❌ Bad - Redundant filtering
const events = await db
  .select()
  .from(EventsTable)
  .where(eq(EventsTable.workosUserId, userId));
```

### 3. Test RLS Policies Thoroughly

- Unit tests with multiple user contexts
- Integration tests for org access
- Manual testing with different roles

### 4. Monitor JWT Validation

```typescript
// Log JWT validation failures
try {
  const db = await getOrgScopedDb();
} catch (error) {
  console.error('JWT validation failed:', {
    error: error.message,
    userId: session?.userId,
    timestamp: new Date().toISOString(),
  });

  // Alert monitoring service
  Sentry.captureException(error);
}
```

---

## Migration Checklist

When implementing Neon Auth + RLS:

- [ ] Configure Neon Auth with WorkOS JWKS URL
- [ ] Test `auth.user_id()` function in Postgres
- [ ] Create RLS policies for all tables
- [ ] Add necessary indexes for performance
- [ ] Update database client to pass JWT
- [ ] Replace manual context setting with `getOrgScopedDb()`
- [ ] Test RLS with multiple user contexts
- [ ] Monitor performance in production
- [ ] Set up alerts for JWT validation failures

---

## Resources

- [Neon Auth Documentation](https://neon.tech/docs/guides/neon-auth)
- [Postgres RLS Guide](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Drizzle RLS Policies](https://orm.drizzle.team/docs/rls)
- [WorkOS JWT Structure](https://workos.com/docs/reference/authentication)

---

**Questions?** Contact: infrastructure@eleva.care
