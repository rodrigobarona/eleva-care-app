# ⚠️ DEPRECATED: First-Time Late Payment Waiver Implementation Guide

> **⚠️ WARNING: This document is DEPRECATED**
>
> **Policy Version**: v1.0 (OBSOLETE)  
> **Superseded By**: [Policy v3.0: Customer-First 100% Refund](./09-policy-v3-customer-first-100-refund.md)  
> **Deprecation Date**: January 27, 2025  
> **Status**: Archived for historical reference only
>
> **DO NOT IMPLEMENT THIS POLICY**. This document describes an outdated "first-time courtesy waiver" approach (100% first, 90% subsequent) that has been replaced by a simpler v3.0 policy: **100% refund for ALL late payment conflicts**.
>
> For current implementation, see: [Policy v3.0 Documentation](./09-policy-v3-customer-first-100-refund.md)

---

## Original Document (Archived)

**Original Status**: Planning (NEVER IMPLEMENTED)  
**Original Priority**: High  
**Original Estimated Effort**: 8-12 hours  
**Original Dependencies**: Database migration, Stripe webhook handler updates  
**Related Documents**:

- [Payment Policies](/content/payment-policies/)
- [Stripe Integration](./02-stripe-integration.md)
- [Multibanco Integration](./05-multibanco-integration.md)

---

## 📋 Overview

This document outlines the implementation of a **first-time courtesy waiver** for late Multibanco payments. Users who pay late for the first time receive a **100% refund** instead of the standard 90% refund (10% processing fee).

### Business Rules

- **First-time late payer**: 100% refund (no fee)
- **Subsequent late payers**: 90% refund (10% processing fee retained)
- **Tracking**: Per user email address
- **Scope**: Applies only to late Multibanco payments (not card payments or cancellations)

### Expected Benefits

- **Reduced chargebacks**: 30-50% reduction (forgiveness + transparency)
- **Better reviews**: "Second chance" policy enhances brand perception
- **Customer retention**: Forgiveness builds loyalty
- **Support efficiency**: Fewer "why was I charged?" tickets

---

## 🎯 Implementation Steps

This implementation is broken into **7 discrete steps** that can be assigned as separate tasks in Linear.

---

## Step 1: Database Schema Changes

**Linear Issue Title**: `[Backend] Add Late Payment Tracking Fields to User Schema`

**Priority**: High  
**Estimated Time**: 1-2 hours  
**Dependencies**: None  
**Labels**: `backend`, `database`, `schema`, `payment`

### Description

Add tracking fields to the `UserTable` schema to record late Multibanco payment history for first-time waiver eligibility checks.

### Technical Details

**File**: `drizzle/schema.ts`

Add the following fields to `UserTable` (around line 360, after identity verification fields):

```typescript
export const UserTable = pgTable(
  'users',
  {
    // ... existing fields ...

    // Identity verification fields (existing)
    stripeIdentityVerificationId: text('stripe_identity_verification_id'),
    stripeIdentityVerified: boolean('stripe_identity_verified').default(false),
    stripeIdentityVerificationStatus: text('stripe_identity_verification_status'),
    stripeIdentityVerificationLastChecked: timestamp('stripe_identity_verification_last_checked'),
    country: text('country').default('PT'),

    // 🆕 NEW: Late payment tracking (for first-time courtesy waiver)
    hasHadLateMultibancoPayment: boolean('has_had_late_multibanco_payment').default(false),
    lateMultibancoPaymentCount: integer('late_multibanco_payment_count').default(0),
    firstLateMultibancoPaymentDate: timestamp('first_late_multibanco_payment_date'),

    createdAt,
    updatedAt,
  },
  (table) => ({
    clerkUserIdIndex: index('users_clerk_user_id_idx').on(table.clerkUserId),
    stripeCustomerIdIndex: index('users_stripe_customer_id_idx').on(table.stripeCustomerId),
    stripeIdentityVerificationIdIndex: index('users_stripe_identity_verification_id_idx').on(
      table.stripeIdentityVerificationId,
    ),
    // 🆕 NEW: Index for late payment lookups
    latePaymentIndex: index('users_late_payment_idx').on(table.hasHadLateMultibancoPayment),
  }),
);
```

### Field Descriptions

| Field                            | Type        | Purpose                         | Indexed |
| -------------------------------- | ----------- | ------------------------------- | ------- |
| `hasHadLateMultibancoPayment`    | `boolean`   | Quick flag for first-time check | ✅ Yes  |
| `lateMultibancoPaymentCount`     | `integer`   | Total count for analytics       | ❌ No   |
| `firstLateMultibancoPaymentDate` | `timestamp` | Audit trail                     | ❌ No   |

### Acceptance Criteria

- [ ] Schema updated with 3 new fields
- [ ] Index created on `hasHadLateMultibancoPayment`
- [ ] TypeScript types automatically generated
- [ ] No linter errors
- [ ] Schema validated with `pnpm drizzle-kit check`

### Testing

```bash
# Validate schema
pnpm drizzle-kit check

# Generate types
pnpm drizzle-kit generate:pg
```

---

## Step 2: Database Migration

**Linear Issue Title**: `[Backend] Create Migration for Late Payment Tracking Fields`

**Priority**: High  
**Estimated Time**: 1 hour  
**Dependencies**: Step 1 (Schema Changes)  
**Labels**: `backend`, `database`, `migration`, `payment`

### Description

Create and execute a database migration to add late payment tracking fields to the production `users` table.

### Technical Details

**File**: `drizzle/migrations/0007_add_late_payment_tracking.sql`

```sql
-- Migration: Add late payment tracking fields to users table
-- Purpose: Enable first-time courtesy waiver for late Multibanco payments
-- Date: 2025-01-XX
-- Author: [Your Name]

-- Add late payment tracking fields
ALTER TABLE users
ADD COLUMN IF NOT EXISTS has_had_late_multibanco_payment BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS late_multibanco_payment_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS first_late_multibanco_payment_date TIMESTAMP;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS users_late_payment_idx
ON users(has_had_late_multibanco_payment);

-- Add column comments for documentation
COMMENT ON COLUMN users.has_had_late_multibanco_payment IS
'Tracks whether user has ever had a late Multibanco payment (for first-time waiver policy)';

COMMENT ON COLUMN users.late_multibanco_payment_count IS
'Total count of late Multibanco payments by this user (for analytics)';

COMMENT ON COLUMN users.first_late_multibanco_payment_date IS
'Timestamp of first late Multibanco payment (audit trail and analytics)';

-- Verify migration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'has_had_late_multibanco_payment'
  ) THEN
    RAISE EXCEPTION 'Migration failed: has_had_late_multibanco_payment column not created';
  END IF;
END $$;
```

### Rollback Plan

**File**: `drizzle/migrations/0007_add_late_payment_tracking_rollback.sql`

```sql
-- Rollback migration: Remove late payment tracking fields
-- WARNING: This will delete all late payment history data

-- Drop index
DROP INDEX IF EXISTS users_late_payment_idx;

-- Remove columns
ALTER TABLE users
DROP COLUMN IF EXISTS has_had_late_multibanco_payment,
DROP COLUMN IF EXISTS late_multibanco_payment_count,
DROP COLUMN IF EXISTS first_late_multibanco_payment_date;
```

### Acceptance Criteria

- [ ] Migration SQL file created
- [ ] Rollback SQL file created
- [ ] Migration tested in development environment
- [ ] Migration executed in staging environment
- [ ] No data loss
- [ ] Index created successfully
- [ ] Column comments added

### Testing

```bash
# Generate migration from schema
pnpm drizzle-kit generate:pg

# Apply migration to dev database
pnpm drizzle-kit push:pg

# Verify migration
psql $DATABASE_URL -c "SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name LIKE '%late%';"

# Verify index
psql $DATABASE_URL -c "SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users'
AND indexname LIKE '%late%';"
```

### Deployment Notes

⚠️ **Important**:

- Run migration during low-traffic period
- Monitor database performance after migration
- Verify no blocking locks on `users` table
- Estimated execution time: < 5 seconds (adding columns with defaults)

---

## Step 3: Refund Logic Implementation

**Linear Issue Title**: `[Backend] Implement First-Time Waiver Logic in Payment Webhook Handler`

**Priority**: High  
**Estimated Time**: 3-4 hours  
**Dependencies**: Step 1 (Schema), Step 2 (Migration)  
**Labels**: `backend`, `payment`, `stripe`, `webhook`, `refund`

### Description

Update the Stripe webhook handler to check first-time status and apply appropriate refund percentage (100% vs 90%) for late Multibanco payments.

### Technical Details

**File**: `app/api/webhooks/stripe/handlers/payment.ts`

#### 3A: Add Helper Function - Check First-Time Status

Add this function after the `checkAppointmentConflict` function (around line 270):

```typescript
/**
 * Check if this is the user's first late Multibanco payment
 *
 * @param guestEmail - Email of the guest/customer
 * @returns Promise<boolean> - true if first-time late payer, false if has history
 *
 * @example
 * const isFirstTime = await isFirstTimeLatePayment('john@example.com');
 * if (isFirstTime) {
 *   // Apply 100% refund
 * }
 */
async function isFirstTimeLatePayment(guestEmail: string): Promise<boolean> {
  try {
    // Find user by email (could be registered user or guest)
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.email, guestEmail),
      columns: {
        hasHadLateMultibancoPayment: true,
        lateMultibancoPaymentCount: true,
      },
    });

    // If no user found, treat as first-time (guest checkout)
    if (!user) {
      console.log(`ℹ️ No user found for ${guestEmail}, treating as first-time (guest)`);
      return true;
    }

    // Return opposite of flag (false = has had late payment, true = first time)
    const isFirstTime = !user.hasHadLateMultibancoPayment;

    console.log(
      `🔍 Late payment check for ${guestEmail}: ${isFirstTime ? 'FIRST-TIME' : `REPEAT (count: ${user.lateMultibancoPaymentCount})`}`,
    );

    return isFirstTime;
  } catch (error) {
    console.error('❌ Error checking first-time late payment status:', error);
    // Default to first-time on error (be generous to customer)
    return true;
  }
}
```

#### 3B: Add Helper Function - Record Late Payment

Add this function after `isFirstTimeLatePayment`:

```typescript
/**
 * Record a late Multibanco payment in user's history
 * Updates: hasHadLateMultibancoPayment, lateMultibancoPaymentCount, firstLateMultibancoPaymentDate
 *
 * @param guestEmail - Email of the guest/customer
 * @param paymentIntentId - Stripe PaymentIntent ID for audit trail
 * @returns Promise<void>
 *
 * @example
 * await recordLatePayment('john@example.com', 'pi_123abc');
 */
async function recordLatePayment(guestEmail: string, paymentIntentId: string): Promise<void> {
  try {
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.email, guestEmail),
      columns: {
        id: true,
        hasHadLateMultibancoPayment: true,
        lateMultibancoPaymentCount: true,
      },
    });

    if (!user) {
      console.log(
        `⚠️ No user found for ${guestEmail}, skipping late payment tracking (guest checkout)`,
      );
      return;
    }

    // Update user's late payment history
    await db
      .update(UserTable)
      .set({
        hasHadLateMultibancoPayment: true,
        // Increment counter using SQL expression
        lateMultibancoPaymentCount: sql`${UserTable.lateMultibancoPaymentCount} + 1`,
        // Set first late payment date only if not already set (COALESCE)
        firstLateMultibancoPaymentDate: sql`COALESCE(${UserTable.firstLateMultibancoPaymentDate}, NOW())`,
        updatedAt: new Date(),
      })
      .where(eq(UserTable.id, user.id));

    const newCount = (user.lateMultibancoPaymentCount || 0) + 1;
    console.log(
      `✅ Late payment recorded for ${guestEmail} (PI: ${paymentIntentId}, Count: ${newCount})`,
    );

    // Log to audit database
    await logAuditEvent({
      entityType: 'user',
      entityId: user.id,
      action: 'late_multibanco_payment_recorded',
      userId: user.id,
      details: {
        paymentIntentId,
        guestEmail,
        latePaymentCount: newCount,
        isFirstTime: !user.hasHadLateMultibancoPayment,
      },
    });
  } catch (error) {
    console.error('❌ Error recording late payment:', error);
    // Non-critical error, don't throw (refund should still process)
  }
}
```

#### 3C: Update `processPartialRefund` Function

Replace the existing `processPartialRefund` function (lines 275-307) with this updated version:

```typescript
/**
 * Process partial refund for appointment conflicts
 * - 100% refund for first-time late Multibanco payments (courtesy waiver)
 * - 90% refund for subsequent late payments (10% processing fee)
 *
 * @param paymentIntent - Stripe PaymentIntent object
 * @param reason - Conflict reason (for metadata)
 * @param guestEmail - Guest email (NEW: for first-time check)
 * @returns Promise<Stripe.Refund | null>
 */
async function processPartialRefund(
  paymentIntent: Stripe.PaymentIntent,
  reason: string,
  guestEmail: string, // 🆕 NEW PARAMETER
): Promise<Stripe.Refund | null> {
  try {
    const originalAmount = paymentIntent.amount;

    // 🆕 Check if this is first-time late payment
    const isFirstTime = await isFirstTimeLatePayment(guestEmail);

    // 🆕 Calculate refund amount based on first-time status
    const refundAmount = isFirstTime
      ? originalAmount // 100% refund for first-time (courtesy waiver)
      : Math.floor(originalAmount * 0.9); // 90% refund for subsequent (10% fee)

    const processingFee = originalAmount - refundAmount;
    const refundPercentage = isFirstTime ? '100' : '90';

    console.log(
      `💰 Processing ${isFirstTime ? '🎁 FIRST-TIME COURTESY' : 'partial'} refund:`,
      `\n  - Original: €${(originalAmount / 100).toFixed(2)}`,
      `\n  - Refund: €${(refundAmount / 100).toFixed(2)} (${refundPercentage}%)`,
      `\n  - Fee: €${(processingFee / 100).toFixed(2)}`,
      `\n  - Email: ${guestEmail}`,
    );

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntent.id,
      amount: refundAmount,
      reason: 'requested_by_customer',
      metadata: {
        reason: reason,
        original_amount: originalAmount.toString(),
        processing_fee: processingFee.toString(),
        refund_percentage: refundPercentage,
        conflict_type: reason,
        guest_email: guestEmail,
        // 🆕 NEW: Track first-time status in Stripe metadata
        is_first_time_late_payment: isFirstTime.toString(),
        first_time_courtesy_applied: isFirstTime.toString(),
        policy_version: '1.0', // For future policy changes
      },
    });

    // 🆕 Record this late payment in user history (for future lookups)
    await recordLatePayment(guestEmail, paymentIntent.id);

    console.log(
      `✅ ${isFirstTime ? '🎁 First-time courtesy' : 'Partial'} refund processed:`,
      `\n  - Refund ID: ${refund.id}`,
      `\n  - Amount: €${(refund.amount / 100).toFixed(2)}`,
      `\n  - Status: ${refund.status}`,
    );

    return refund;
  } catch (error) {
    console.error('❌ Error processing partial refund:', error);
    return null;
  }
}
```

#### 3D: Update `handlePaymentSucceeded` Function

Update the function call to `processPartialRefund` (around line 428) to pass the guest email:

```typescript
export async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);

  try {
    // Parse meeting metadata to check if this might be a late Multibanco payment
    const meetingData = parseMetadata(paymentIntent.metadata?.meeting, {
      id: '',
      expert: '',
      guest: '',
      guestName: '',
      start: '',
      dur: 0,
      notes: '',
    });

    // Check if this is a Multibanco payment and if it's potentially late
    const isMultibancoPayment = paymentIntent.payment_method_types?.includes('multibanco');

    // If it's a Multibanco payment and we have session timing info, check for conflicts
    let hasConflict = false;
    if (isMultibancoPayment && meetingData.expert && meetingData.start) {
      const appointmentStart = new Date(meetingData.start);
      const conflictResult = await checkAppointmentConflict(
        meetingData.expert,
        appointmentStart,
        meetingData.id,
      );
      hasConflict = conflictResult.hasConflict;

      if (hasConflict) {
        console.log(`🚨 Late Multibanco payment conflict detected for PI ${paymentIntent.id}`);

        // 🆕 UPDATED: Pass guestEmail parameter for first-time check
        const refund = await processPartialRefund(
          paymentIntent,
          'Appointment time slot no longer available due to late payment',
          meetingData.guest, // 🆕 Pass guest email
        );

        if (refund) {
          // Get expert's name for notification
          const expertUser = await db.query.UserTable.findFirst({
            where: eq(UserTable.clerkUserId, meetingData.expert),
            columns: { firstName: true, lastName: true },
          });

          const expertName = expertUser
            ? `${expertUser.firstName || ''} ${expertUser.lastName || ''}`.trim() || 'Expert'
            : 'Expert';

          // Notify all parties about the conflict
          await notifyAppointmentConflict(
            meetingData.guest,
            meetingData.guestName || 'Guest',
            expertName,
            appointmentStart,
            refund.amount,
            paymentIntent.amount,
            extractLocaleFromPaymentIntent(paymentIntent),
            conflictResult.reason || 'unknown_conflict',
            conflictResult.minimumNoticeHours,
          );

          console.log(`✅ Conflict handled: refund processed for PI ${paymentIntent.id}`);

          // Mark the meeting as refunded and return early
          await db
            .update(MeetingTable)
            .set({
              stripePaymentStatus: 'refunded',
              updatedAt: new Date(),
            })
            .where(eq(MeetingTable.stripePaymentIntentId, paymentIntent.id));

          return; // Exit early - don't create calendar event or proceed with normal flow
        }
      } else {
        console.log(`✅ Multibanco payment ${paymentIntent.id} processed without conflicts`);
      }
    }

    // If no conflict or not a Multibanco payment, proceed with normal flow
    // ... rest of existing code ...
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
    throw error;
  }
}
```

### Acceptance Criteria

- [ ] `isFirstTimeLatePayment()` function created and documented
- [ ] `recordLatePayment()` function created and documented
- [ ] `processPartialRefund()` updated to accept `guestEmail` parameter
- [ ] `processPartialRefund()` calculates 100% for first-time, 90% for repeat
- [ ] `handlePaymentSucceeded()` passes guest email to refund function
- [ ] Stripe refund metadata includes first-time status
- [ ] Audit log records late payment events
- [ ] All TypeScript types are correct
- [ ] No linter errors

### Testing

```typescript
// Unit test: isFirstTimeLatePayment()
describe('isFirstTimeLatePayment', () => {
  it('returns true for new user', async () => {
    const result = await isFirstTimeLatePayment('newuser@example.com');
    expect(result).toBe(true);
  });

  it('returns true for user with no late payment history', async () => {
    // Create user with hasHadLateMultibancoPayment = false
    const result = await isFirstTimeLatePayment('user@example.com');
    expect(result).toBe(true);
  });

  it('returns false for user with late payment history', async () => {
    // Create user with hasHadLateMultibancoPayment = true
    const result = await isFirstTimeLatePayment('repeat@example.com');
    expect(result).toBe(false);
  });
});

// Unit test: processPartialRefund()
describe('processPartialRefund', () => {
  it('refunds 100% for first-time late payer', async () => {
    const paymentIntent = createMockPaymentIntent(10000); // €100
    const refund = await processPartialRefund(paymentIntent, 'late payment', 'newuser@example.com');
    expect(refund.amount).toBe(10000); // 100%
  });

  it('refunds 90% for repeat late payer', async () => {
    const paymentIntent = createMockPaymentIntent(10000); // €100
    const refund = await processPartialRefund(paymentIntent, 'late payment', 'repeat@example.com');
    expect(refund.amount).toBe(9000); // 90%
  });

  it('includes first-time status in metadata', async () => {
    const paymentIntent = createMockPaymentIntent(10000);
    const refund = await processPartialRefund(paymentIntent, 'late payment', 'newuser@example.com');
    expect(refund.metadata.is_first_time_late_payment).toBe('true');
    expect(refund.metadata.first_time_courtesy_applied).toBe('true');
  });
});
```

---

## Step 4: Email Notification Updates

**Linear Issue Title**: `[Backend] Update Refund Email Notifications for First-Time Waiver`

**Priority**: Medium  
**Estimated Time**: 2 hours  
**Dependencies**: Step 3 (Refund Logic)  
**Labels**: `backend`, `email`, `notifications`, `i18n`

### Description

Update the refund notification email to include different messaging for first-time courtesy refunds (100%) vs. subsequent refunds (90%).

### Technical Details

**File**: `app/api/webhooks/stripe/handlers/payment.ts`

Update the `notifyAppointmentConflict` function (around line 312):

```typescript
/**
 * Send conflict notification using existing email system with multilingual support
 *
 * @param guestEmail - Guest email address
 * @param guestName - Guest display name
 * @param expertName - Expert display name
 * @param startTime - Original appointment start time
 * @param refundAmount - Refund amount in cents
 * @param originalAmount - Original payment amount in cents
 * @param locale - User locale (en, es, pt, br)
 * @param conflictReason - Reason for conflict
 * @param minimumNoticeHours - Expert's minimum notice requirement
 */
async function notifyAppointmentConflict(
  guestEmail: string,
  guestName: string,
  expertName: string,
  startTime: Date,
  refundAmount: number,
  originalAmount: number,
  locale: string,
  conflictReason: string,
  minimumNoticeHours?: number,
) {
  try {
    // 🆕 Check if first-time courtesy was applied
    const isFirstTime = refundAmount === originalAmount;
    const refundPercentage = isFirstTime ? 100 : 90;
    const processingFee = originalAmount - refundAmount;

    // Format amounts for display
    const refundAmountFormatted = (refundAmount / 100).toFixed(2);
    const feeAmountFormatted = (processingFee / 100).toFixed(2);
    const appointmentDate = format(startTime, 'PPP', { locale: getDateLocale(locale) });

    console.log(
      `📧 Sending refund notification:`,
      `\n  - To: ${guestEmail}`,
      `\n  - Type: ${isFirstTime ? '🎁 First-time courtesy (100%)' : 'Partial refund (90%)'}`,
      `\n  - Refund: €${refundAmountFormatted}`,
      `\n  - Fee: €${feeAmountFormatted}`,
    );

    // Send email via Novu
    const workflowId = isFirstTime
      ? 'multibanco-late-payment-first-time-refund'
      : 'multibanco-late-payment-partial-refund';

    await sendNovuEmail({
      workflowId,
      subscriberId: guestEmail,
      payload: {
        guestName,
        expertName,
        appointmentDate,
        refundAmount: refundAmountFormatted,
        feeAmount: feeAmountFormatted,
        refundPercentage: refundPercentage.toString(),
        isFirstTime: isFirstTime.toString(),
        conflictReason,
        minimumNoticeHours: minimumNoticeHours?.toString() || 'N/A',
        supportUrl: `https://eleva.care/${locale}/support`,
        paymentPoliciesUrl: `https://eleva.care/${locale}/legal/payment-policies#multibanco-late-payment`,
      },
    });

    console.log(
      `✅ Refund notification sent to ${guestEmail} (${refundPercentage}% refund, workflow: ${workflowId})`,
    );
  } catch (error) {
    console.error('❌ Error sending refund notification:', error);
    // Non-critical error, don't throw
  }
}

/**
 * Helper: Get date-fns locale for formatting
 */
function getDateLocale(localeCode: string) {
  switch (localeCode) {
    case 'es':
      return es;
    case 'pt':
      return pt;
    case 'br':
      return ptBR;
    default:
      return enUS;
  }
}
```

### Email Template Changes

**Note**: Email templates will be updated in Step 5 (Translations). This step focuses on the backend logic.

### Acceptance Criteria

- [ ] `notifyAppointmentConflict` detects first-time vs. repeat refund
- [ ] Different Novu workflow IDs used for first-time vs. repeat
- [ ] Email payload includes all necessary variables
- [ ] Support URL and payment policies URL included
- [ ] Locale-specific date formatting
- [ ] Error handling doesn't break refund flow

### Testing

```typescript
// Integration test
describe('notifyAppointmentConflict', () => {
  it('sends first-time courtesy email for 100% refund', async () => {
    const mockSendNovu = jest.spyOn(novuService, 'sendNovuEmail');

    await notifyAppointmentConflict(
      'user@example.com',
      'John Doe',
      'Dr. Smith',
      new Date(),
      10000, // €100 (same as original)
      10000, // €100
      'en',
      'slot_unavailable',
      24,
    );

    expect(mockSendNovu).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'multibanco-late-payment-first-time-refund',
        payload: expect.objectContaining({
          isFirstTime: 'true',
          refundPercentage: '100',
        }),
      }),
    );
  });

  it('sends partial refund email for 90% refund', async () => {
    const mockSendNovu = jest.spyOn(novuService, 'sendNovuEmail');

    await notifyAppointmentConflict(
      'repeat@example.com',
      'Jane Doe',
      'Dr. Smith',
      new Date(),
      9000, // €90 (90% of €100)
      10000, // €100
      'en',
      'slot_unavailable',
      24,
    );

    expect(mockSendNovu).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'multibanco-late-payment-partial-refund',
        payload: expect.objectContaining({
          isFirstTime: 'false',
          refundPercentage: '90',
        }),
      }),
    );
  });
});
```

---

## Step 5: Translations & i18n

**Linear Issue Title**: `[i18n] Add Translations for First-Time Waiver Email Notifications`

**Priority**: Medium  
**Estimated Time**: 2 hours  
**Dependencies**: Step 4 (Email Notifications)  
**Labels**: `i18n`, `translations`, `email`, `content`

### Description

Add translations for first-time courtesy and partial refund email notifications in all 4 languages (EN, ES, PT, BR).

### Technical Details

**Files**:

- `messages/en.json`
- `messages/es.json`
- `messages/pt.json`
- `messages/br.json`

Add the following translation keys to each file:

#### English (`messages/en.json`)

Add after line 494 (in `payments` section):

```json
{
  "payments": {
    "refund": {
      "firstTime": {
        "subject": "Full Refund Issued - First-Time Courtesy",
        "greeting": "Hi {guestName},",
        "body": "We noticed your Multibanco payment for the appointment with {expertName} on {appointmentDate} was completed after the slot was no longer available.\n\nAs a first-time courtesy, we've issued a 100% refund of €{refundAmount}. The processing fee has been waived this time.\n\nFor future bookings, please complete payment within 7 days to secure your slot.",
        "footer": "Thanks,\n— Eleva Care",
        "cta": "View Payment Policies",
        "dashboard": {
          "title": "First-Time Courtesy Applied",
          "description": "You received a full refund (100%) for this late payment. Future late payments are subject to a 10% processing fee.",
          "badge": "Fee Waived"
        }
      },
      "subsequent": {
        "subject": "Partial Refund Issued - Late Payment",
        "greeting": "Hi {guestName},",
        "body": "Your Multibanco payment for the appointment with {expertName} on {appointmentDate} was completed after the slot was no longer available.\n\nWe've issued a 90% refund of €{refundAmount}. A 10% processing fee (€{feeAmount}) has been retained as outlined in our payment policies.",
        "footer": "Thanks,\n— Eleva Care",
        "cta": "View Payment Policies",
        "dashboard": {
          "title": "Partial Refund Processed",
          "description": "You received a 90% refund. A 10% processing fee was retained for late payment.",
          "badge": "10% Fee Applied"
        }
      },
      "common": {
        "conflictReason": {
          "slot_unavailable": "The time slot was booked by another client.",
          "minimum_notice_violated": "The appointment didn't meet the expert's {minimumNoticeHours}-hour minimum notice requirement.",
          "expert_blocked_time": "The expert blocked this time in their calendar.",
          "unknown_conflict": "The appointment could not be honored due to a scheduling conflict."
        },
        "nextSteps": "If you have questions, please contact our support team.",
        "supportLink": "Contact Support"
      }
    },
    "latePaymentStatus": {
      "eligible": {
        "title": "First-Time Courtesy Eligible",
        "description": "If you ever have a late Multibanco payment, we'll waive the 10% processing fee as a one-time courtesy."
      },
      "used": {
        "title": "First-Time Courtesy Used",
        "description": "You've used your one-time fee waiver. Future late Multibanco payments are subject to a 10% processing fee."
      }
    }
  }
}
```

#### Spanish (`messages/es.json`)

```json
{
  "payments": {
    "refund": {
      "firstTime": {
        "subject": "Reembolso Completo Emitido - Cortesía Primera Vez",
        "greeting": "Hola {guestName},",
        "body": "Notamos que su pago Multibanco para la cita con {expertName} el {appointmentDate} se completó después de que el horario ya no estuviera disponible.\n\nComo cortesía por primera vez, hemos emitido un reembolso del 100% de €{refundAmount}. La tarifa de procesamiento ha sido eximida esta vez.\n\nPara futuras reservas, complete el pago dentro de 7 días para asegurar su horario.",
        "footer": "Gracias,\n— Eleva Care",
        "cta": "Ver Políticas de Pago",
        "dashboard": {
          "title": "Cortesía Primera Vez Aplicada",
          "description": "Recibió un reembolso completo (100%) por este pago tardío. Futuros pagos tardíos están sujetos a una tarifa del 10%.",
          "badge": "Tarifa Eximida"
        }
      },
      "subsequent": {
        "subject": "Reembolso Parcial Emitido - Pago Tardío",
        "greeting": "Hola {guestName},",
        "body": "Su pago Multibanco para la cita con {expertName} el {appointmentDate} se completó después de que el horario ya no estuviera disponible.\n\nHemos emitido un reembolso del 90% de €{refundAmount}. Se ha retenido una tarifa de procesamiento del 10% (€{feeAmount}) según nuestras políticas de pago.",
        "footer": "Gracias,\n— Eleva Care",
        "cta": "Ver Políticas de Pago",
        "dashboard": {
          "title": "Reembolso Parcial Procesado",
          "description": "Recibió un reembolso del 90%. Se retuvo una tarifa de procesamiento del 10% por pago tardío.",
          "badge": "Tarifa 10% Aplicada"
        }
      },
      "common": {
        "conflictReason": {
          "slot_unavailable": "El horario fue reservado por otro cliente.",
          "minimum_notice_violated": "La cita no cumplió con el requisito de {minimumNoticeHours} horas de aviso mínimo del especialista.",
          "expert_blocked_time": "El especialista bloqueó este horario en su calendario.",
          "unknown_conflict": "La cita no pudo ser honrada debido a un conflicto de programación."
        },
        "nextSteps": "Si tiene preguntas, contacte con nuestro equipo de soporte.",
        "supportLink": "Contactar Soporte"
      }
    },
    "latePaymentStatus": {
      "eligible": {
        "title": "Cortesía Primera Vez Elegible",
        "description": "Si alguna vez tiene un pago Multibanco tardío, eximiremos la tarifa del 10% como cortesía única."
      },
      "used": {
        "title": "Cortesía Primera Vez Usada",
        "description": "Ha usado su exención única. Futuros pagos Multibanco tardíos están sujetos a una tarifa del 10%."
      }
    }
  }
}
```

#### Portuguese (`messages/pt.json`)

```json
{
  "payments": {
    "refund": {
      "firstTime": {
        "subject": "Reembolso Completo Emitido - Cortesia Primeira Vez",
        "greeting": "Olá {guestName},",
        "body": "Notámos que o seu pagamento Multibanco para a consulta com {expertName} em {appointmentDate} foi concluído depois do horário já não estar disponível.\n\nComo cortesia pela primeira vez, emitimos um reembolso de 100% de €{refundAmount}. A taxa de processamento foi dispensada desta vez.\n\nPara futuras reservas, conclua o pagamento dentro de 7 dias para garantir o seu horário.",
        "footer": "Obrigado,\n— Eleva Care",
        "cta": "Ver Políticas de Pagamento",
        "dashboard": {
          "title": "Cortesia Primeira Vez Aplicada",
          "description": "Recebeu um reembolso completo (100%) por este pagamento tardio. Futuros pagamentos tardios estão sujeitos a uma taxa de 10%.",
          "badge": "Taxa Dispensada"
        }
      },
      "subsequent": {
        "subject": "Reembolso Parcial Emitido - Pagamento Tardio",
        "greeting": "Olá {guestName},",
        "body": "O seu pagamento Multibanco para a consulta com {expertName} em {appointmentDate} foi concluído depois do horário já não estar disponível.\n\nEmitimos um reembolso de 90% de €{refundAmount}. Foi retida uma taxa de processamento de 10% (€{feeAmount}) conforme as nossas políticas de pagamento.",
        "footer": "Obrigado,\n— Eleva Care",
        "cta": "Ver Políticas de Pagamento",
        "dashboard": {
          "title": "Reembolso Parcial Processado",
          "description": "Recebeu um reembolso de 90%. Foi retida uma taxa de processamento de 10% por pagamento tardio.",
          "badge": "Taxa 10% Aplicada"
        }
      },
      "common": {
        "conflictReason": {
          "slot_unavailable": "O horário foi reservado por outro cliente.",
          "minimum_notice_violated": "A consulta não cumpriu o requisito de {minimumNoticeHours} horas de aviso mínimo do especialista.",
          "expert_blocked_time": "O especialista bloqueou este horário no seu calendário.",
          "unknown_conflict": "A consulta não pôde ser honrada devido a um conflito de agendamento."
        },
        "nextSteps": "Se tiver questões, contacte a nossa equipa de suporte.",
        "supportLink": "Contactar Suporte"
      }
    },
    "latePaymentStatus": {
      "eligible": {
        "title": "Cortesia Primeira Vez Elegível",
        "description": "Se alguma vez tiver um pagamento Multibanco tardio, dispensaremos a taxa de 10% como cortesia única."
      },
      "used": {
        "title": "Cortesia Primeira Vez Usada",
        "description": "Usou a sua dispensa única. Futuros pagamentos Multibanco tardios estão sujeitos a uma taxa de 10%."
      }
    }
  }
}
```

#### Brazilian Portuguese (`messages/br.json`)

```json
{
  "payments": {
    "refund": {
      "firstTime": {
        "subject": "Reembolso Completo Emitido - Cortesia Primeira Vez",
        "greeting": "Oi {guestName},",
        "body": "Notamos que seu pagamento Multibanco para a consulta com {expertName} em {appointmentDate} foi concluído depois do horário não estar mais disponível.\n\nComo cortesia pela primeira vez, emitimos um reembolso de 100% de €{refundAmount}. A taxa de processamento foi dispensada desta vez.\n\nPara futuras reservas, conclua o pagamento dentro de 7 dias para garantir seu horário.",
        "footer": "Obrigado,\n— Eleva Care",
        "cta": "Ver Políticas de Pagamento",
        "dashboard": {
          "title": "Cortesia Primeira Vez Aplicada",
          "description": "Você recebeu um reembolso completo (100%) por este pagamento tardio. Futuros pagamentos tardios estão sujeitos a uma taxa de 10%.",
          "badge": "Taxa Dispensada"
        }
      },
      "subsequent": {
        "subject": "Reembolso Parcial Emitido - Pagamento Tardio",
        "greeting": "Oi {guestName},",
        "body": "Seu pagamento Multibanco para a consulta com {expertName} em {appointmentDate} foi concluído depois do horário não estar mais disponível.\n\nEmitimos um reembolso de 90% de €{refundAmount}. Foi retida uma taxa de processamento de 10% (€{feeAmount}) conforme nossas políticas de pagamento.",
        "footer": "Obrigado,\n— Eleva Care",
        "cta": "Ver Políticas de Pagamento",
        "dashboard": {
          "title": "Reembolso Parcial Processado",
          "description": "Você recebeu um reembolso de 90%. Foi retida uma taxa de processamento de 10% por pagamento tardio.",
          "badge": "Taxa 10% Aplicada"
        }
      },
      "common": {
        "conflictReason": {
          "slot_unavailable": "O horário foi reservado por outro cliente.",
          "minimum_notice_violated": "A consulta não cumpriu o requisito de {minimumNoticeHours} horas de aviso mínimo do especialista.",
          "expert_blocked_time": "O especialista bloqueou este horário no calendário.",
          "unknown_conflict": "A consulta não pôde ser honrada devido a um conflito de agendamento."
        },
        "nextSteps": "Se tiver dúvidas, entre em contato com nossa equipe de suporte.",
        "supportLink": "Contatar Suporte"
      }
    },
    "latePaymentStatus": {
      "eligible": {
        "title": "Cortesia Primeira Vez Elegível",
        "description": "Se alguma vez tiver um pagamento Multibanco tardio, dispensaremos a taxa de 10% como cortesia única."
      },
      "used": {
        "title": "Cortesia Primeira Vez Usada",
        "description": "Você usou sua dispensa única. Futuros pagamentos Multibanco tardios estão sujeitos a uma taxa de 10%."
      }
    }
  }
}
```

### Acceptance Criteria

- [ ] All 4 language files updated with new translation keys
- [ ] Consistent structure across all languages
- [ ] Culturally appropriate translations (reviewed by native speakers)
- [ ] No placeholder text or English fallbacks in non-English files
- [ ] JSON syntax valid (no trailing commas)
- [ ] Translation keys match email template variables

### Testing

```bash
# Validate JSON syntax
pnpm exec jsonlint messages/en.json
pnpm exec jsonlint messages/es.json
pnpm exec jsonlint messages/pt.json
pnpm exec jsonlint messages/br.json

# Build to check for i18n errors
pnpm build
```

---

## Step 6: Dashboard UI (Optional)

**Linear Issue Title**: `[Frontend] Add Late Payment Status Display to User Dashboard`

**Priority**: Low (Nice-to-have)  
**Estimated Time**: 2-3 hours  
**Dependencies**: Step 1 (Schema), Step 5 (Translations)  
**Labels**: `frontend`, `ui`, `dashboard`, `react`

### Description

Display the user's late payment status in the dashboard, showing whether they're eligible for the first-time courtesy waiver or have already used it.

### Technical Details

**File**: Create `components/molecules/LatePaymentStatus.tsx`

```typescript
'use client';

import { useUser } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

/**
 * Display user's late payment status and first-time waiver eligibility
 *
 * Shows:
 * - Green badge if eligible for first-time courtesy
 * - Orange badge if already used first-time courtesy
 */
export function LatePaymentStatus() {
  const { user } = useUser();
  const t = useTranslations('payments.latePaymentStatus');

  // Get late payment status from Clerk public metadata
  // (This should be synced from database to Clerk via webhook)
  const hasHadLatePayment = user?.publicMetadata?.hasHadLateMultibancoPayment as boolean;
  const latePaymentCount = user?.publicMetadata?.lateMultibancoPaymentCount as number;

  if (!user) {
    return null;
  }

  // User is eligible for first-time courtesy
  if (!hasHadLatePayment) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <h4 className="font-semibold text-green-900 text-sm">
              {t('eligible.title')}
            </h4>
            <p className="text-sm text-green-700 mt-1">
              {t('eligible.description')}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1">
            <span className="text-xs font-semibold text-green-800">100%</span>
          </div>
        </div>
      </div>
    );
  }

  // User has already used first-time courtesy
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <h4 className="font-semibold text-orange-900 text-sm">
            {t('used.title')}
          </h4>
          <p className="text-sm text-orange-700 mt-1">
            {t('used.description')}
          </p>
          {latePaymentCount > 0 && (
            <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
              <Info className="h-3 w-3" aria-hidden="true" />
              Late payments: {latePaymentCount}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1">
          <span className="text-xs font-semibold text-orange-800">90%</span>
        </div>
      </div>
    </div>
  );
}
```

**File**: Update `app/(private)/account/payments/page.tsx` (or relevant dashboard page)

Add the component to the payments section:

```typescript
import { LatePaymentStatus } from '@/components/molecules/LatePaymentStatus';

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <h1>Payment Settings</h1>

      {/* Add late payment status */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Multibanco Late Payment Policy</h2>
        <LatePaymentStatus />
      </section>

      {/* ... other payment sections ... */}
    </div>
  );
}
```

### Clerk Metadata Sync (Required)

**File**: Update user webhook handler to sync metadata to Clerk

```typescript
// app/api/webhooks/clerk/route.ts or similar

async function syncUserMetadataToClerk(userId: string) {
  const user = await db.query.UserTable.findFirst({
    where: eq(UserTable.clerkUserId, userId),
    columns: {
      hasHadLateMultibancoPayment: true,
      lateMultibancoPaymentCount: true,
      firstLateMultibancoPaymentDate: true,
    },
  });

  if (!user) return;

  await clerkClient.users.updateUserMetadata(userId, {
    publicMetadata: {
      hasHadLateMultibancoPayment: user.hasHadLateMultibancoPayment,
      lateMultibancoPaymentCount: user.lateMultibancoPaymentCount,
      firstLateMultibancoPaymentDate: user.firstLateMultibancoPaymentDate?.toISOString(),
    },
  });
}
```

### Acceptance Criteria

- [ ] `LatePaymentStatus` component created
- [ ] Component shows correct status based on user metadata
- [ ] Accessible (ARIA labels, semantic HTML)
- [ ] Responsive design (mobile + desktop)
- [ ] Translations used (no hardcoded text)
- [ ] Component integrated into dashboard
- [ ] Clerk metadata synced from database

### Testing

```typescript
// Component test
describe('LatePaymentStatus', () => {
  it('shows eligible status for new users', () => {
    const { getByText } = render(<LatePaymentStatus />, {
      user: { publicMetadata: { hasHadLateMultibancoPayment: false } },
    });
    expect(getByText('First-Time Courtesy Eligible')).toBeInTheDocument();
  });

  it('shows used status for users with late payment history', () => {
    const { getByText } = render(<LatePaymentStatus />, {
      user: {
        publicMetadata: {
          hasHadLateMultibancoPayment: true,
          lateMultibancoPaymentCount: 2,
        }
      },
    });
    expect(getByText('First-Time Courtesy Used')).toBeInTheDocument();
    expect(getByText('Late payments: 2')).toBeInTheDocument();
  });
});
```

---

## Step 7: Analytics & Monitoring

**Linear Issue Title**: `[Analytics] Add Tracking for First-Time Waiver Usage & Metrics`

**Priority**: Medium  
**Estimated Time**: 2 hours  
**Dependencies**: Step 3 (Refund Logic)  
**Labels**: `analytics`, `monitoring`, `posthog`

### Description

Implement analytics tracking for first-time waiver usage to measure the impact on customer satisfaction, chargebacks, and refund patterns.

### Technical Details

**File**: Create `lib/analytics/payment-events.ts`

```typescript
import { posthog } from '@/lib/analytics/posthog';

/**
 * Track when first-time waiver is applied
 */
export function trackFirstTimeWaiverApplied(data: {
  userId?: string;
  guestEmail: string;
  paymentIntentId: string;
  refundAmount: number;
  originalAmount: number;
  conflictReason: string;
  locale: string;
}) {
  posthog.capture('first_time_waiver_applied', {
    $set: {
      has_used_first_time_waiver: true,
      first_time_waiver_date: new Date().toISOString(),
    },
    guest_email: data.guestEmail,
    payment_intent_id: data.paymentIntentId,
    refund_amount: data.refundAmount / 100, // Convert to euros
    original_amount: data.originalAmount / 100,
    fee_waived: (data.originalAmount - data.refundAmount) / 100,
    conflict_reason: data.conflictReason,
    locale: data.locale,
  });

  console.log(`📊 Analytics: First-time waiver tracked for ${data.guestEmail}`);
}

/**
 * Track when processing fee is applied (subsequent late payment)
 */
export function trackSubsequentLatePaymentFee(data: {
  userId?: string;
  guestEmail: string;
  paymentIntentId: string;
  refundAmount: number;
  processingFee: number;
  latePaymentCount: number;
  conflictReason: string;
  locale: string;
}) {
  posthog.capture('subsequent_late_payment_fee_applied', {
    $set: {
      late_payment_count: data.latePaymentCount,
      last_late_payment_date: new Date().toISOString(),
    },
    guest_email: data.guestEmail,
    payment_intent_id: data.paymentIntentId,
    refund_amount: data.refundAmount / 100,
    processing_fee: data.processingFee / 100,
    late_payment_count: data.latePaymentCount,
    conflict_reason: data.conflictReason,
    locale: data.locale,
  });

  console.log(
    `📊 Analytics: Processing fee tracked for ${data.guestEmail} (count: ${data.latePaymentCount})`,
  );
}

/**
 * Track late payment conflict detection
 */
export function trackLatePaymentConflictDetected(data: {
  paymentIntentId: string;
  guestEmail: string;
  expertId: string;
  conflictReason: string;
  appointmentDate: Date;
}) {
  posthog.capture('late_payment_conflict_detected', {
    payment_intent_id: data.paymentIntentId,
    guest_email: data.guestEmail,
    expert_id: data.expertId,
    conflict_reason: data.conflictReason,
    appointment_date: data.appointmentDate.toISOString(),
    days_until_appointment: Math.ceil(
      (data.appointmentDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
  });
}
```

**File**: Update `app/api/webhooks/stripe/handlers/payment.ts`

Add analytics calls in `processPartialRefund`:

```typescript
async function processPartialRefund(
  paymentIntent: Stripe.PaymentIntent,
  reason: string,
  guestEmail: string,
): Promise<Stripe.Refund | null> {
  try {
    const originalAmount = paymentIntent.amount;
    const isFirstTime = await isFirstTimeLatePayment(guestEmail);
    const refundAmount = isFirstTime ? originalAmount : Math.floor(originalAmount * 0.9);
    const processingFee = originalAmount - refundAmount;

    // ... refund creation logic ...

    // 🆕 Track analytics
    if (isFirstTime) {
      trackFirstTimeWaiverApplied({
        guestEmail,
        paymentIntentId: paymentIntent.id,
        refundAmount,
        originalAmount,
        conflictReason: reason,
        locale: extractLocaleFromPaymentIntent(paymentIntent),
      });
    } else {
      const user = await db.query.UserTable.findFirst({
        where: eq(UserTable.email, guestEmail),
        columns: { lateMultibancoPaymentCount: true },
      });

      trackSubsequentLatePaymentFee({
        guestEmail,
        paymentIntentId: paymentIntent.id,
        refundAmount,
        processingFee,
        latePaymentCount: (user?.lateMultibancoPaymentCount || 0) + 1,
        conflictReason: reason,
        locale: extractLocaleFromPaymentIntent(paymentIntent),
      });
    }

    return refund;
  } catch (error) {
    console.error('Error processing partial refund:', error);
    return null;
  }
}
```

### PostHog Dashboard Setup

Create a PostHog dashboard with the following insights:

1. **First-Time Waiver Usage**
   - Metric: Count of `first_time_waiver_applied` events
   - Breakdown: By locale, conflict reason
   - Goal: Track adoption and usage patterns

2. **Processing Fee Revenue**
   - Metric: Sum of `processing_fee` from `subsequent_late_payment_fee_applied`
   - Breakdown: By month, locale
   - Goal: Track revenue impact

3. **Late Payment Frequency**
   - Metric: Count of `late_payment_conflict_detected` events
   - Breakdown: By day of week, expert
   - Goal: Identify patterns and problem experts

4. **Repeat Offender Rate**
   - Metric: Unique users with `late_payment_count > 1`
   - Breakdown: By cohort, locale
   - Goal: Measure waiver effectiveness

5. **Chargeback Correlation**
   - Metric: Chargebacks vs. late payment status
   - Breakdown: First-time waiver vs. fee applied
   - Goal: Validate policy reduces chargebacks

### Acceptance Criteria

- [ ] `payment-events.ts` file created with tracking functions
- [ ] Analytics calls integrated into refund logic
- [ ] PostHog dashboard created
- [ ] Events include all relevant metadata
- [ ] User properties updated (`$set`)
- [ ] No PII logged in analytics (email hashed if needed)

### Testing

```typescript
// Unit test
describe('trackFirstTimeWaiverApplied', () => {
  it('captures event with correct properties', () => {
    const mockCapture = jest.spyOn(posthog, 'capture');

    trackFirstTimeWaiverApplied({
      guestEmail: 'test@example.com',
      paymentIntentId: 'pi_123',
      refundAmount: 10000,
      originalAmount: 10000,
      conflictReason: 'slot_unavailable',
      locale: 'en',
    });

    expect(mockCapture).toHaveBeenCalledWith(
      'first_time_waiver_applied',
      expect.objectContaining({
        guest_email: 'test@example.com',
        payment_intent_id: 'pi_123',
        refund_amount: 100,
        original_amount: 100,
        fee_waived: 0,
      }),
    );
  });
});
```

---

## 🧪 Testing Strategy

### Unit Tests

**File**: `tests/lib/payment-refund.test.ts`

```typescript
import {
  isFirstTimeLatePayment,
  recordLatePayment,
} from '@/app/api/webhooks/stripe/handlers/payment';
import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

describe('First-Time Waiver Logic', () => {
  beforeEach(async () => {
    // Clear test data
    await db.delete(UserTable).where(eq(UserTable.email, 'test@example.com'));
  });

  describe('isFirstTimeLatePayment', () => {
    it('returns true for new guest (no user account)', async () => {
      const result = await isFirstTimeLatePayment('newguest@example.com');
      expect(result).toBe(true);
    });

    it('returns true for user with no late payment history', async () => {
      // Create user with hasHadLateMultibancoPayment = false
      await db.insert(UserTable).values({
        clerkUserId: 'user_test123',
        email: 'test@example.com',
        hasHadLateMultibancoPayment: false,
        lateMultibancoPaymentCount: 0,
      });

      const result = await isFirstTimeLatePayment('test@example.com');
      expect(result).toBe(true);
    });

    it('returns false for user with late payment history', async () => {
      // Create user with hasHadLateMultibancoPayment = true
      await db.insert(UserTable).values({
        clerkUserId: 'user_test456',
        email: 'repeat@example.com',
        hasHadLateMultibancoPayment: true,
        lateMultibancoPaymentCount: 1,
      });

      const result = await isFirstTimeLatePayment('repeat@example.com');
      expect(result).toBe(false);
    });

    it('returns true on database error (fail-open)', async () => {
      jest.spyOn(db.query.UserTable, 'findFirst').mockRejectedValue(new Error('DB error'));

      const result = await isFirstTimeLatePayment('test@example.com');
      expect(result).toBe(true); // Default to first-time on error
    });
  });

  describe('recordLatePayment', () => {
    it('sets hasHadLateMultibancoPayment to true', async () => {
      await db.insert(UserTable).values({
        clerkUserId: 'user_test789',
        email: 'record@example.com',
        hasHadLateMultibancoPayment: false,
        lateMultibancoPaymentCount: 0,
      });

      await recordLatePayment('record@example.com', 'pi_test123');

      const user = await db.query.UserTable.findFirst({
        where: eq(UserTable.email, 'record@example.com'),
      });

      expect(user?.hasHadLateMultibancoPayment).toBe(true);
      expect(user?.lateMultibancoPaymentCount).toBe(1);
      expect(user?.firstLateMultibancoPaymentDate).toBeTruthy();
    });

    it('increments lateMultibancoPaymentCount', async () => {
      await db.insert(UserTable).values({
        clerkUserId: 'user_test999',
        email: 'increment@example.com',
        hasHadLateMultibancoPayment: true,
        lateMultibancoPaymentCount: 1,
        firstLateMultibancoPaymentDate: new Date('2024-01-01'),
      });

      await recordLatePayment('increment@example.com', 'pi_test456');

      const user = await db.query.UserTable.findFirst({
        where: eq(UserTable.email, 'increment@example.com'),
      });

      expect(user?.lateMultibancoPaymentCount).toBe(2);
      // firstLateMultibancoPaymentDate should NOT change
      expect(user?.firstLateMultibancoPaymentDate?.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('does not throw on guest checkout (no user)', async () => {
      await expect(recordLatePayment('guest@example.com', 'pi_guest123')).resolves.not.toThrow();
    });
  });
});
```

### Integration Tests

**File**: `tests/api/webhooks/stripe-refund-integration.test.ts`

```typescript
import { handlePaymentSucceeded } from '@/app/api/webhooks/stripe/handlers/payment';
import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { createMockPaymentIntent } from '@/tests/mocks/stripe';
import { eq } from 'drizzle-orm';

describe('First-Time Waiver Integration', () => {
  describe('Multibanco Late Payment Refunds', () => {
    it('refunds 100% for first-time late payer', async () => {
      const mockStripeRefund = jest.fn().mockResolvedValue({
        id: 'ref_test123',
        amount: 10000,
        status: 'succeeded',
        metadata: {},
      });
      stripe.refunds.create = mockStripeRefund;

      const paymentIntent = createMockPaymentIntent({
        amount: 10000,
        payment_method_types: ['multibanco'],
        metadata: {
          meeting: JSON.stringify({
            id: 'meeting_123',
            expert: 'expert_123',
            guest: 'firsttime@example.com',
            guestName: 'First Timer',
            start: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
            dur: 60,
          }),
        },
      });

      // Simulate conflict (appointment already booked)
      jest.spyOn(db.query.MeetingTable, 'findFirst').mockResolvedValue({
        id: 'meeting_conflict',
        startTime: paymentIntent.metadata.meeting.start,
        // ... other meeting data
      });

      await handlePaymentSucceeded(paymentIntent);

      // Verify 100% refund
      expect(mockStripeRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10000, // 100%
          metadata: expect.objectContaining({
            is_first_time_late_payment: 'true',
            first_time_courtesy_applied: 'true',
            refund_percentage: '100',
          }),
        }),
      );
    });

    it('refunds 90% for repeat late payer', async () => {
      // Create user with late payment history
      await db.insert(UserTable).values({
        clerkUserId: 'user_repeat',
        email: 'repeat@example.com',
        hasHadLateMultibancoPayment: true,
        lateMultibancoPaymentCount: 1,
      });

      const mockStripeRefund = jest.fn().mockResolvedValue({
        id: 'ref_test456',
        amount: 9000,
        status: 'succeeded',
        metadata: {},
      });
      stripe.refunds.create = mockStripeRefund;

      const paymentIntent = createMockPaymentIntent({
        amount: 10000,
        payment_method_types: ['multibanco'],
        metadata: {
          meeting: JSON.stringify({
            id: 'meeting_456',
            expert: 'expert_456',
            guest: 'repeat@example.com',
            guestName: 'Repeat User',
            start: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
            dur: 60,
          }),
        },
      });

      await handlePaymentSucceeded(paymentIntent);

      // Verify 90% refund
      expect(mockStripeRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 9000, // 90%
          metadata: expect.objectContaining({
            is_first_time_late_payment: 'false',
            first_time_courtesy_applied: 'false',
            refund_percentage: '90',
            processing_fee: '1000',
          }),
        }),
      );

      // Verify late payment count incremented
      const user = await db.query.UserTable.findFirst({
        where: eq(UserTable.email, 'repeat@example.com'),
      });
      expect(user?.lateMultibancoPaymentCount).toBe(2);
    });
  });
});
```

### E2E Tests (Cypress/Playwright)

```typescript
// tests/e2e/late-payment-dashboard.spec.ts
describe('Late Payment Status Dashboard', () => {
  it('shows first-time eligible status for new user', () => {
    cy.login('newuser@example.com');
    cy.visit('/account/payments');

    cy.contains('First-Time Courtesy Eligible').should('be.visible');
    cy.contains('100%').should('be.visible');
  });

  it('shows used status after late payment', () => {
    cy.login('usedwaiver@example.com');
    cy.visit('/account/payments');

    cy.contains('First-Time Courtesy Used').should('be.visible');
    cy.contains('90%').should('be.visible');
    cy.contains('Late payments: 1').should('be.visible');
  });
});
```

---

## 📊 Metrics & KPIs

Track these metrics to measure the success of the first-time waiver policy:

### Primary Metrics

| Metric                                    | Current (Estimated) | Target    | Measurement        |
| ----------------------------------------- | ------------------- | --------- | ------------------ |
| **Chargeback Rate**                       | 2-5%                | <1%       | Stripe Dashboard   |
| **Customer Support Tickets**              | 100/month           | <60/month | Support System     |
| **Customer Satisfaction (Late Payments)** | N/A                 | >4.0/5.0  | Post-refund survey |
| **Repeat Late Payment Rate**              | N/A                 | <10%      | Analytics          |

### Secondary Metrics

| Metric                      | Purpose            | Measurement    |
| --------------------------- | ------------------ | -------------- |
| **First-Time Waiver Usage** | Track adoption     | PostHog        |
| **Processing Fee Revenue**  | Financial impact   | Stripe Reports |
| **Late Payment Frequency**  | Identify patterns  | PostHog        |
| **Time to Resolution**      | Support efficiency | Support System |

### Dashboard Queries (PostHog)

```javascript
// First-time waiver adoption rate
events
  .filter((event) => event.event === 'first_time_waiver_applied')
  .groupBy('week')
  .count();

// Repeat offender rate
users.filter((user) => user.late_payment_count > 1).percentage();

// Chargeback correlation
events
  .filter((event) => event.event === 'dispute_created')
  .correlate((user) => user.has_used_first_time_waiver);
```

---

## 🚀 Deployment Plan

### Phase 1: Database Changes (Week 1)

- **Step 1**: Deploy schema changes
- **Step 2**: Run database migration
- **Verification**: Check production database for new columns

### Phase 2: Backend Logic (Week 1-2)

- **Step 3**: Deploy refund logic (feature flag OFF)
- **Verification**: Test in staging with mock Stripe events

### Phase 3: Content & UI (Week 2)

- **Step 4**: Deploy email notification updates
- **Step 5**: Deploy translations
- **Step 6**: Deploy dashboard UI (optional)
- **Verification**: Test emails in all 4 languages

### Phase 4: Launch (Week 2)

- **Step 7**: Enable analytics tracking
- **Enable feature flag**: Turn on first-time waiver logic
- **Monitor**: Watch PostHog dashboard for 48 hours
- **Adjust**: Fix any issues, gather feedback

### Phase 5: Communication (Week 3)

- Send announcement email to all users
- Update payment policies page (already done)
- Publish blog post about new policy
- Monitor customer feedback

### Rollback Plan

If issues arise:

1. **Disable feature flag** (immediate)
2. **Revert webhook handler** to previous version
3. **Keep database fields** (data is valuable for future)
4. **Communicate** with affected users

---

## 🔧 Configuration

### Feature Flag

**File**: `config/feature-flags.ts`

```typescript
export const FEATURE_FLAGS = {
  FIRST_TIME_LATE_PAYMENT_WAIVER: process.env.NEXT_PUBLIC_ENABLE_FIRST_TIME_WAIVER === 'true',
} as const;
```

**File**: `.env`

```bash
# Feature Flags
NEXT_PUBLIC_ENABLE_FIRST_TIME_WAIVER=false  # Set to true to enable
```

**Usage in Code**:

```typescript
import { FEATURE_FLAGS } from '@/config/feature-flags';

async function processPartialRefund(...) {
  if (!FEATURE_FLAGS.FIRST_TIME_LATE_PAYMENT_WAIVER) {
    // Old logic: Always 90% refund
    const refundAmount = Math.floor(originalAmount * 0.9);
  } else {
    // New logic: First-time waiver
    const isFirstTime = await isFirstTimeLatePayment(guestEmail);
    const refundAmount = isFirstTime ? originalAmount : Math.floor(originalAmount * 0.9);
  }
}
```

---

## 📚 Documentation Updates

Update the following documentation files:

1. **`docs/02-core-systems/payments/02-stripe-integration.md`**
   - Add section: "First-Time Late Payment Waiver"
   - Document refund logic flowchart

2. **`docs/02-core-systems/payments/05-multibanco-integration.md`**
   - Add section: "Late Payment Handling"
   - Document 7-day payment window and conflict detection

3. **`README.md`** (project root)
   - Update feature list to include first-time waiver policy

4. **`docs/04-development/testing-guidelines.md`**
   - Add test cases for first-time waiver logic

---

## 🎯 Success Criteria

This implementation is considered successful when:

- [ ] All 7 steps are completed and deployed
- [ ] Database migration runs successfully in production
- [ ] First-time late payers receive 100% refunds
- [ ] Repeat late payers receive 90% refunds
- [ ] Email notifications are sent correctly in all 4 languages
- [ ] Analytics tracking is working in PostHog
- [ ] No increase in production errors
- [ ] Chargeback rate decreases by 30% within 3 months
- [ ] Customer support tickets about refunds decrease by 40%
- [ ] Positive customer feedback received

---

## 🤝 Support & Questions

If you have questions during implementation:

1. **Technical Questions**: Post in #engineering Slack channel
2. **Product Questions**: Contact Product team
3. **Analytics Questions**: Contact Data team
4. **Legal Questions**: Contact Legal team

---

## 📝 Related Documents

- [Payment Policies (User-Facing)](/content/payment-policies/en.mdx)
- [Stripe Integration Guide](./02-stripe-integration.md)
- [Multibanco Integration](./05-multibanco-integration.md)
- [Database Schema](../../01-getting-started/05-database-schema.md)
- [Testing Guidelines](../../04-development/testing-guidelines.md)

---

**Last Updated**: January 2025  
**Author**: Engineering Team  
**Reviewers**: Product, Legal, Finance
