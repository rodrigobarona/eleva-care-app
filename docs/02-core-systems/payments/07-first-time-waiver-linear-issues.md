# First-Time Late Payment Waiver - Linear Issues

**Project**: ELEVA  
**Epic**: First-Time Late Payment Waiver Implementation  
**Total Issues**: 7  
**Estimated Time**: 12-16 hours

---

## 🎯 Copy-Paste Templates for Linear

Each section below is a complete Linear issue. Copy the entire section and paste into Linear.

---

## Issue 1: Database Schema Changes

```
Title: [Backend] Add Late Payment Tracking Fields to User Schema

Priority: High
Estimate: 2 points (1-2 hours)
Labels: backend, database, schema, payment
Team: ELEVA
Project: First-Time Late Payment Waiver

Description:
Add tracking fields to the UserTable schema to record late Multibanco payment history for first-time waiver eligibility checks.

Business Context:
We're implementing a first-time courtesy waiver where users who pay late for the first time receive a 100% refund instead of 90%. We need to track whether a user has had a late payment before.

Technical Details:
- File: drizzle/schema.ts
- Add 3 new fields to UserTable:
  - hasHadLateMultibancoPayment (boolean, indexed)
  - lateMultibancoPaymentCount (integer)
  - firstLateMultibancoPaymentDate (timestamp)

Acceptance Criteria:
- [ ] Schema updated with 3 new fields
- [ ] Index created on hasHadLateMultibancoPayment
- [ ] TypeScript types automatically generated
- [ ] No linter errors
- [ ] Schema validated with pnpm drizzle-kit check

Testing:
pnpm drizzle-kit check
pnpm drizzle-kit generate:pg

Documentation:
See docs/02-core-systems/payments/06-first-time-waiver-implementation.md#step-1
```

---

## Issue 2: Database Migration

```
Title: [Backend] Create Migration for Late Payment Tracking Fields

Priority: High
Estimate: 1 point (1 hour)
Labels: backend, database, migration, payment
Team: ELEVA
Project: First-Time Late Payment Waiver
Blocks: Issue #3 (Refund Logic Implementation)
Depends on: Issue #1 (Schema Changes)

Description:
Create and execute a database migration to add late payment tracking fields to the production users table.

Business Context:
This migration enables the first-time courtesy waiver by adding the necessary tracking fields to the database.

Technical Details:
- Create: drizzle/migrations/0007_add_late_payment_tracking.sql
- Add 3 columns with defaults (non-breaking)
- Create index for quick lookups
- Add column comments for documentation
- Estimated execution time: <5 seconds

Acceptance Criteria:
- [ ] Migration SQL file created
- [ ] Rollback SQL file created
- [ ] Migration tested in development environment
- [ ] Migration executed in staging environment
- [ ] No data loss
- [ ] Index created successfully
- [ ] Column comments added

Deployment Notes:
⚠️ Run migration during low-traffic period
⚠️ Monitor database performance after migration
⚠️ Verify no blocking locks on users table

Testing:
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

Documentation:
See docs/02-core-systems/payments/06-first-time-waiver-implementation.md#step-2
```

---

## Issue 3: Refund Logic Implementation

```
Title: [Backend] Implement First-Time Waiver Logic in Payment Webhook Handler

Priority: High
Estimate: 3 points (3-4 hours)
Labels: backend, payment, stripe, webhook, refund
Team: ELEVA
Project: First-Time Late Payment Waiver
Blocks: Issue #4 (Email Notifications)
Depends on: Issue #1 (Schema), Issue #2 (Migration)

Description:
Update the Stripe webhook handler to check first-time status and apply appropriate refund percentage (100% vs 90%) for late Multibanco payments.

Business Context:
This is the core logic that implements the first-time courtesy waiver policy. First-time late payers get 100% refund, repeat late payers get 90% refund with 10% processing fee.

Technical Details:
- File: app/api/webhooks/stripe/handlers/payment.ts
- Add 3 new helper functions:
  1. isFirstTimeLatePayment() - Check first-time status
  2. recordLatePayment() - Update user history
  3. Update processPartialRefund() - Calculate refund based on status
- Update handlePaymentSucceeded() to pass guest email

Key Features:
- Guest checkouts default to first-time (generous)
- Database errors default to first-time (fail-open)
- Stripe metadata includes first-time status
- Audit log records all late payments

Acceptance Criteria:
- [ ] isFirstTimeLatePayment() function created and documented
- [ ] recordLatePayment() function created and documented
- [ ] processPartialRefund() updated to accept guestEmail parameter
- [ ] processPartialRefund() calculates 100% for first-time, 90% for repeat
- [ ] handlePaymentSucceeded() passes guest email to refund function
- [ ] Stripe refund metadata includes first-time status
- [ ] Audit log records late payment events
- [ ] All TypeScript types are correct
- [ ] No linter errors
- [ ] Unit tests written and passing

Testing:
- Unit tests for isFirstTimeLatePayment()
- Unit tests for recordLatePayment()
- Unit tests for processPartialRefund() with both scenarios
- Integration test with mock Stripe webhook

Documentation:
See docs/02-core-systems/payments/06-first-time-waiver-implementation.md#step-3
```

---

## Issue 4: Email Notification Updates

```
Title: [Backend] Update Refund Email Notifications for First-Time Waiver

Priority: Medium
Estimate: 2 points (2 hours)
Labels: backend, email, notifications, i18n
Team: ELEVA
Project: First-Time Late Payment Waiver
Depends on: Issue #3 (Refund Logic), Issue #5 (Translations)

Description:
Update the refund notification email to include different messaging for first-time courtesy refunds (100%) vs. subsequent refunds (90%).

Business Context:
Customers need clear communication about why they received a 100% or 90% refund. First-time courtesy messaging builds goodwill and sets expectations for future payments.

Technical Details:
- File: app/api/webhooks/stripe/handlers/payment.ts
- Update notifyAppointmentConflict() function
- Detect first-time vs. repeat refund (refundAmount === originalAmount)
- Use different Novu workflow IDs:
  - multibanco-late-payment-first-time-refund (100%)
  - multibanco-late-payment-partial-refund (90%)
- Include all variables in payload

Acceptance Criteria:
- [ ] notifyAppointmentConflict detects first-time vs. repeat refund
- [ ] Different Novu workflow IDs used for first-time vs. repeat
- [ ] Email payload includes all necessary variables
- [ ] Support URL and payment policies URL included
- [ ] Locale-specific date formatting
- [ ] Error handling doesn't break refund flow
- [ ] Integration tests written and passing

Testing:
- Integration test: First-time courtesy email sent
- Integration test: Partial refund email sent
- Test all 4 locales (EN, ES, PT, BR)
- Verify email preview in Novu dashboard

Documentation:
See docs/02-core-systems/payments/06-first-time-waiver-implementation.md#step-4
```

---

## Issue 5: Translations & i18n

```
Title: [i18n] Add Translations for First-Time Waiver Email Notifications

Priority: Medium
Estimate: 2 points (2 hours)
Labels: i18n, translations, email, content
Team: ELEVA
Project: First-Time Late Payment Waiver
Blocks: Issue #4 (Email Notifications)

Description:
Add translations for first-time courtesy and partial refund email notifications in all 4 languages (EN, ES, PT, BR).

Business Context:
Our users speak multiple languages. We need accurate, culturally appropriate translations for the new first-time waiver messaging to ensure all users understand the policy.

Technical Details:
- Files: messages/en.json, messages/es.json, messages/pt.json, messages/br.json
- Add new section: payments.refund.firstTime
- Add new section: payments.refund.subsequent
- Add new section: payments.refund.common
- Add new section: payments.latePaymentStatus

Key Translation Areas:
- Email subject lines
- Email body content (greeting, body, footer)
- Conflict reason explanations
- Dashboard status messages
- CTA buttons

Acceptance Criteria:
- [ ] All 4 language files updated with new translation keys
- [ ] Consistent structure across all languages
- [ ] Culturally appropriate translations (reviewed by native speakers)
- [ ] No placeholder text or English fallbacks in non-English files
- [ ] JSON syntax valid (no trailing commas)
- [ ] Translation keys match email template variables
- [ ] Build succeeds without i18n errors

Testing:
# Validate JSON syntax
pnpm exec jsonlint messages/en.json
pnpm exec jsonlint messages/es.json
pnpm exec jsonlint messages/pt.json
pnpm exec jsonlint messages/br.json

# Build to check for i18n errors
pnpm build

Documentation:
See docs/02-core-systems/payments/06-first-time-waiver-implementation.md#step-5
```

---

## Issue 6: Dashboard UI (Optional)

```
Title: [Frontend] Add Late Payment Status Display to User Dashboard

Priority: Low
Estimate: 2 points (2-3 hours)
Labels: frontend, ui, dashboard, react
Team: ELEVA
Project: First-Time Late Payment Waiver
Depends on: Issue #1 (Schema), Issue #5 (Translations)

Description:
Display the user's late payment status in the dashboard, showing whether they're eligible for the first-time courtesy waiver or have already used it.

Business Context:
Transparency builds trust. Showing users their first-time waiver status helps them understand the policy and encourages timely payments.

Technical Details:
- Create: components/molecules/LatePaymentStatus.tsx
- Update: app/(private)/account/payments/page.tsx
- Display two states:
  1. Green badge: "First-Time Courtesy Eligible" (100%)
  2. Orange badge: "First-Time Courtesy Used" (90%)
- Sync user metadata from database to Clerk

Key Features:
- Accessible (ARIA labels, semantic HTML)
- Responsive design (mobile + desktop)
- Uses translations (no hardcoded text)
- Shows late payment count for repeat users

Acceptance Criteria:
- [ ] LatePaymentStatus component created
- [ ] Component shows correct status based on user metadata
- [ ] Accessible (ARIA labels, semantic HTML)
- [ ] Responsive design (mobile + desktop)
- [ ] Translations used (no hardcoded text)
- [ ] Component integrated into dashboard
- [ ] Clerk metadata synced from database
- [ ] Component tests written and passing

Testing:
- Component test: Eligible status for new users
- Component test: Used status for users with history
- Component test: Shows late payment count
- E2E test: Dashboard displays correct status

Documentation:
See docs/02-core-systems/payments/06-first-time-waiver-implementation.md#step-6
```

---

## Issue 7: Analytics & Monitoring

```
Title: [Analytics] Add Tracking for First-Time Waiver Usage & Metrics

Priority: Medium
Estimate: 2 points (2 hours)
Labels: analytics, monitoring, posthog
Team: ELEVA
Project: First-Time Late Payment Waiver
Depends on: Issue #3 (Refund Logic)

Description:
Implement analytics tracking for first-time waiver usage to measure the impact on customer satisfaction, chargebacks, and refund patterns.

Business Context:
We need data to validate the first-time waiver policy is working as intended. Key metrics: chargeback reduction, customer satisfaction, repeat offender rate.

Technical Details:
- Create: lib/analytics/payment-events.ts
- Add 3 tracking functions:
  1. trackFirstTimeWaiverApplied()
  2. trackSubsequentLatePaymentFee()
  3. trackLatePaymentConflictDetected()
- Integrate into processPartialRefund()
- Create PostHog dashboard with 5 insights

Key Metrics:
- First-time waiver usage (count, breakdown by locale)
- Processing fee revenue (sum, by month)
- Late payment frequency (count, by day/expert)
- Repeat offender rate (users with count > 1)
- Chargeback correlation (disputes vs. waiver status)

Acceptance Criteria:
- [ ] payment-events.ts file created with tracking functions
- [ ] Analytics calls integrated into refund logic
- [ ] PostHog dashboard created
- [ ] Events include all relevant metadata
- [ ] User properties updated ($set)
- [ ] No PII logged in analytics (email hashed if needed)
- [ ] Unit tests written and passing

PostHog Dashboard Insights:
1. First-Time Waiver Usage (count by week)
2. Processing Fee Revenue (sum by month)
3. Late Payment Frequency (count by day)
4. Repeat Offender Rate (% users with count > 1)
5. Chargeback Correlation (disputes vs. waiver status)

Testing:
- Unit test: trackFirstTimeWaiverApplied captures correct properties
- Unit test: trackSubsequentLatePaymentFee captures correct properties
- Integration test: Events fire on refund processing

Documentation:
See docs/02-core-systems/payments/06-first-time-waiver-implementation.md#step-7
```

---

## 📋 Issue Dependencies

```
Issue #1 (Schema Changes)
  └─> Issue #2 (Migration)
        └─> Issue #3 (Refund Logic)
              ├─> Issue #4 (Email Notifications)
              └─> Issue #7 (Analytics)

Issue #5 (Translations)
  └─> Issue #4 (Email Notifications)

Issue #1 (Schema) + Issue #5 (Translations)
  └─> Issue #6 (Dashboard UI)
```

---

## 🚀 Recommended Sprint Plan

### Sprint 1 (Week 1)

- **Day 1-2**: Issue #1 (Schema) + Issue #2 (Migration)
- **Day 3-5**: Issue #3 (Refund Logic)

### Sprint 2 (Week 2)

- **Day 1-2**: Issue #5 (Translations)
- **Day 3-4**: Issue #4 (Email Notifications)
- **Day 5**: Issue #7 (Analytics)

### Sprint 3 (Week 3) - Polish & Launch

- **Day 1-2**: Issue #6 (Dashboard UI) - Optional
- **Day 3**: QA & Testing
- **Day 4**: Staging deployment & final testing
- **Day 5**: Production deployment & monitoring

---

## 🎯 Total Estimate

- **High Priority Issues**: 8 points (7-9 hours)
- **Medium Priority Issues**: 6 points (6-8 hours)
- **Low Priority Issues**: 2 points (2-3 hours)
- **Total**: 16 points (15-20 hours)

---

## 📊 Success Metrics

Track these metrics in Linear custom fields:

- **Chargeback Rate Reduction**: Target -30% within 3 months
- **Support Ticket Reduction**: Target -40% within 3 months
- **Customer Satisfaction**: Target >4.0/5.0 for late payment refunds
- **Repeat Late Payment Rate**: Target <10%

---

## 🔗 Related Resources

- **Full Implementation Guide**: `docs/02-core-systems/payments/06-first-time-waiver-implementation.md`
- **Payment Policies (User-Facing)**: `content/payment-policies/en.mdx`
- **Stripe Integration**: `docs/02-core-systems/payments/02-stripe-integration.md`
- **Database Schema**: `drizzle/schema.ts`

---

## 💡 Tips for Creating Issues in Linear

1. **Copy entire issue block** (from Title to Documentation)
2. **Paste into Linear** "New Issue" dialog
3. **Adjust formatting** if needed (Linear supports Markdown)
4. **Set dependencies** using the "Blocks" and "Depends on" fields
5. **Add estimates** using Linear's point system
6. **Assign to sprint** based on the recommended sprint plan
7. **Link to epic** "First-Time Late Payment Waiver Implementation"

---

**Questions?** Contact the engineering team or refer to the full implementation guide.
