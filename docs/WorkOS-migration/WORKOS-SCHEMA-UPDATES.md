# WorkOS Schema Updates Required

## Overview

This document lists the specific changes needed to the `drizzle/schema-workos.ts` file before migration. These updates are based on the comprehensive codebase analysis that identified unused fields.

---

## 🔴 Critical Updates (Must Do Before Migration)

### 1. Remove Unused Meeting Payout Fields

**File:** `drizzle/schema-workos.ts`  
**Table:** `MeetingsTable`  
**Lines:** 345-350

#### Current Code (WRONG):

```typescript
export const MeetingsTable = pgTable(
  'meetings',
  {
    // ... other fields ...

    // Stripe Connect transfers
    stripeTransferId: text('stripe_transfer_id').unique(),
    stripeTransferAmount: integer('stripe_transfer_amount'),
    stripeTransferStatus: text('stripe_transfer_status', {
      enum: ['pending', 'processing', 'succeeded', 'failed'],
    }).default('pending'),
    stripeTransferScheduledAt: timestamp('stripe_transfer_scheduled_at'),
    stripePayoutId: text('stripe_payout_id').unique(),              // ❌ REMOVE
    stripePayoutAmount: integer('stripe_payout_amount'),             // ❌ REMOVE
    stripePayoutFailureCode: text('stripe_payout_failure_code'),     // ❌ REMOVE
    stripePayoutFailureMessage: text('stripe_payout_failure_message'), // ❌ REMOVE
    stripePayoutPaidAt: timestamp('stripe_payout_paid_at'),          // ❌ REMOVE
    lastProcessedAt: timestamp('last_processed_at'),                 // ❌ REMOVE

    createdAt,
    updatedAt,
  },
```

#### Updated Code (CORRECT):

```typescript
export const MeetingsTable = pgTable(
  'meetings',
  {
    // ... other fields ...

    // Stripe Connect transfers
    stripeTransferId: text('stripe_transfer_id').unique(),
    stripeTransferAmount: integer('stripe_transfer_amount'),
    stripeTransferStatus: text('stripe_transfer_status', {
      enum: ['pending', 'processing', 'succeeded', 'failed'],
    }).default('pending'),
    stripeTransferScheduledAt: timestamp('stripe_transfer_scheduled_at'),

    createdAt,
    updatedAt,
  },
```

**Reason:** Payout tracking is handled by `PaymentTransfersTable`. These fields are never populated and create confusion.

---

### 2. Remove Payout Index from Meetings

**File:** `drizzle/schema-workos.ts`  
**Table:** `MeetingsTable` indexes

#### Current Code (WRONG):

```typescript
(table) => [
  index('meetings_org_id_idx').on(table.orgId),
  index('meetings_user_id_idx').on(table.workosUserId),
  index('meetings_event_id_idx').on(table.eventId),
  index('meetings_payment_intent_id_idx').on(table.stripePaymentIntentId),
  // May also have: index on stripePayoutId - REMOVE if present
],
```

#### Updated Code (CORRECT):

```typescript
(table) => [
  index('meetings_org_id_idx').on(table.orgId),
  index('meetings_user_id_idx').on(table.workosUserId),
  index('meetings_event_id_idx').on(table.eventId),
  index('meetings_payment_intent_id_idx').on(table.stripePaymentIntentId),
  index('meetings_transfer_id_idx').on(table.stripeTransferId),
],
```

---

### 3. Update Migration File

**File:** `drizzle/migrations/0000_volatile_the_captain.sql`  
**Lines:** 103-117

#### Remove These Columns:

```sql
CREATE TABLE IF NOT EXISTS "meetings" (
  -- ... other columns ...
  "stripe_transfer_scheduled_at" timestamp,
  -- ❌ DELETE THESE 6 LINES:
  "stripe_payout_id" text,
  "stripe_payout_amount" integer,
  "stripe_payout_failure_code" text,
  "stripe_payout_failure_message" text,
  "stripe_payout_paid_at" timestamp,
  "last_processed_at" timestamp,
  -- END DELETE
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
```

#### Remove These Constraints:

```sql
-- ❌ DELETE THIS LINE:
CONSTRAINT "meetings_stripe_payout_id_unique" UNIQUE("stripe_payout_id")
```

---

## 🟡 Optional Updates (Recommended)

### 4. Consider Removing Bank Display Fields

**File:** `drizzle/schema-workos.ts`  
**Table:** `UsersTable`  
**Decision:** Run verification query first

```typescript
// 🟡 Consider removing (fetch from Stripe API instead):
stripeBankAccountLast4: text('stripe_bank_account_last4'),
stripeBankName: text('stripe_bank_name'),
```

**If removed, update this file:**

- `app/api/webhooks/stripe-connect/route.ts` (only usage)
- Fetch bank details from Stripe API when needed

---

## ✅ Verification (Fields Correctly Removed)

### Good: Subscription Fields Already Removed ✅

The WorkOS schema correctly removes subscription fields from users:

```typescript
// ✅ CORRECT - Not in WorkOS schema:
// - subscriptionId
// - subscriptionStatus
// - subscriptionPriceId
// - subscriptionCurrentPeriodEnd
// - subscriptionCanceledAt
// - hasHadSubscription
```

These are now at organization level in `OrganizationsTable`:

```typescript
export const OrganizationsTable = pgTable('organizations', {
  // ... other fields ...
  subscriptionTier: text('subscription_tier').$type<SubscriptionTier>().default('free'),
  subscriptionStatus: text('subscription_status').default('active'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  // ...
});
```

**Status:** ✅ No action needed - correctly implemented

---

### Good: User Profile Fields Correctly Removed ✅

```typescript
// ✅ CORRECT - Not in WorkOS schema:
// - firstName (fetch from WorkOS)
// - lastName (fetch from WorkOS)
// - imageUrl (fetch from WorkOS)
```

**Status:** ✅ No action needed - WorkOS is source of truth

---

## 📝 Complete Updated MeetingsTable

Here's the complete, corrected `MeetingsTable` definition:

```typescript
/**
 * Meetings Table - Booked appointments
 */
export const MeetingsTable = pgTable(
  'meetings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => OrganizationsTable.id),
    eventId: uuid('event_id')
      .notNull()
      .references(() => EventsTable.id, { onDelete: 'cascade' }),
    workosUserId: text('workos_user_id').notNull(), // Expert
    guestEmail: text('guest_email').notNull(),
    guestName: text('guest_name').notNull(),
    guestNotes: text('guest_notes'),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    timezone: text('timezone').notNull(),
    meetingUrl: text('meeting_url'),

    // Stripe payment processing
    stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
    stripeSessionId: text('stripe_session_id').unique(),
    stripePaymentStatus: text('stripe_payment_status', {
      enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded'],
    }).default('pending'),
    stripeAmount: integer('stripe_amount'),
    stripeApplicationFeeAmount: integer('stripe_application_fee_amount'),
    stripeApplicationFeeId: text('stripe_application_fee_id').unique(),
    stripeRefundId: text('stripe_refund_id').unique(),
    stripeMetadata: json('stripe_metadata'),

    // Stripe Connect transfers (links to PaymentTransfersTable)
    stripeTransferId: text('stripe_transfer_id').unique(),
    stripeTransferAmount: integer('stripe_transfer_amount'),
    stripeTransferStatus: text('stripe_transfer_status', {
      enum: ['pending', 'processing', 'succeeded', 'failed'],
    }).default('pending'),
    stripeTransferScheduledAt: timestamp('stripe_transfer_scheduled_at'),

    createdAt,
    updatedAt,
  },
  (table) => [
    // 🔒 RLS: Applied via SQL migration
    index('meetings_org_id_idx').on(table.orgId),
    index('meetings_user_id_idx').on(table.workosUserId),
    index('meetings_event_id_idx').on(table.eventId),
    index('meetings_payment_intent_id_idx').on(table.stripePaymentIntentId),
    index('meetings_transfer_id_idx').on(table.stripeTransferId),
  ],
);
```

---

## 🔧 Step-by-Step Update Process

### Step 1: Backup Current Schema

```bash
cp drizzle/schema-workos.ts drizzle/schema-workos.ts.backup-$(date +%Y%m%d)
```

### Step 2: Update Schema File

Open `drizzle/schema-workos.ts` and:

1. **Line 345-350:** Delete payout fields from MeetingsTable
2. **Line 350:** Delete `lastProcessedAt` field
3. **Verify indexes:** Check that payout indexes are removed
4. **Add comment:** Document why transfer fields are kept

### Step 3: Update Migration File

Open `drizzle/migrations/0000_volatile_the_captain.sql` and:

1. Remove payout columns from CREATE TABLE
2. Remove payout unique constraint
3. Save file

### Step 4: Generate Fresh Migration

```bash
pnpm drizzle-kit generate
```

### Step 5: Review Generated Migration

Check that the migration:

- ✅ Removes the 6 payout/processing fields
- ✅ Keeps transfer fields
- ✅ Updates indexes correctly

### Step 6: Test Migration

```bash
# Test on development database first
pnpm drizzle-kit push

# Verify tables created correctly
# Check that PaymentTransfersTable still exists
```

---

## 📋 Verification Checklist

After making changes:

- [ ] `MeetingsTable` has NO payout fields
- [ ] `MeetingsTable` has NO `lastProcessedAt` field
- [ ] `MeetingsTable` DOES have transfer fields (these are correct)
- [ ] `PaymentTransfersTable` still exists (this is the payout source of truth)
- [ ] Migration generates without errors
- [ ] TypeScript compiles without errors
- [ ] No linter errors in schema file

---

## 🚨 Common Mistakes to Avoid

### ❌ DON'T Remove Transfer Fields

These are CORRECT and should stay:

```typescript
// ✅ KEEP THESE:
stripeTransferId: text('stripe_transfer_id').unique(),
stripeTransferAmount: integer('stripe_transfer_amount'),
stripeTransferStatus: text('stripe_transfer_status'),
stripeTransferScheduledAt: timestamp('stripe_transfer_scheduled_at'),
```

### ❌ DON'T Remove PaymentTransfersTable

This table is the source of truth for payouts:

```typescript
// ✅ KEEP THIS TABLE:
export const PaymentTransfersTable = pgTable('payment_transfers', {
  // ... all fields needed ...
});
```

### ❌ DON'T Remove Payment Fields

These are essential:

```typescript
// ✅ KEEP THESE:
stripePaymentIntentId;
stripeSessionId;
stripePaymentStatus;
stripeAmount;
stripeApplicationFeeAmount;
stripeApplicationFeeId;
stripeRefundId;
stripeMetadata;
```

---

## 🎯 Summary of Changes

| Table         | Fields to Remove                                                                                                                        | Fields to Keep                          | Reason                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------- |
| MeetingsTable | stripePayoutId, stripePayoutAmount, stripePayoutFailureCode, stripePayoutFailureMessage, stripePayoutPaidAt, lastProcessedAt (6 fields) | All transfer fields, all payment fields | PaymentTransfersTable is source of truth |
| UsersTable    | (already correct)                                                                                                                       | All Stripe Connect and identity fields  | Correctly removed subscriptions          |
| ProfilesTable | (no changes)                                                                                                                            | All fields including legal compliance   | All fields actively used                 |

---

## 📞 Questions?

If unsure about any changes:

1. Review `SCHEMA-ANALYSIS-REPORT.md` for detailed analysis
2. Check `verify-unused-fields.sql` query results
3. Run `grep -r "fieldName" app/` to verify usage
4. Consult with team before removing any field

---

**Last Updated:** 2025-11-03  
**Status:** Ready for Implementation  
**Priority:** High (must do before WorkOS migration)
