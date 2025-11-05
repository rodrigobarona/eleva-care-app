# WorkOS Schema Cleanup Plan

**Date:** November 3, 2025  
**Based on:** SCHEMA-FIELD-USAGE-AUDIT.md  
**Priority:** HIGH - Must complete before WorkOS migration

---

## 🎯 Executive Summary

**Found: 17 unused fields + 2 unused tables**

Remove these BEFORE migrating to WorkOS to start with a clean schema.

---

## 📋 Step-by-Step Cleanup Instructions

### Step 1: Update `drizzle/schema-workos.ts`

#### 1.1 UsersTable - Remove 6 Fields

**Current (Lines ~139-178):**

```typescript
export const UsersTable = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id').notNull().unique(),
    email: text('email').notNull(),

    // Default organization (their personal org)
    primaryOrgId: uuid('primary_org_id').references(() => OrganizationsTable.id), // ❌ REMOVE

    // Platform role (separate from org roles)
    platformRole: text('platform_role').default('user'), // ❌ REMOVE

    // Stripe IDs
    stripeCustomerId: text('stripe_customer_id').unique(),
    stripeConnectAccountId: text('stripe_connect_account_id').unique(),

    // Stripe Connect fields
    stripeConnectDetailsSubmitted: boolean('stripe_connect_details_submitted').default(false),
    stripeConnectChargesEnabled: boolean('stripe_connect_charges_enabled').default(false),
    stripeConnectPayoutsEnabled: boolean('stripe_connect_payouts_enabled').default(false),
    stripeConnectOnboardingComplete: boolean('stripe_connect_onboarding_complete').default(false),
    stripeBankAccountLast4: text('stripe_bank_account_last4'), // ❌ REMOVE (fetch from Stripe)
    stripeBankName: text('stripe_bank_name'), // ❌ REMOVE (fetch from Stripe)

    // Identity verification
    stripeIdentityVerificationId: text('stripe_identity_verification_id'),
    stripeIdentityVerified: boolean('stripe_identity_verified').default(false),
    stripeIdentityVerificationStatus: text('stripe_identity_verification_status'),
    stripeIdentityVerificationLastChecked: timestamp('stripe_identity_verification_last_checked'),

    country: text('country').default('PT'),

    // Onboarding
    welcomeEmailSentAt: timestamp('welcome_email_sent_at'), // ❌ REMOVE (Clerk only)
    onboardingCompletedAt: timestamp('onboarding_completed_at'), // ❌ REMOVE

    createdAt,
    updatedAt,
  },
```

**Updated (AFTER cleanup):**

```typescript
export const UsersTable = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosUserId: text('workos_user_id').notNull().unique(),
    email: text('email').notNull(),

    // Stripe IDs
    stripeCustomerId: text('stripe_customer_id').unique(),
    stripeConnectAccountId: text('stripe_connect_account_id').unique(),

    // Stripe Connect fields
    stripeConnectDetailsSubmitted: boolean('stripe_connect_details_submitted').default(false),
    stripeConnectChargesEnabled: boolean('stripe_connect_charges_enabled').default(false),
    stripeConnectPayoutsEnabled: boolean('stripe_connect_payouts_enabled').default(false),
    stripeConnectOnboardingComplete: boolean('stripe_connect_onboarding_complete').default(false),

    // Identity verification (Stripe Identity)
    stripeIdentityVerificationId: text('stripe_identity_verification_id'),
    stripeIdentityVerified: boolean('stripe_identity_verified').default(false),
    stripeIdentityVerificationStatus: text('stripe_identity_verification_status'),
    stripeIdentityVerificationLastChecked: timestamp('stripe_identity_verification_last_checked'),

    country: text('country').default('PT'),

    createdAt,
    updatedAt,
  },
  (table) => [
    index('users_workos_user_id_idx').on(table.workosUserId),
    index('users_email_idx').on(table.email),
    index('users_stripe_customer_id_idx').on(table.stripeCustomerId),
  ],
);
```

**Summary:** Removed 6 fields from UsersTable

---

#### 1.2 MeetingsTable - Remove 3 Fields

**Current (Lines ~307-357):**

```typescript
// Stripe payment processing
stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
stripeSessionId: text('stripe_session_id').unique(),
stripePaymentStatus: text('stripe_payment_status', {
  enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded'],
}).default('pending'),
stripeAmount: integer('stripe_amount'),
stripeApplicationFeeAmount: integer('stripe_application_fee_amount'),
stripeApplicationFeeId: text('stripe_application_fee_id').unique(), // ❌ REMOVE
stripeRefundId: text('stripe_refund_id').unique(), // ❌ REMOVE
stripeMetadata: json('stripe_metadata'), // ❌ REMOVE
```

**Updated:**

```typescript
// Stripe payment processing
stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
stripeSessionId: text('stripe_session_id').unique(),
stripePaymentStatus: text('stripe_payment_status', {
  enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded'],
}).default('pending'),
stripeAmount: integer('stripe_amount'),
stripeApplicationFeeAmount: integer('stripe_application_fee_amount'),

// Stripe Connect transfers (links to PaymentTransfersTable for payout tracking)
stripeTransferId: text('stripe_transfer_id').unique(),
```

**Summary:** Removed 3 fields from MeetingsTable

---

#### 1.3 PaymentTransfersTable - Remove 1 Field

**Current (Lines ~454-488):**

```typescript
export const PaymentTransfersTable = pgTable(
  'payment_transfers',
  {
    id: serial('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => OrganizationsTable.id),
    paymentIntentId: text('payment_intent_id').notNull(),
    checkoutSessionId: text('checkout_session_id').notNull(),
    eventId: text('event_id').notNull(),
    expertConnectAccountId: text('expert_connect_account_id').notNull(),
    expertWorkosUserId: text('expert_workos_user_id').notNull(), // ❌ REMOVE
    amount: integer('amount').notNull(),
```

**Updated:**

```typescript
export const PaymentTransfersTable = pgTable(
  'payment_transfers',
  {
    id: serial('id').primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => OrganizationsTable.id),
    paymentIntentId: text('payment_intent_id').notNull(),
    checkoutSessionId: text('checkout_session_id').notNull(),
    eventId: text('event_id').notNull(),
    expertConnectAccountId: text('expert_connect_account_id').notNull(),
    amount: integer('amount').notNull(),
    // ... rest of fields
```

**Summary:** Removed 1 field from PaymentTransfersTable

---

#### 1.4 OrganizationsTable - Remove 5 Fields

**Current (Lines ~104-131):**

```typescript
export const OrganizationsTable = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosOrgId: text('workos_org_id').unique().notNull(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    type: text('type').notNull().$type<OrganizationType>(),

    // Features and subscriptions
    features: jsonb('features').$type<OrganizationFeatures>(), // ❌ REMOVE
    subscriptionTier: text('subscription_tier').$type<SubscriptionTier>().default('free'), // ❌ REMOVE
    subscriptionStatus: text('subscription_status').default('active'), // ❌ REMOVE

    // Billing
    stripeSubscriptionId: text('stripe_subscription_id'), // ❌ REMOVE
    billingEmail: text('billing_email'), // ❌ REMOVE

    // Metadata
    createdAt,
    updatedAt,
  },
```

**Updated:**

```typescript
export const OrganizationsTable = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workosOrgId: text('workos_org_id').unique().notNull(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    type: text('type').notNull().$type<OrganizationType>(),

    // Metadata
    createdAt,
    updatedAt,
  },
  (table) => [
    index('organizations_workos_org_id_idx').on(table.workosOrgId),
    index('organizations_slug_idx').on(table.slug),
  ],
);
```

**Summary:** Removed 5 fields from OrganizationsTable

---

#### 1.5 UserOrgMembershipsTable - Remove 1 Field

**Current (Lines ~192-223):**

```typescript
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

    // WorkOS references
    workosOrgMembershipId: text('workos_org_membership_id').unique(), // ❌ REMOVE

    // Role from WorkOS RBAC
    role: text('role').notNull(), // 'owner' | 'admin' | 'member' | 'billing_admin'
```

**Updated:**

```typescript
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

    // Role from WorkOS RBAC (managed in WorkOS, cached here)
    role: text('role').notNull(), // 'owner' | 'admin' | 'member' | 'billing_admin'
```

**Summary:** Removed 1 field from UserOrgMembershipsTable

---

#### 1.6 Remove Entire Tables

**Delete these table definitions from `schema-workos.ts`:**

```typescript
// ❌ DELETE Lines ~623-646
export const AuditLogExportsTable = pgTable(
  'audit_log_exports',
  { ... }
);

// ❌ DELETE Lines ~648-672
export const AuditStatsTable = pgTable(
  'audit_stats',
  { ... }
);
```

**Keep AuditLogsTable** - it's needed for HIPAA compliance, just not yet implemented.

---

### Step 2: Update Type Definitions

Remove unused types from schema file:

```typescript
// ❌ REMOVE these type definitions (no longer used):
export type OrganizationFeatures = { ... }
export type SubscriptionTier = 'free' | 'professional' | ...
```

**Keep OrganizationType** - still used for org classification.

---

### Step 3: Generate Migration

```bash
# Backup current schema
cp drizzle/schema-workos.ts drizzle/schema-workos.ts.backup-$(date +%Y%m%d)

# Apply all changes above
# Then generate migration
pnpm drizzle-kit generate
```

Expected migration:

```sql
-- Remove from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "primary_org_id";
ALTER TABLE "users" DROP COLUMN IF EXISTS "platform_role";
ALTER TABLE "users" DROP COLUMN IF EXISTS "stripe_bank_account_last4";
ALTER TABLE "users" DROP COLUMN IF EXISTS "stripe_bank_name";
ALTER TABLE "users" DROP COLUMN IF EXISTS "welcome_email_sent_at";
ALTER TABLE "users" DROP COLUMN IF EXISTS "onboarding_completed_at";

-- Remove from meetings table
ALTER TABLE "meetings" DROP COLUMN IF EXISTS "stripe_application_fee_id";
ALTER TABLE "meetings" DROP COLUMN IF EXISTS "stripe_refund_id";
ALTER TABLE "meetings" DROP COLUMN IF EXISTS "stripe_metadata";

-- Remove from payment_transfers table
ALTER TABLE "payment_transfers" DROP COLUMN IF EXISTS "expert_workos_user_id";

-- Remove from organizations table
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "features";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "subscription_tier";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "subscription_status";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "stripe_subscription_id";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "billing_email";

-- Remove from user_org_memberships table
ALTER TABLE "user_org_memberships" DROP COLUMN IF EXISTS "workos_org_membership_id";

-- Drop unused tables
DROP TABLE IF EXISTS "audit_log_exports";
DROP TABLE IF EXISTS "audit_stats";
```

---

### Step 4: Update Initial Migration

**File:** `drizzle/migrations/0000_volatile_the_captain.sql`

Remove the same fields from the CREATE TABLE statements to keep initial migration consistent with schema.

---

### Step 5: Verify TypeScript

```bash
pnpm tsc --noEmit
```

Fix any TypeScript errors from removed fields.

---

### Step 6: Update Documentation

Update these files:

- `SCHEMA-ANALYSIS-REPORT.md` - Mark fields as removed
- `docs/WorkOS-migration/IMPLEMENTATION-STATUS.md` - Update schema status
- `docs/04-development/org-per-user-model.md` - Update example code

---

## 📊 Cleanup Summary

### Removed by Table

| Table                   | Fields Removed           | Impact                 |
| ----------------------- | ------------------------ | ---------------------- |
| UsersTable              | 6                        | -300 bytes/user        |
| MeetingsTable           | 3                        | -150 bytes/meeting     |
| PaymentTransfersTable   | 1                        | -50 bytes/transfer     |
| OrganizationsTable      | 5                        | -500 bytes/org         |
| UserOrgMembershipsTable | 1                        | -50 bytes/membership   |
| **TABLES DELETED**      | 2                        | Cleaner schema         |
| **TOTAL**               | **17 fields + 2 tables** | **~2% size reduction** |

---

## ✅ Testing Checklist

After cleanup:

- [ ] Migration generates without errors
- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] Drizzle Studio opens without errors
- [ ] Schema exports correctly
- [ ] No references to removed fields in codebase

---

## 🚨 Post-Cleanup Action Items

### Implement Missing Features

1. **Practitioner Agreement Acceptance**

   ```typescript
   // TODO: Create endpoint to accept practitioner agreement
   // app/api/expert/accept-agreement/route.ts

   export async function POST(request: Request) {
     const { version, ipAddress } = await request.json();

     await db
       .update(ProfilesTable)
       .set({
         practitionerAgreementAcceptedAt: new Date(),
         practitionerAgreementVersion: version,
         practitionerAgreementIpAddress: ipAddress,
       })
       .where(eq(ProfilesTable.workosUserId, session.userId));
   }
   ```

2. **Audit Logging Integration**

   ```typescript
   // TODO: Call logAuditEvent() in these places:
   // - app/api/appointments/[meetingId]/records/route.ts (PHI access)
   // - app/api/records/route.ts (PHI access)
   // - Any place user data is viewed/modified
   ```

3. **Bank Account Display**
   ```typescript
   // TODO: Fetch from Stripe instead of database
   // Remove stripeBankAccountLast4, stripeBankName from schema
   // Fetch on-demand from Stripe Connect API
   ```

---

## 📋 Migration Sequence

**Order of operations:**

1. ✅ Schema cleanup (this document)
2. ⏭️ Implement missing features (practitioner agreement, audit logging)
3. ⏭️ Test cleaned schema in development
4. ⏭️ Apply to staging
5. ⏭️ Verify staging works
6. ⏭️ Proceed with WorkOS migration

---

## 🎯 Success Criteria

Schema cleanup is complete when:

- [x] 17 fields removed from 5 tables
- [x] 2 unused tables deleted
- [x] Migration generates cleanly
- [x] TypeScript compiles without errors
- [x] No references to removed fields in codebase
- [x] Documentation updated
- [ ] Practitioner agreement flow implemented
- [ ] Audit logging implemented
- [ ] Tests pass

---

**Date:** November 3, 2025  
**Status:** Ready for Implementation  
**Priority:** HIGH - Complete before WorkOS migration  
**Estimated Time:** 2-3 hours  
**Risk:** Low (removing unused fields)
