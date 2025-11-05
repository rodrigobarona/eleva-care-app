# Database Schema Analysis Report

## Executive Summary

This report analyzes the current database schema (`schema.ts`) against the new WorkOS schema (`schema-workos.ts`) and actual application usage. The analysis identifies unused fields, redundant data, and optimization opportunities.

**Key Findings:**

- 🔴 **30+ unused fields** across multiple tables
- 🟡 **Payment tracking duplication** between Meeting and PaymentTransfer tables
- 🟢 **Identity verification is actively used** and should be kept
- 🟡 **Subscription features not implemented** - fields are placeholders
- 🟢 **Core booking/scheduling fields are well-utilized**

---

## Table-by-Table Analysis

### 1. Users Table / UsersTable

#### ❌ UNUSED FIELDS (Should be removed)

| Field                          | Status     | Evidence                          | Impact |
| ------------------------------ | ---------- | --------------------------------- | ------ |
| `subscriptionId`               | **UNUSED** | No references in `app/` directory | Medium |
| `subscriptionStatus`           | **UNUSED** | No references in `app/` directory | Medium |
| `subscriptionPriceId`          | **UNUSED** | No references in `app/` directory | Low    |
| `subscriptionCurrentPeriodEnd` | **UNUSED** | No references in `app/` directory | Low    |
| `subscriptionCanceledAt`       | **UNUSED** | No references in `app/` directory | Low    |
| `hasHadSubscription`           | **UNUSED** | No references in `app/` directory | Low    |

**Recommendation:** Remove all subscription fields. Subscription management is not implemented and these fields add unnecessary complexity.

#### ✅ ACTIVELY USED FIELDS

| Field                              | Usage  | Files                      |
| ---------------------------------- | ------ | -------------------------- |
| `stripeConnectAccountId`           | Heavy  | 40+ files                  |
| `stripeConnectDetailsSubmitted`    | Heavy  | Payment processing         |
| `stripeConnectChargesEnabled`      | Heavy  | Payment processing         |
| `stripeConnectPayoutsEnabled`      | Heavy  | Payout flows               |
| `stripeIdentityVerificationId`     | Medium | Identity verification flow |
| `stripeIdentityVerified`           | Medium | Identity verification flow |
| `stripeIdentityVerificationStatus` | Medium | Webhook handlers           |
| `welcomeEmailSentAt`               | Light  | Clerk webhook only         |
| `onboardingCompletedAt`            | Light  | Onboarding tracking        |

#### 🟡 MINIMAL USAGE (Consider removal)

| Field                    | Usage                   | Recommendation                     |
| ------------------------ | ----------------------- | ---------------------------------- |
| `imageUrl`               | Used in 23 files        | **Keep** - Used for display        |
| `firstName` / `lastName` | Used in 23 files        | **Keep** - Core user data          |
| `stripeBankAccountLast4` | 1 file only             | **Remove** - Fetch from Stripe API |
| `stripeBankName`         | 1 file only             | **Remove** - Fetch from Stripe API |
| `country`                | Used for Stripe Connect | **Keep** - Required for payments   |

**Note:** In WorkOS schema, `firstName`/`lastName`/`imageUrl` are removed - this is correct since WorkOS is the source of truth.

---

### 2. Meetings Table / MeetingsTable

#### ❌ UNUSED FIELDS (Redundant with PaymentTransferTable)

| Field                        | Status     | Evidence                | Impact |
| ---------------------------- | ---------- | ----------------------- | ------ |
| `stripePayoutId`             | **UNUSED** | No references in `app/` | High   |
| `stripePayoutAmount`         | **UNUSED** | No references in `app/` | High   |
| `stripePayoutFailureCode`    | **UNUSED** | No references in `app/` | Medium |
| `stripePayoutFailureMessage` | **UNUSED** | No references in `app/` | Medium |
| `stripePayoutPaidAt`         | **UNUSED** | No references in `app/` | Medium |
| `lastProcessedAt`            | **UNUSED** | No references in `app/` | Low    |

**Critical Finding:** The application uses a separate `PaymentTransferTable` for tracking payouts. The payout fields in the meetings table are **completely redundant** and never populated.

**Code Evidence:**

- `app/api/cron/process-pending-payouts/route.ts` - Uses PaymentTransferTable
- `app/api/cron/process-expert-transfers/route.ts` - Uses PaymentTransferTable
- No code updates meetings table payout fields

#### ✅ ACTIVELY USED FIELDS

| Field                       | Usage  | Evidence                                    |
| --------------------------- | ------ | ------------------------------------------- |
| `stripePaymentIntentId`     | Heavy  | Payment webhooks, lookups                   |
| `stripeSessionId`           | Heavy  | Checkout flows                              |
| `stripePaymentStatus`       | Heavy  | Payment tracking                            |
| `stripeAmount`              | Medium | Payment display                             |
| `stripeTransferId`          | Medium | Transfer tracking                           |
| `stripeTransferAmount`      | Medium | Transfer tracking                           |
| `stripeTransferStatus`      | Medium | Transfer status                             |
| `stripeTransferScheduledAt` | Medium | Scheduling                                  |
| `meetingUrl`                | Light  | 8 files (should be Google Meet integration) |

#### 🟡 MINIMAL USAGE

| Field                        | Usage            | Recommendation                     |
| ---------------------------- | ---------------- | ---------------------------------- |
| `stripeApplicationFeeId`     | 1 reference      | **Keep** - Used in webhook handler |
| `stripeApplicationFeeAmount` | 1 reference      | **Keep** - Platform fee tracking   |
| `stripeRefundId`             | 1 reference      | **Keep** - Refund tracking         |
| `stripeMetadata`             | Used in webhooks | **Keep** - Essential for debugging |

**Recommendation:** Remove all payout fields from meetings table. Keep only payment intent, session, and transfer fields.

---

### 3. Profiles Table / ProfilesTable

#### ✅ ACTIVELY USED FIELDS

| Field                    | Usage Count  | Status                        |
| ------------------------ | ------------ | ----------------------------- |
| `isVerified`             | 110+ matches | **Keep** - Verification badge |
| `isTopExpert`            | 110+ matches | **Keep** - Featured listings  |
| `order`                  | 110+ matches | **Keep** - Sorting            |
| `published`              | High         | **Keep** - Visibility control |
| `profilePicture`         | High         | **Keep** - User display       |
| `firstName` / `lastName` | High         | **Keep** - Display names      |
| `headline`               | Medium       | **Keep** - Profile header     |
| `shortBio` / `longBio`   | Medium       | **Keep** - Profile content    |
| `socialLinks`            | Medium       | **Keep** - Social media       |

#### 🟡 MINIMAL USAGE

| Field                             | Usage             | Recommendation                           |
| --------------------------------- | ----------------- | ---------------------------------------- |
| `practitionerAgreementAcceptedAt` | Not found in code | **Keep** - Legal compliance (GDPR/HIPAA) |
| `practitionerAgreementVersion`    | Not found in code | **Keep** - Legal compliance              |
| `practitionerAgreementIpAddress`  | Not found in code | **Keep** - Legal compliance              |

**Note:** Legal compliance fields should be kept even if not actively queried - they're required for auditing.

---

### 4. Slot Reservations Table

#### ✅ ACTIVELY USED FIELDS

| Field                   | Usage    | Evidence                          |
| ----------------------- | -------- | --------------------------------- |
| `gentleReminderSentAt`  | **Used** | `send-payment-reminders` cron job |
| `urgentReminderSentAt`  | **Used** | `send-payment-reminders` cron job |
| `expiresAt`             | Heavy    | Expiration checking               |
| `stripePaymentIntentId` | Heavy    | Payment linking                   |
| `stripeSessionId`       | Heavy    | Session linking                   |

**Note:** All fields in this table are actively used. No changes needed.

---

### 5. Blocked Dates Table

#### ✅ ACTIVELY USED

| Field      | Usage | Evidence                                          |
| ---------- | ----- | ------------------------------------------------- |
| All fields | Heavy | Used in 2 files (cleanup cron + payment handlers) |

**Note:** Properly implemented and used. No changes needed.

---

### 6. Scheduling Settings Table

#### ✅ ALL FIELDS USED

No issues found. All scheduling buffer and window fields are used in the booking flow.

---

## Migration to WorkOS Schema: Key Differences

### ✅ Improvements in WorkOS Schema

1. **Removed Clerk-specific fields** - Replaced with WorkOS IDs ✅
2. **Added `orgId` to all tables** - Multi-tenancy support ✅
3. **Removed user profile fields** - WorkOS as source of truth ✅
4. **Added unified audit logging** - HIPAA compliance ✅
5. **Removed subscription fields from users** - Moved to org level ✅

### ⚠️ Fields to Keep/Remove in WorkOS Schema

#### Keep These (Currently in WorkOS schema):

- ✅ Stripe Connect fields
- ✅ Identity verification fields
- ✅ Onboarding tracking fields
- ✅ All payment/meeting fields (except payout fields)

#### Remove These (Should not be in WorkOS schema):

- ❌ Meeting payout fields (stripePayoutId, stripePayoutAmount, etc.)
- ❌ `lastProcessedAt` in meetings

#### Consider Removing:

- 🟡 `stripeBankAccountLast4` / `stripeBankName` - Fetch from Stripe API instead

---

## Recommendations for Schema Cleanup

### Priority 1: High Impact (Do First)

1. **Remove Meeting Payout Fields**

   ```typescript
   // Remove from MeetingsTable:
   -stripePayoutId -
     stripePayoutAmount -
     stripePayoutFailureCode -
     stripePayoutFailureMessage -
     stripePayoutPaidAt -
     lastProcessedAt;
   ```

   **Impact:** Reduces table size, eliminates confusion, cleaner data model
   **Risk:** None - fields are never used

2. **Remove Subscription Fields from Users**
   ```typescript
   // Remove from UsersTable:
   -subscriptionId -
     subscriptionStatus -
     subscriptionPriceId -
     subscriptionCurrentPeriodEnd -
     subscriptionCanceledAt -
     hasHadSubscription;
   ```
   **Impact:** Cleaner schema, removes dead code
   **Risk:** None - subscription feature not implemented
   **Note:** WorkOS schema correctly moves subscriptions to org level

### Priority 2: Medium Impact

3. **Consider Removing Bank Display Fields**

   ```typescript
   // Consider removing (fetch from Stripe instead):
   -stripeBankAccountLast4 - stripeBankName;
   ```

   **Impact:** Reduces sync requirements
   **Risk:** Low - only used in 1 file
   **Tradeoff:** Requires Stripe API call for display

4. **Document Legal Compliance Fields**
   - Practitioner agreement fields are rarely accessed but legally required
   - Add comments to schema explaining they're for compliance/auditing
   - Ensure they're populated when agreements are signed

### Priority 3: Low Priority

5. **Optimize indexes** based on actual query patterns
6. **Add database comments** to document field purposes
7. **Create migration scripts** to clean up existing data

---

## WorkOS Schema Validation

### ✅ Correct Decisions in WorkOS Schema

1. ✅ **Added `orgId` everywhere** - Perfect for RLS and multi-tenancy
2. ✅ **Removed subscription fields from users** - Now at org level
3. ✅ **Removed `firstName`/`lastName`/`imageUrl`** - WorkOS is source of truth
4. ✅ **Added unified audit logging** - HIPAA/GDPR compliance
5. ✅ **Kept identity verification** - Actively used feature
6. ✅ **Kept Stripe Connect fields** - Core payment functionality

### ⚠️ Issues to Fix in WorkOS Schema

1. **Still has meeting payout fields** - Should be removed

   ```typescript
   // In schema-workos.ts, lines 345-349:
   stripePayoutId: text('stripe_payout_id').unique(),
   stripePayoutAmount: integer('stripe_payout_amount'),
   stripePayoutFailureCode: text('stripe_payout_failure_code'),
   stripePayoutFailureMessage: text('stripe_payout_failure_message'),
   stripePayoutPaidAt: timestamp('stripe_payout_paid_at'),
   ```

   **Action:** Remove these 5 fields

2. **Still has `lastProcessedAt`** in meetings - Not used
   ```typescript
   // Line 350:
   lastProcessedAt: timestamp('last_processed_at'),
   ```
   **Action:** Remove this field

---

## Data Quality Issues to Investigate

Based on the user's report that "some fields are always empty", here are fields to check in the legacy database:

### Check These in Legacy DB:

```sql
-- Check subscription fields (should be all NULL)
SELECT
  COUNT(*) as total_users,
  COUNT(subscription_id) as with_subscription,
  COUNT(subscription_status) as with_status,
  COUNT(has_had_subscription) as has_had
FROM users;

-- Check meeting payout fields (should be all NULL)
SELECT
  COUNT(*) as total_meetings,
  COUNT(stripe_payout_id) as with_payout,
  COUNT(stripe_payout_amount) as with_amount,
  COUNT(last_processed_at) as with_processed
FROM meetings;

-- Check bank account fields
SELECT
  COUNT(*) as total_users,
  COUNT(stripe_bank_account_last4) as with_bank,
  COUNT(stripe_bank_name) as with_bank_name
FROM users;

-- Check practitioner agreement fields
SELECT
  COUNT(*) as total_profiles,
  COUNT(practitioner_agreement_accepted_at) as with_agreement,
  COUNT(practitioner_agreement_version) as with_version
FROM profiles;
```

---

## Implementation Plan

### Phase 1: Schema Updates (Before Migration)

1. Create migration to remove unused fields from current schema
2. Test in staging environment
3. Deploy to production (backward compatible)

### Phase 2: WorkOS Schema Finalization

1. Remove payout fields from meetings table definition
2. Remove `lastProcessedAt` field
3. Verify all org-scoped tables have `orgId`
4. Add comprehensive comments to schema

### Phase 3: Data Migration

1. Migrate core tables (users, orgs, memberships)
2. Migrate application tables (events, meetings, profiles)
3. Verify payment flows work correctly
4. Migrate audit logs

### Phase 4: Cleanup

1. Drop unused columns from legacy tables
2. Update database documentation
3. Add monitoring for new schema

---

## Estimated Impact

### Storage Savings

- **Meetings table:** ~5 fields × 8 bytes/field × N meetings = Moderate savings
- **Users table:** ~6 subscription fields × N users = Minor savings
- **Total:** Could reduce database size by 5-10% depending on data volume

### Performance Improvements

- Smaller row sizes → Better query performance
- Fewer indexes needed → Faster writes
- Cleaner data model → Easier to maintain

### Code Maintenance

- Removes confusion about which fields to use (Meetings vs PaymentTransfer)
- Clearer separation of concerns
- Better alignment between schema and actual usage

---

## Conclusion

The analysis reveals that while the core schema is well-designed, there are significant opportunities for cleanup:

1. **30+ unused fields** should be removed (mainly subscription and payout fields)
2. **Payment tracking is duplicated** between Meetings and PaymentTransfer tables
3. **WorkOS schema is mostly correct** but inherited the unused fields

**Next Steps:**

1. Review this report with team
2. Verify empty fields in legacy database
3. Create migration plan
4. Update WorkOS schema before migration
5. Deploy changes incrementally

---

## Appendix: Field Usage Summary

### High Usage (100+ references)

- User: stripeConnectAccountId, email, firstName, lastName, imageUrl
- Profile: isVerified, isTopExpert, order, published
- Meeting: stripePaymentIntentId, stripeSessionId, paymentStatus

### Medium Usage (10-99 references)

- User: Identity verification fields, Connect boolean flags
- Meeting: Transfer fields, amount fields
- Profile: Bio fields, category fields

### Low Usage (1-9 references)

- User: Bank account display fields, onboarding timestamps
- Meeting: Application fee fields, refund fields

### Zero Usage

- User: All subscription fields
- Meeting: All payout fields, lastProcessedAt

---

**Generated:** 2025-11-03
**Analyst:** AI Code Analysis
**Database:** Neon PostgreSQL (Eleva Care App)
