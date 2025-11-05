# WorkOS Migration: Roles, Permissions & Setup Management

## 📊 Current State Analysis

### Clerk Metadata Usage

**Public Metadata** (stored in Clerk):

```typescript
{
  "role": ["admin", "top_expert"],  // User roles
  "securityPreferences": {
    "securityAlerts": true,
    "newDeviceAlerts": false,
    "emailNotifications": true,
    "inAppNotifications": true,
    "unusualTimingAlerts": true,
    "locationChangeAlerts": true
  }
}
```

**Unsafe Metadata** (stored in Clerk):

```typescript
{
  "expertSetup": {
    "events": true,
    "payment": true,
    "profile": true,
    "identity": true,
    "availability": true,
    "google_account": true
  },
  "setupComplete": true
}
```

### Where It's Used

1. **Roles** (`publicMetadata.role`):
   - ✅ Middleware route protection (`proxy.ts`)
   - ✅ Server-side role checks (`lib/auth/roles.server.ts`)
   - ✅ Client-side authorization (`AuthorizationProvider.tsx`)
   - ✅ Dashboard conditional rendering

2. **Expert Setup** (`unsafeMetadata.expertSetup`):
   - ✅ Setup completion tracking (`server/actions/expert-setup.ts`)
   - ✅ Setup page UI (`app/(private)/setup/page.tsx`)
   - ✅ Dashboard setup banner
   - ✅ Profile publishing gate

3. **Security Preferences** (`publicMetadata.securityPreferences`):
   - ✅ Security alerts (`lib/integrations/clerk/security-utils.ts`)
   - ✅ Device tracking
   - ✅ Location anomaly detection

---

## 🎯 WorkOS Best Practices

### 1. Roles & Permissions: Use WorkOS RBAC ✅

**WorkOS provides built-in RBAC via Organization Memberships:**

```typescript
// WorkOS RBAC roles (managed in WorkOS Dashboard)
-'owner' - // Org creator (full access)
  'admin' - // Org administrator
  'member' - // Regular member
  'billing_admin'; // Billing-only access
```

**Best Practice**: Store roles in **WorkOS Organization Memberships**, NOT in user metadata.

**Why**:

- ✅ Centralized management in WorkOS Dashboard
- ✅ Multi-org support (user can have different roles in different orgs)
- ✅ Built-in permission system
- ✅ Audit trail in WorkOS
- ✅ JWT includes role automatically

### 2. Application State: Store in Database ✅

**Expert Setup Status** → Store in **database** (`ProfilesTable` or new `ExpertSetupTable`)

**Why**:

- ✅ Setup is application-specific (not authentication-related)
- ✅ Can query efficiently (no API calls)
- ✅ Can add indexes for performance
- ✅ Can add relationships (e.g., which profile completed which step)
- ✅ Can version/audit changes

### 3. User Preferences: Store in Database ✅

**Security Preferences** → Store in **database** (`UsersTable` or new `UserPreferencesTable`)

**Why**:

- ✅ Application-specific settings
- ✅ Can query efficiently
- ✅ Can add defaults easily
- ✅ Can version preferences

---

## 🔄 Migration Strategy

### Phase 1: Database Schema Updates

#### 1.1 Add Expert Setup Table

**New Table**: `expert_setup`

```typescript
export const ExpertSetupTable = pgTable(
  'expert_setup',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id').notNull().unique(),
    orgId: uuid('org_id').references(() => OrganizationsTable.id),

    // Setup steps (checkboxes)
    profileCompleted: boolean('profile_completed').default(false),
    availabilityCompleted: boolean('availability_completed').default(false),
    eventsCompleted: boolean('events_completed').default(false),
    identityCompleted: boolean('identity_completed').default(false),
    paymentCompleted: boolean('payment_completed').default(false),
    googleAccountCompleted: boolean('google_account_completed').default(false),

    // Overall status
    setupComplete: boolean('setup_complete').default(false),
    setupCompletedAt: timestamp('setup_completed_at'),

    // Timestamps
    createdAt,
    updatedAt,
  },
  (table) => ({
    userIdIndex: index('expert_setup_user_id_idx').on(table.workosUserId),
    orgIdIndex: index('expert_setup_org_id_idx').on(table.orgId),
  }),
);
```

**Benefits**:

- ✅ Single source of truth
- ✅ Queryable (`WHERE setupComplete = true`)
- ✅ Can add relationships (e.g., which expert completed setup)
- ✅ Can track completion dates
- ✅ Can add more fields later (e.g., `lastStepCompleted`)

#### 1.2 Add User Preferences Table

**New Table**: `user_preferences`

```typescript
export const UserPreferencesTable = pgTable(
  'user_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id').notNull().unique(),
    orgId: uuid('org_id').references(() => OrganizationsTable.id),

    // Security preferences
    securityAlerts: boolean('security_alerts').default(true),
    newDeviceAlerts: boolean('new_device_alerts').default(false),
    emailNotifications: boolean('email_notifications').default(true),
    inAppNotifications: boolean('in_app_notifications').default(true),
    unusualTimingAlerts: boolean('unusual_timing_alerts').default(true),
    locationChangeAlerts: boolean('location_change_alerts').default(true),

    // UI preferences (future)
    theme: text('theme').default('light'), // 'light' | 'dark' | 'system'
    language: text('language').default('en'),

    // Timestamps
    createdAt,
    updatedAt,
  },
  (table) => ({
    userIdIndex: index('user_preferences_user_id_idx').on(table.workosUserId),
  }),
);
```

**Benefits**:

- ✅ Defaults defined in schema
- ✅ Can add more preferences easily
- ✅ Can query by preference (e.g., "users who want email notifications")
- ✅ Can migrate preferences between users

#### 1.3 Update UserOrgMembershipsTable

**Already exists!** ✅ Just need to ensure role is synced from WorkOS:

```typescript
// Current schema already has:
role: text('role').notNull(), // 'owner' | 'admin' | 'member' | 'billing_admin'
```

**Migration**: Sync roles from WorkOS memberships to database cache.

---

### Phase 2: WorkOS Role Management

#### 2.1 Create Role Slugs in WorkOS Dashboard

**WorkOS Dashboard → Your App → RBAC → Roles**:

1. **Create role slugs**:
   - `expert_top` (Top Expert)
   - `expert_community` (Community Expert)
   - `expert_lecturer` (Lecturer)
   - `admin` (Admin)
   - `superadmin` (Super Admin)

2. **Assign permissions** to each role (if using WorkOS FGA)

#### 2.2 Role Assignment Strategy

**Option A: Organization-Based Roles** (Recommended ✅)

```typescript
// Each user gets their own org
// Role is stored in membership:
{
  userId: 'user_123',
  organizationId: 'org_123',
  role: 'owner' // Always owner for personal orgs
}

// For application roles (expert, admin), store in database:
// Option 1: Add role column to UsersTable
// Option 2: Use organization type (expert_individual, patient_personal)
```

**Option B: Metadata-Based Roles** (Not Recommended ❌)

```typescript
// Store in WorkOS user metadata
workos.userManagement.updateUser(userId, {
  metadata: {
    roles: ['expert_top', 'admin'],
  },
});
```

**Why Option A is better**:

- ✅ Roles are tied to organizations (multi-org ready)
- ✅ Can use WorkOS RBAC permissions
- ✅ JWT includes role automatically
- ✅ Audit trail in WorkOS
- ✅ Can invite users to orgs with specific roles

**Implementation**:

- Store application roles in `UsersTable.role` (enum: `'expert_top' | 'expert_community' | 'admin' | 'user'`)
- WorkOS membership role is always `'owner'` for personal orgs
- For multi-member orgs (future), use WorkOS membership roles

---

### Phase 3: Migration Functions

#### 3.1 Migrate Roles

**File**: `lib/integrations/workos/roles.ts`

```typescript
/**
 * Get user roles from WorkOS + Database
 *
 * Priority:
 * 1. Database role (application-specific: expert_top, admin, etc.)
 * 2. WorkOS membership role (org-based: owner, admin, member)
 * 3. Default: 'user'
 */
export async function getUserRoles(workosUserId: string): Promise<string[]> {
  const dbUser = await db.query.UsersTable.findFirst({
    where: eq(UsersTable.workosUserId, workosUserId),
    columns: {
      role: true, // Application role from database
    },
  });

  const memberships = await db.query.UserOrgMembershipsTable.findMany({
    where: eq(UserOrgMembershipsTable.workosUserId, workosUserId),
    columns: {
      role: true, // WorkOS RBAC role
      orgId: true,
    },
  });

  const roles: string[] = [];

  // Add application role
  if (dbUser?.role) {
    roles.push(dbUser.role);
  }

  // Add WorkOS membership roles
  memberships.forEach((m) => {
    if (!roles.includes(m.role)) {
      roles.push(m.role);
    }
  });

  return roles.length > 0 ? roles : ['user'];
}
```

#### 3.2 Migrate Expert Setup

**File**: `server/actions/expert-setup-workos.ts`

```typescript
/**
 * Check expert setup status from database
 */
export async function checkExpertSetupStatus() {
  const session = await requireAuth();

  // Get setup status from database
  const setup = await db.query.ExpertSetupTable.findFirst({
    where: eq(ExpertSetupTable.workosUserId, session.userId),
  });

  if (!setup) {
    // Initialize setup record
    const [newSetup] = await db
      .insert(ExpertSetupTable)
      .values({
        workosUserId: session.userId,
        orgId: session.organizationId!,
      })
      .returning();

    return {
      success: true,
      setupStatus: {
        profile: false,
        availability: false,
        events: false,
        identity: false,
        payment: false,
        google_account: false,
      },
      isSetupComplete: false,
    };
  }

  return {
    success: true,
    setupStatus: {
      profile: setup.profileCompleted,
      availability: setup.availabilityCompleted,
      events: setup.eventsCompleted,
      identity: setup.identityCompleted,
      payment: setup.paymentCompleted,
      google_account: setup.googleAccountCompleted,
    },
    isSetupComplete: setup.setupComplete,
  };
}

/**
 * Mark setup step as complete
 */
export async function markStepComplete(step: ExpertSetupStep) {
  const session = await requireAuth();

  // Get current setup
  const setup = await db.query.ExpertSetupTable.findFirst({
    where: eq(ExpertSetupTable.workosUserId, session.userId),
  });

  if (!setup) {
    throw new Error('Setup record not found');
  }

  // Update step
  const updateField = `${step}Completed` as keyof typeof setup;
  const updatedSetup = {
    ...setup,
    [updateField]: true,
  };

  // Check if all steps complete
  const allComplete =
    updatedSetup.profileCompleted &&
    updatedSetup.availabilityCompleted &&
    updatedSetup.eventsCompleted &&
    updatedSetup.identityCompleted &&
    updatedSetup.paymentCompleted &&
    updatedSetup.googleAccountCompleted;

  // Update database
  await db
    .update(ExpertSetupTable)
    .set({
      [updateField]: true,
      setupComplete: allComplete,
      setupCompletedAt: allComplete ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(ExpertSetupTable.workosUserId, session.userId));

  return {
    success: true,
    setupStatus: {
      profile: updatedSetup.profileCompleted,
      availability: updatedSetup.availabilityCompleted,
      events: updatedSetup.eventsCompleted,
      identity: updatedSetup.identityCompleted,
      payment: updatedSetup.paymentCompleted,
      google_account: updatedSetup.googleAccountCompleted,
    },
    isSetupComplete: allComplete,
  };
}
```

#### 3.3 Migrate User Preferences

**File**: `lib/integrations/workos/preferences.ts`

```typescript
/**
 * Get user preferences from database
 */
export async function getUserPreferences(workosUserId: string) {
  const prefs = await db.query.UserPreferencesTable.findFirst({
    where: eq(UserPreferencesTable.workosUserId, workosUserId),
  });

  if (!prefs) {
    // Return defaults
    return {
      securityAlerts: true,
      newDeviceAlerts: false,
      emailNotifications: true,
      inAppNotifications: true,
      unusualTimingAlerts: true,
      locationChangeAlerts: true,
    };
  }

  return prefs;
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  workosUserId: string,
  preferences: Partial<UserPreferences>,
) {
  const existing = await db.query.UserPreferencesTable.findFirst({
    where: eq(UserPreferencesTable.workosUserId, workosUserId),
  });

  if (existing) {
    await db
      .update(UserPreferencesTable)
      .set({ ...preferences, updatedAt: new Date() })
      .where(eq(UserPreferencesTable.workosUserId, workosUserId));
  } else {
    await db.insert(UserPreferencesTable).values({
      workosUserId,
      orgId: session.organizationId!,
      ...preferences,
    });
  }
}
```

---

## 🎯 Recommended Architecture

### Roles: Hybrid Approach ✅

**Application Roles** (stored in database):

```typescript
// UsersTable.role
type ApplicationRole =
  | 'user' // Regular user/patient
  | 'expert_top' // Top expert
  | 'expert_community' // Community expert
  | 'expert_lecturer' // Lecturer
  | 'admin' // Admin
  | 'superadmin'; // Super admin
```

**WorkOS Membership Roles** (from WorkOS):

```typescript
// UserOrgMembershipsTable.role
type MembershipRole =
  | 'owner' // Org owner (always for personal orgs)
  | 'admin' // Org admin
  | 'member' // Regular member
  | 'billing_admin'; // Billing admin
```

**Why Hybrid**:

- ✅ Application roles (`expert_top`) are app-specific → database
- ✅ Org membership roles (`owner`) are WorkOS-managed → WorkOS
- ✅ Can query both efficiently
- ✅ Multi-org ready (different roles in different orgs)

### Setup Status: Database Only ✅

**Store in `ExpertSetupTable`**:

- ✅ Queryable (`WHERE setupComplete = true`)
- ✅ Can add relationships
- ✅ Can track completion dates
- ✅ Can version changes

### Security Preferences: Database Only ✅

**Store in `UserPreferencesTable`**:

- ✅ Application-specific settings
- ✅ Can query efficiently
- ✅ Can add defaults in schema
- ✅ Can migrate easily

---

## 📋 Migration Checklist

### Database Schema

- [ ] Create `ExpertSetupTable` with all setup steps
- [ ] Create `UserPreferencesTable` with security preferences
- [ ] Add `role` column to `UsersTable` (application role)
- [ ] Create indexes for performance
- [ ] Create migration script

### WorkOS Configuration

- [ ] Create role slugs in WorkOS Dashboard (if using FGA)
- [ ] Verify organization memberships sync roles correctly
- [ ] Test JWT includes role claims

### Code Migration

- [ ] Create `lib/integrations/workos/roles.ts` for role checking
- [ ] Create `server/actions/expert-setup-workos.ts` for setup tracking
- [ ] Create `lib/integrations/workos/preferences.ts` for preferences
- [ ] Update `lib/auth/roles.server.ts` to use database + WorkOS
- [ ] Update `proxy.ts` to use new role system
- [ ] Update `app/(private)/dashboard/page.tsx` to use WorkOS session
- [ ] Update `app/(private)/setup/page.tsx` to use database setup
- [ ] Update all components using Clerk metadata

### Migration Scripts

- [ ] Create script to migrate roles from Clerk → Database
- [ ] Create script to migrate expert setup from Clerk → Database
- [ ] Create script to migrate preferences from Clerk → Database
- [ ] Create validation script to verify migration

---

## 🚀 Next Steps

1. **Create database tables** for expert setup and preferences
2. **Migrate roles** to use WorkOS memberships + database
3. **Update all `(private)/` pages** to use WorkOS session
4. **Test** with existing expert user

---

## 📚 References

- [WorkOS RBAC Documentation](https://workos.com/docs/rbac)
- [WorkOS Organization Memberships](https://workos.com/docs/user-management/organizations)
- [WorkOS User Metadata](https://workos.com/docs/user-management/users)
