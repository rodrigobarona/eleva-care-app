<!-- 7ad57dce-f4e9-445f-b7ca-2e0cfd0c35f2 75f5fc98-0b98-4f82-b6cc-dc1696df9b8e -->
# Clerk to WorkOS Migration Plan

## Phase 1: Critical Build Fixes (Priority P0)

### 1.1 Fix Field Name Mismatches (55+ files)

**Problem**: Code uses `clerkUserId` but new schema expects `workosUserId`

**Files to Update**:

#### Core Schema Files

- `schema/meetings.ts` - Line 44, 63: Rename `clerkUserId` to `workosUserId`
- `schema/profile.ts` - Update any clerkUserId references

#### Server Actions (10 files)

- `server/actions/meetings.ts` - Lines 163, 234, 255, 272, 295, 314, 333, 355, 372
                                                                                                                                - Replace `data.clerkUserId` with `data.workosUserId`
                                                                                                                                - Replace `clerkUserId` parameter names
- `server/actions/schedule.ts`
- `server/actions/expert-profile.ts`
- `server/actions/events.ts`
- `server/actions/user-sync.ts`
- `server/actions/profile.ts`
- `server/actions/experts.ts`
- `server/actions/expert-setup.ts`
- `server/actions/blocked-dates.ts`
- `server/actions/billing.ts`

#### Client Components

- `components/features/forms/MeetingForm.tsx` - Line 726: Change `clerkUserId: workosUserId` to `workosUserId: workosUserId`

#### API Routes

- `app/api/webhooks/stripe/route.ts`
- All files in `app/api/webhooks/stripe/handlers/`

**Strategy**:

```bash
# Safe find-and-replace approach
1. Update validation schemas first (schema/meetings.ts, schema/profile.ts)
2. Update server actions one-by-one with tests
3. Update components and API routes
4. Run type checking: pnpm tsc --noEmit
```

### 1.2 Fix Audit Import Paths (14 files)

**Problem**: Code imports old audit system instead of WorkOS audit

**Current**: `import { logAuditEvent } from '@/lib/utils/server/audit';`

**Target**: `import { logAuditEvent } from '@/lib/utils/server/audit-workos';`

**Function Signature Change**:

```typescript
// OLD (8 parameters)
await logAuditEvent(
  workosUserId,
  action,
  resourceType,
  resourceId,
  oldValues,
  newValues,
  ipAddress,
  userAgent
);

// NEW (3-5 parameters, automatic context)
await logAuditEvent(
  action,
  resourceType,
  resourceId,
  { oldValues, newValues }, // optional
  metadata // optional
);
```

**Files to Update**:

- `server/actions/meetings.ts`
- `server/actions/schedule.ts`
- `server/actions/expert-profile.ts`
- `server/actions/events.ts`
- `app/api/webhooks/stripe/handlers/payment.ts`
- `app/api/records/route.ts`
- `app/api/appointments/[meetingId]/records/route.ts`

**Strategy**: Update imports, then refactor each logAuditEvent call to remove manual context

### 1.3 Fix Schema Import Paths (10+ files)

**Problem**: Server actions import old Clerk schema

**Current**: `import { MeetingsTable } from '@/drizzle/schema';`

**Target**: `import { MeetingsTable } from '@/drizzle/schema-workos';`

**Note**: `drizzle/db.ts` already correctly imports from `schema-workos` (Line 4)

**Files to Update**: All files in `server/actions/` directory

**Table Name Changes** (singular → plural):

- `EventTable` → `EventsTable`
- `ScheduleTable` → `SchedulesTable`
- `ScheduleAvailabilityTable` → `ScheduleAvailabilitiesTable`
- `MeetingTable` → `MeetingsTable`
- `CategoryTable` → `CategoriesTable`
- `ProfileTable` → `ProfilesTable`
- `RecordTable` → `RecordsTable`
- `UserTable` → `UsersTable`
- `SlotReservationTable` → `SlotReservationsTable`
- `BlockedDatesTable` → `BlockedDatesTable` (no change)
- `PaymentTransferTable` → `PaymentTransfersTable`

---

## Phase 2: Guest User Auto-Registration System

### 2.1 Create Guest User Service

**New File**: `lib/integrations/workos/guest-users.ts`

```typescript
'use server';

import { workos } from '@/lib/integrations/workos/client';
import { db } from '@/drizzle/db';
import { UsersTable, OrganizationsTable, UserOrgMembershipsTable } from '@/drizzle/schema-workos';
import { eq } from 'drizzle-orm';

/**
 * Auto-create WorkOS user for guest booking
 * Creates user + personal organization (org-per-user model)
 * 
 * Flow:
 * 1. Check if user exists by email
 * 2. If not, create WorkOS user (emailVerified: false)
 * 3. Create personal organization
 * 4. Create membership (owner role)
 * 5. Send magic link email for dashboard access
 */
export async function createOrGetGuestUser(params: {
  email: string;
  name: string;
  metadata?: Record<string, unknown>;
}) {
  const { email, name, metadata } = params;
  
  // Check if user already exists
  const existingUser = await db.query.UsersTable.findFirst({
    where: eq(UsersTable.email, email)
  });
  
  if (existingUser) {
    return {
      userId: existingUser.workosUserId,
      organizationId: existingUser.organizationId,
      isNewUser: false
    };
  }
  
  // Split name into first/last
  const [firstName, ...lastNameParts] = name.split(' ');
  const lastName = lastNameParts.join(' ') || '';
  
  // Create WorkOS user
  const workosUser = await workos.userManagement.createUser({
    email,
    firstName,
    lastName,
    emailVerified: false, // Guest hasn't verified yet
    metadata: {
      ...metadata,
      registrationType: 'guest',
      registeredAt: new Date().toISOString()
    }
  });
  
  // Create personal organization
  const orgSlug = `user-${workosUser.id}`;
  const workosOrg = await workos.organizations.createOrganization({
    name: `${name}'s Account`,
    domainData: [], // No domain verification for guests
  });
  
  // Insert into database
  const [org] = await db.insert(OrganizationsTable).values({
    workosOrgId: workosOrg.id,
    slug: orgSlug,
    name: `${name}'s Account`,
    type: 'patient_personal'
  }).returning();
  
  const [user] = await db.insert(UsersTable).values({
    workosUserId: workosUser.id,
    email,
    firstName,
    lastName
  }).returning();
  
  // Create membership
  await workos.userManagement.createOrganizationMembership({
    userId: workosUser.id,
    organizationId: workosOrg.id,
    roleSlug: 'owner'
  });
  
  await db.insert(UserOrgMembershipsTable).values({
    workosUserId: workosUser.id,
    orgId: org.id,
    role: 'owner',
    status: 'active'
  });
  
  // Send magic link for dashboard access (optional)
  await workos.userManagement.sendMagicAuth({
    email,
    expiresIn: 604800 // 7 days
  });
  
  return {
    userId: workosUser.id,
    organizationId: org.id,
    isNewUser: true
  };
}
```

### 2.2 Update Meeting Creation Flow

**File**: `server/actions/meetings.ts`

Add guest user creation before meeting creation:

```typescript
// Import guest user service
import { createOrGetGuestUser } from '@/lib/integrations/workos/guest-users';

export async function createMeeting(unsafeData: z.infer<typeof meetingActionSchema>) {
  const { success, data } = meetingActionSchema.safeParse(unsafeData);
  if (!success) return { error: true, code: 'VALIDATION_ERROR' };

  try {
    // NEW: Auto-create guest user if needed
    const { userId: guestWorkosUserId, organizationId: guestOrgId } = 
      await createOrGetGuestUser({
        email: data.guestEmail,
        name: data.guestName,
        metadata: {
          bookingEventId: data.eventId,
          bookingStartTime: data.startTime.toISOString()
        }
      });

    // ... existing validation code ...

    // Create meeting record with guest WorkOS ID
    const [meeting] = await db.insert(MeetingsTable).values({
      eventId: data.eventId,
      workosUserId: data.workosUserId, // Expert's ID
      guestWorkosUserId, // NEW: Store guest's WorkOS ID
      guestEmail: data.guestEmail, // Keep for backward compatibility
      guestName: data.guestName, // Keep for backward compatibility
      guestOrgId, // NEW: Guest's organization ID
      guestNotes: data.guestNotes,
      startTime: startTimeUTC,
      endTime: endTimeUTC,
      timezone: data.timezone,
      meetingUrl: meetingUrl,
      // ... stripe fields ...
    }).returning();

    // ... rest of function ...
  }
}
```

### 2.3 Update Database Schema

**File**: `drizzle/schema-workos.ts`

Add guest user fields to MeetingsTable (around line 269):

```typescript
export const MeetingsTable = pgTable(
  'meetings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').references(() => OrganizationsTable.id),
    eventId: uuid('event_id').notNull().references(() => EventsTable.id),
    
    // Expert (meeting host)
    workosUserId: text('workos_user_id').notNull(),
    
    // Guest (patient/customer) - NEW FIELDS
    guestWorkosUserId: text('guest_workos_user_id'), // NEW: Guest's WorkOS ID
    guestOrgId: uuid('guest_org_id'), // NEW: Guest's organization
    
    // Keep legacy fields for backward compatibility during migration
    guestEmail: text('guest_email').notNull(),
    guestName: text('guest_name').notNull(),
    guestNotes: text('guest_notes'),
    
    // ... rest of fields ...
  }
);
```

**Generate and apply migration**:

```bash
pnpm db:generate
pnpm db:migrate
```

### 2.4 Update MeetingForm Component

**File**: `components/features/forms/MeetingForm.tsx`

No changes needed! Guest registration happens server-side transparently.

Optional: Add success message after booking:

```typescript
// After successful booking (line 735+)
if (!data?.error) {
  // Show success message about dashboard access
  toast.success(
    'Booking confirmed! Check your email for dashboard access.',
    { duration: 5000 }
  );
  
  router.push(`/${locale}/${username}/${eventSlug}/success?...`);
}
```

---

## Phase 3: Legacy Data Migration

### 3.1 Create Migration Scripts

**New File**: `scripts/migrate-users-to-workos.ts`

```typescript
/**
 * Migration Script: Clerk → WorkOS Users
 * 
 * Steps:
 * 1. Export users from legacy database (schema.ts)
 * 2. Create WorkOS users via API
 * 3. Create personal organizations
 * 4. Create memberships
 * 5. Insert into new database (schema-workos.ts)
 * 6. Create mapping table for reference
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { workos } from '@/lib/integrations/workos/client';
import * as legacySchema from '@/drizzle/schema';
import * as newSchema from '@/drizzle/schema-workos';

const legacyDb = drizzle(neon(process.env.DATABASE_URL_LEGACY!), { 
  schema: legacySchema 
});

const newDb = drizzle(neon(process.env.DATABASE_URL!), { 
  schema: newSchema 
});

async function migrateUsers() {
  console.log('Starting user migration...');
  
  // Fetch all users from legacy database
  const legacyUsers = await legacyDb.query.UserTable.findMany();
  
  console.log(`Found ${legacyUsers.length} users to migrate`);
  
  const migrationMap: Array<{
    clerkUserId: string;
    workosUserId: string;
    organizationId: string;
  }> = [];
  
  for (const legacyUser of legacyUsers) {
    try {
      // Create WorkOS user
      const workosUser = await workos.userManagement.createUser({
        email: legacyUser.email,
        firstName: legacyUser.firstName || '',
        lastName: legacyUser.lastName || '',
        emailVerified: true, // Existing users are verified
        metadata: {
          migratedFrom: 'clerk',
          clerkUserId: legacyUser.clerkUserId,
          migratedAt: new Date().toISOString()
        }
      });
      
      // Create personal organization
      const orgSlug = `user-${workosUser.id}`;
      const workosOrg = await workos.organizations.createOrganization({
        name: `${legacyUser.firstName}'s Account`,
        domainData: []
      });
      
      // Insert into new database
      const [org] = await newDb.insert(newSchema.OrganizationsTable).values({
        workosOrgId: workosOrg.id,
        slug: orgSlug,
        name: `${legacyUser.firstName}'s Account`,
        type: legacyUser.stripeConnectAccountId ? 'expert_individual' : 'patient_personal'
      }).returning();
      
      await newDb.insert(newSchema.UsersTable).values({
        workosUserId: workosUser.id,
        email: legacyUser.email,
        firstName: legacyUser.firstName,
        lastName: legacyUser.lastName,
        stripeCustomerId: legacyUser.stripeCustomerId,
        stripeConnectAccountId: legacyUser.stripeConnectAccountId,
        // ... copy all Stripe fields ...
      });
      
      // Create membership
      await workos.userManagement.createOrganizationMembership({
        userId: workosUser.id,
        organizationId: workosOrg.id,
        roleSlug: 'owner'
      });
      
      await newDb.insert(newSchema.UserOrgMembershipsTable).values({
        workosUserId: workosUser.id,
        orgId: org.id,
        role: 'owner',
        status: 'active'
      });
      
      migrationMap.push({
        clerkUserId: legacyUser.clerkUserId,
        workosUserId: workosUser.id,
        organizationId: org.id
      });
      
      console.log(`✅ Migrated user: ${legacyUser.email}`);
      
    } catch (error) {
      console.error(`❌ Failed to migrate user ${legacyUser.email}:`, error);
    }
  }
  
  // Save migration map
  const fs = await import('fs/promises');
  await fs.writeFile(
    'migration-user-map.json',
    JSON.stringify(migrationMap, null, 2)
  );
  
  console.log(`Migration complete! Map saved to migration-user-map.json`);
}

migrateUsers().catch(console.error);
```

**New File**: `scripts/migrate-data-with-orgid.ts`

```typescript
/**
 * Migrate all app data and add orgId
 * 
 * Uses migration map to add orgId to all records
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as legacySchema from '@/drizzle/schema';
import * as newSchema from '@/drizzle/schema-workos';
import migrationMap from '../migration-user-map.json';

// Create mapping objects
const clerkToWorkos = new Map(
  migrationMap.map(m => [m.clerkUserId, m.workosUserId])
);

const clerkToOrg = new Map(
  migrationMap.map(m => [m.clerkUserId, m.organizationId])
);

async function migrateEvents() {
  const legacyEvents = await legacyDb.query.EventTable.findMany();
  
  for (const event of legacyEvents) {
    const workosUserId = clerkToWorkos.get(event.clerkUserId);
    const orgId = clerkToOrg.get(event.clerkUserId);
    
    if (!workosUserId || !orgId) {
      console.error(`No mapping for user: ${event.clerkUserId}`);
      continue;
    }
    
    await newDb.insert(newSchema.EventsTable).values({
      id: event.id,
      workosUserId,
      orgId, // NEW: Add organization ID
      name: event.name,
      slug: event.slug,
      // ... copy all fields ...
    });
  }
  
  console.log('✅ Events migrated');
}

async function migrateMeetings() {
  const legacyMeetings = await legacyDb.query.MeetingTable.findMany();
  
  for (const meeting of legacyMeetings) {
    const expertWorkosId = clerkToWorkos.get(meeting.clerkUserId);
    const expertOrgId = clerkToOrg.get(meeting.clerkUserId);
    
    // For meetings, we need to handle guest users
    // If guest email exists in users, get their WorkOS ID
    // Otherwise, they'll be created on-demand
    
    await newDb.insert(newSchema.MeetingsTable).values({
      id: meeting.id,
      workosUserId: expertWorkosId!,
      orgId: expertOrgId!, // Expert's org
      guestEmail: meeting.guestEmail,
      guestName: meeting.guestName,
      // guestWorkosUserId will be null for legacy meetings
      // Will be populated when guest logs in
      // ... copy all fields ...
    });
  }
  
  console.log('✅ Meetings migrated');
}

// Run all migrations
async function runMigration() {
  await migrateEvents();
  await migrateMeetings();
  // ... migrate other tables ...
}

runMigration().catch(console.error);
```

### 3.2 Validation Scripts

**New File**: `scripts/validate-migration.ts`

```typescript
/**
 * Validate data integrity after migration
 */

async function validateMigration() {
  // Check all users have organizations
  const usersWithoutOrg = await newDb.query.UsersTable.findMany({
    where: isNull(UsersTable.organizationId)
  });
  
  if (usersWithoutOrg.length > 0) {
    console.error(`❌ ${usersWithoutOrg.length} users missing organizations`);
  }
  
  // Check all events have orgId
  const eventsWithoutOrg = await newDb.query.EventsTable.findMany({
    where: isNull(EventsTable.orgId)
  });
  
  if (eventsWithoutOrg.length > 0) {
    console.error(`❌ ${eventsWithoutOrg.length} events missing orgId`);
  }
  
  // ... more validation checks ...
  
  console.log('✅ Migration validation complete');
}
```

---

## Phase 4: Schema Consolidation

### 4.1 Rename Schema Files

Once migration is complete and validated:

```bash
# Backup legacy schema
mv drizzle/schema.ts drizzle/schema-legacy.ts

# Promote WorkOS schema to main
mv drizzle/schema-workos.ts drizzle/schema.ts

# Update db.ts
# Change: import * as schema from './schema-workos';
# To:     import * as schema from './schema';
```

### 4.2 Update All Imports

**Strategy**: Now that schema-workos.ts IS schema.ts, all imports automatically work.

Just need to update any remaining references:

```bash
# Find any stragglers
grep -r "schema-workos" --include="*.ts" --include="*.tsx" .

# Should only find in legacy/backup files
```

---

## Phase 5: Neon Auth Configuration

### 5.1 Configure Neon Data API

**Via Neon Console UI**:

1. Go to Neon Console → Your Project → Data API (Beta)
2. Enable Data API
3. Configure Authentication Provider:

                                                                                                                                                                                                - Provider: "Other Provider"
                                                                                                                                                                                                - JWKS URL: `https://api.workos.com/.well-known/jwks.json`
                                                                                                                                                                                                - JWT Audience: Leave blank or `api://default`

4. Check: "Grant public schema access to authenticated users"
5. Save

### 5.2 Create RLS Policies

**File**: `drizzle/migrations-manual/001_enable_rls.sql`

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

-- Meetings: Experts see their meetings, guests see their bookings
CREATE POLICY meetings_expert_access ON meetings
FOR ALL USING (workos_user_id = auth.user_id());

CREATE POLICY meetings_guest_access ON meetings
FOR SELECT USING (guest_workos_user_id = auth.user_id());

-- ... more RLS policies ...
```

**Apply**:

```bash
psql $DATABASE_URL -f drizzle/migrations-manual/001_enable_rls.sql
```

---

## Phase 6: Testing & Validation

### 6.1 Integration Tests

Create comprehensive tests for:

- Guest user auto-creation
- Meeting creation with WorkOS IDs
- RLS policy enforcement
- Data migration integrity

### 6.2 Manual Testing Checklist

- [ ] New guest can book meeting (auto-registered)
- [ ] Guest receives magic link email
- [ ] Guest can access dashboard
- [ ] Expert sees meeting in calendar
- [ ] RLS prevents cross-org data access
- [ ] Migrated users can log in
- [ ] All Stripe integrations work
- [ ] Audit logging captures events

---

## Phase 7: Production Deployment

### 7.1 Pre-Deployment

1. Backup legacy database
2. Run migration scripts on production replica
3. Validate migration results
4. Test RLS policies
5. Verify WorkOS integration

### 7.2 Deployment Steps

1. Enable maintenance mode
2. Run migration scripts
3. Apply RLS policies
4. Deploy new code
5. Verify all systems operational
6. Disable maintenance mode
7. Monitor for issues

### 7.3 Rollback Plan

If issues occur:

1. Revert to legacy schema
2. Restore from backup
3. Investigate issues
4. Fix and retry

---

## Success Criteria

- [ ] All build errors resolved
- [ ] Guests auto-registered as WorkOS users
- [ ] All legacy data migrated with orgId
- [ ] RLS policies enforced
- [ ] Single schema file (schema.ts)
- [ ] All tests passing
- [ ] Production deployment successful
- [ ] Zero downtime migration

## Timeline

- Phase 1: 1-2 days
- Phase 2: 2-3 days  
- Phase 3: 3-4 days
- Phase 4: 1 day
- Phase 5: 1 day
- Phase 6: 2-3 days
- Phase 7: 1 day

**Total: 11-17 days**

### To-dos

- [ ] Fix clerkUserId → workosUserId in 55+ files (schemas, server actions, components, API routes)
- [ ] Update audit import paths and refactor function calls (14 files)
- [ ] Update schema imports from schema.ts to schema-workos.ts (10+ files)
- [ ] Create lib/integrations/workos/guest-users.ts with auto-registration logic
- [ ] Add guestWorkosUserId and guestOrgId fields to MeetingsTable
- [ ] Integrate guest user creation in server/actions/meetings.ts
- [ ] Create scripts/migrate-users-to-workos.ts for Clerk → WorkOS user migration
- [ ] Create scripts/migrate-data-with-orgid.ts to migrate events, meetings, etc with orgId
- [ ] Create scripts/validate-migration.ts to verify data integrity
- [ ] Configure Neon Data API with WorkOS JWKS URL
- [ ] Create and apply RLS policies (drizzle/migrations-manual/001_enable_rls.sql)
- [ ] Execute user and data migration scripts on production replica
- [ ] Rename schema-workos.ts to schema.ts after successful migration
- [ ] Run comprehensive integration tests for all migration changes
- [ ] Deploy to production with monitoring and rollback plan ready