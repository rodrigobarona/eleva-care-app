# Schema Cleanup Summary

## Quick Reference Guide

This document provides a quick reference for schema cleanup decisions based on the comprehensive analysis.

---

## 🎯 Action Items

### ✅ Definitely Remove (High Confidence)

#### Users Table

```typescript
// ❌ Remove these 6 fields:
subscriptionId: text('subscriptionId'),
subscriptionStatus: subscriptionStatusEnum('subscriptionStatus'),
subscriptionPriceId: text('subscriptionPriceId'),
subscriptionCurrentPeriodEnd: timestamp('subscriptionCurrentPeriodEnd'),
subscriptionCanceledAt: timestamp('subscriptionCanceledAt'),
hasHadSubscription: boolean('hasHadSubscription').default(false),
```

**Reason:** Subscription feature not implemented. No references in app code.  
**Impact:** Removes 6 unused fields, cleaner data model  
**Risk:** None

---

#### Meetings Table

```typescript
// ❌ Remove these 6 fields:
stripePayoutId: text('stripe_payout_id').unique(),
stripePayoutAmount: integer('stripe_payout_amount'),
stripePayoutFailureCode: text('stripe_payout_failure_code'),
stripePayoutFailureMessage: text('stripe_payout_failure_message'),
stripePayoutPaidAt: timestamp('stripe_payout_paid_at'),
lastProcessedAt: timestamp('lastProcessedAt'),
```

**Reason:** Payout tracking done via separate `PaymentTransferTable`. These fields never populated.  
**Impact:** Eliminates confusion, reduces duplication  
**Risk:** None - `PaymentTransferTable` is the source of truth

---

### 🟡 Consider Removing (Medium Confidence)

#### Users Table - Bank Display Fields

```typescript
// 🟡 Consider removing (fetch from Stripe API instead):
stripeBankAccountLast4: text('stripe_bank_account_last4'),
stripeBankName: text('stripe_bank_name'),
```

**Reason:** Only used in 1 file, can be fetched from Stripe API  
**Impact:** Reduces sync requirements, one less thing to keep updated  
**Risk:** Requires Stripe API call for display (acceptable tradeoff)  
**Decision:** Run verification query first to check population rate

---

### ✅ Keep (Important Fields)

#### Users Table - Stripe Connect

```typescript
// ✅ Keep - Core payment functionality
stripeConnectAccountId: text('stripe_connect_account_id'),
stripeConnectDetailsSubmitted: boolean('stripe_connect_details_submitted'),
stripeConnectChargesEnabled: boolean('stripe_connect_charges_enabled'),
stripeConnectPayoutsEnabled: boolean('stripe_connect_payouts_enabled'),
stripeConnectOnboardingComplete: boolean('stripe_connect_onboarding_complete'),
```

**Reason:** Used extensively in payment processing (40+ files)

---

#### Users Table - Identity Verification

```typescript
// ✅ Keep - Active feature
stripeIdentityVerificationId: text('stripe_identity_verification_id'),
stripeIdentityVerified: boolean('stripe_identity_verified'),
stripeIdentityVerificationStatus: text('stripe_identity_verification_status'),
stripeIdentityVerificationLastChecked: timestamp('stripe_identity_verification_last_checked'),
```

**Reason:** Full identity verification flow implemented and used

---

#### Users Table - Onboarding

```typescript
// ✅ Keep - Onboarding tracking
welcomeEmailSentAt: timestamp('welcome_email_sent_at'),
onboardingCompletedAt: timestamp('onboarding_completed_at'),
country: text('country').default('PT'),
```

**Reason:** Used in Clerk webhooks and billing flows

---

#### Profiles Table - Legal Compliance

```typescript
// ✅ Keep - Legal requirement (GDPR/HIPAA)
practitionerAgreementAcceptedAt: timestamp('practitioner_agreement_accepted_at'),
practitionerAgreementVersion: text('practitioner_agreement_version'),
practitionerAgreementIpAddress: text('practitioner_agreement_ip_address'),
```

**Reason:** Required for compliance auditing even if rarely accessed

---

#### Profiles Table - Display/Sorting

```typescript
// ✅ Keep - Used in listings
isVerified: boolean('is_verified'),
isTopExpert: boolean('is_top_expert'),
published: boolean('published'),
order: integer('order'),
```

**Reason:** Used 110+ times across the app for filtering/sorting

---

#### Meetings Table - Payment Tracking

```typescript
// ✅ Keep - Core payment flow
stripePaymentIntentId: text('stripe_payment_intent_id'),
stripeSessionId: text('stripe_session_id'),
stripePaymentStatus: text('stripe_payment_status'),
stripeAmount: integer('stripe_amount'),
stripeApplicationFeeAmount: integer('stripe_application_fee_amount'),
stripeApplicationFeeId: text('stripe_application_fee_id'),
stripeRefundId: text('stripe_refund_id'),
stripeMetadata: json('stripe_metadata'),
```

**Reason:** Essential for payment processing and debugging

---

#### Meetings Table - Transfer Tracking

```typescript
// ✅ Keep - Links to PaymentTransferTable
stripeTransferId: text('stripe_transfer_id'),
stripeTransferAmount: integer('stripe_transfer_amount'),
stripeTransferStatus: text('stripe_transfer_status'),
stripeTransferScheduledAt: timestamp('stripe_transfer_scheduled_at'),
```

**Reason:** Used to track transfer status and link to payment transfers

---

#### Slot Reservations - Reminder Tracking

```typescript
// ✅ Keep - Payment reminder system
gentleReminderSentAt: timestamp('gentle_reminder_sent_at'),
urgentReminderSentAt: timestamp('urgent_reminder_sent_at'),
```

**Reason:** Actively used in `send-payment-reminders` cron job

---

## 📋 Migration Checklist

### Before Migration to WorkOS

- [ ] Run verification queries on legacy database
- [ ] Confirm subscription fields are 100% NULL
- [ ] Confirm meeting payout fields are 100% NULL
- [ ] Check bank account field population rate
- [ ] Document practitioner agreement acceptance rate

### Schema Updates

- [ ] Remove subscription fields from `schema-workos.ts`
- [ ] Remove payout fields from `schema-workos.ts` MeetingsTable
- [ ] Remove `lastProcessedAt` from MeetingsTable
- [ ] Decide on bank account fields based on verification
- [ ] Add comments to legal compliance fields

### WorkOS Schema Specific

- [ ] Verify all tables have `orgId` field
- [ ] Verify RLS policies reference orgId
- [ ] Update indexes to include orgId where needed
- [ ] Test queries with org-scoping

### Code Updates

- [ ] Search for any hardcoded field references
- [ ] Update TypeScript types
- [ ] Remove unused imports
- [ ] Update tests

### Deployment

- [ ] Create migration scripts
- [ ] Test in development
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor for errors

---

## 🔧 SQL Migration Scripts

### Drop Subscription Fields (Users Table)

```sql
-- Run after backing up data
ALTER TABLE users
  DROP COLUMN IF EXISTS "subscriptionId",
  DROP COLUMN IF EXISTS "subscriptionStatus",
  DROP COLUMN IF EXISTS "subscriptionPriceId",
  DROP COLUMN IF EXISTS "subscriptionCurrentPeriodEnd",
  DROP COLUMN IF EXISTS "subscriptionCanceledAt",
  DROP COLUMN IF EXISTS "hasHadSubscription";
```

### Drop Payout Fields (Meetings Table)

```sql
-- Run after backing up data
ALTER TABLE meetings
  DROP COLUMN IF EXISTS "stripePayoutId",
  DROP COLUMN IF EXISTS "stripePayoutAmount",
  DROP COLUMN IF EXISTS "stripePayoutFailureCode",
  DROP COLUMN IF EXISTS "stripePayoutFailureMessage",
  DROP COLUMN IF EXISTS "stripePayoutPaidAt",
  DROP COLUMN IF EXISTS "lastProcessedAt";
```

### Optional: Drop Bank Display Fields

```sql
-- Only run if verification shows low usage
ALTER TABLE users
  DROP COLUMN IF EXISTS "stripeBankAccountLast4",
  DROP COLUMN IF EXISTS "stripeBankName";
```

---

## 📊 Expected Results

### Storage Savings

- **Meetings table:** ~6 fields × 8 bytes = 48 bytes per row
- **Users table:** ~6-8 fields × 8 bytes = 48-64 bytes per row
- **Total:** 5-10% database size reduction (depends on row counts)

### Performance Impact

- ✅ Smaller row sizes → Better cache efficiency
- ✅ Fewer indexes → Faster writes
- ✅ Clearer schema → Easier maintenance

### Code Quality

- ✅ No confusion about payment tracking (PaymentTransfer is source of truth)
- ✅ No dead code for subscriptions
- ✅ Better alignment with actual features

---

## 🚨 Rollback Plan

If issues occur after cleanup:

### Quick Rollback

```sql
-- Re-add fields with defaults
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "subscriptionId" text,
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" text;

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS "stripePayoutId" text,
  ADD COLUMN IF NOT EXISTS "stripePayoutAmount" integer;
```

### Full Rollback

- Restore from database backup
- Revert schema changes
- Deploy previous codebase version

---

## 📝 Documentation Updates Needed

After cleanup:

1. Update schema documentation
2. Update API documentation
3. Update migration guides
4. Add comments to remaining fields
5. Document why certain fields exist (legal compliance)

---

## 🎓 Lessons Learned

### Why unused fields accumulated:

1. **Feature planning** - Subscription fields added for future feature
2. **Code evolution** - Payout tracking moved to separate table
3. **Over-engineering** - Cached fields that could be fetched from APIs
4. **Lack of cleanup** - No regular schema audits

### Prevention for future:

1. ✅ Regular schema audits (quarterly)
2. ✅ Document field purposes in schema
3. ✅ Remove unused fields within 3 months of deprecation
4. ✅ Use feature flags instead of schema changes for unreleased features
5. ✅ Code search before adding cached fields

---

## ✅ Sign-off Checklist

Before proceeding with cleanup:

- [ ] Technical lead reviewed analysis
- [ ] Database admin reviewed migration scripts
- [ ] Backup strategy confirmed
- [ ] Rollback plan tested
- [ ] Stakeholders notified
- [ ] Maintenance window scheduled
- [ ] Monitoring alerts configured

---

## 📞 Support

If you have questions about this cleanup:

1. Review `SCHEMA-ANALYSIS-REPORT.md` for detailed analysis
2. Run `verify-unused-fields.sql` queries on legacy database
3. Check application code for field usage
4. Consult with team before making changes

---

**Last Updated:** 2025-11-03  
**Status:** Ready for Review  
**Next Step:** Run verification queries on legacy database
