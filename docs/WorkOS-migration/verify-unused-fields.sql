-- ============================================================================
-- SQL Queries to Verify Unused Fields in Legacy Database
-- ============================================================================
-- Run these queries against: DATABASE_URL_LEGACY
-- Connection: postgresql://elevadb_owner:***@ep-yellow-fire-a27848vg.eu-central-1.aws.neon.tech/elevadb?sslmode=require
-- ============================================================================

-- ============================================================================
-- 1. SUBSCRIPTION FIELDS VERIFICATION (Expected: All NULL/0)
-- ============================================================================

SELECT 
  '🔍 SUBSCRIPTION FIELDS' as check_type,
  COUNT(*) as total_users,
  COUNT("subscriptionId") as with_subscription_id,
  COUNT("subscriptionStatus") as with_subscription_status,
  COUNT("subscriptionPriceId") as with_price_id,
  COUNT("subscriptionCurrentPeriodEnd") as with_period_end,
  COUNT("subscriptionCanceledAt") as with_canceled_at,
  SUM(CASE WHEN "hasHadSubscription" = true THEN 1 ELSE 0 END) as has_had_subscription_count,
  '❌ If counts > 0, subscriptions ARE used!' as warning
FROM users;

-- Detailed view if any subscription data exists
SELECT 
  "clerkUserId",
  "email",
  "subscriptionId",
  "subscriptionStatus",
  "subscriptionPriceId",
  "subscriptionCurrentPeriodEnd",
  "subscriptionCanceledAt",
  "hasHadSubscription"
FROM users 
WHERE "subscriptionId" IS NOT NULL 
   OR "subscriptionStatus" IS NOT NULL
   OR "hasHadSubscription" = true
LIMIT 10;

-- ============================================================================
-- 2. MEETING PAYOUT FIELDS VERIFICATION (Expected: All NULL)
-- ============================================================================

SELECT 
  '🔍 MEETING PAYOUT FIELDS' as check_type,
  COUNT(*) as total_meetings,
  COUNT("stripePayoutId") as with_payout_id,
  COUNT("stripePayoutAmount") as with_payout_amount,
  COUNT("stripePayoutFailureCode") as with_failure_code,
  COUNT("stripePayoutFailureMessage") as with_failure_message,
  COUNT("stripePayoutPaidAt") as with_paid_at,
  COUNT("lastProcessedAt") as with_last_processed,
  '❌ If counts > 0, payout fields ARE used!' as warning
FROM meetings;

-- Check if PaymentTransferTable is the real source
SELECT 
  '✅ PAYMENT TRANSFER TABLE (Should have data)' as check_type,
  COUNT(*) as total_transfers,
  COUNT("transferId") as with_transfer_id,
  COUNT("payoutId") as with_payout_id,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_transfers
FROM payment_transfers;

-- ============================================================================
-- 3. BANK ACCOUNT DISPLAY FIELDS (Check usage)
-- ============================================================================

SELECT 
  '🔍 BANK ACCOUNT FIELDS' as check_type,
  COUNT(*) as total_users,
  COUNT("stripeBankAccountLast4") as with_bank_last4,
  COUNT("stripeBankName") as with_bank_name,
  COUNT("stripeConnectAccountId") as with_connect_account,
  ROUND(100.0 * COUNT("stripeBankAccountLast4") / NULLIF(COUNT("stripeConnectAccountId"), 0), 2) as bank_data_percentage,
  '⚠️ If < 50%, consider removing and fetching from Stripe' as recommendation
FROM users;

-- Sample of bank account data
SELECT 
  "clerkUserId",
  "email",
  "stripeBankAccountLast4",
  "stripeBankName",
  "stripeConnectAccountId",
  "stripeConnectPayoutsEnabled"
FROM users 
WHERE "stripeBankAccountLast4" IS NOT NULL
LIMIT 5;

-- ============================================================================
-- 4. PRACTITIONER AGREEMENT FIELDS (Legal compliance check)
-- ============================================================================

SELECT 
  '🔍 PRACTITIONER AGREEMENT FIELDS' as check_type,
  COUNT(*) as total_profiles,
  COUNT("practitionerAgreementAcceptedAt") as with_acceptance,
  COUNT("practitionerAgreementVersion") as with_version,
  COUNT("practitionerAgreementIpAddress") as with_ip,
  ROUND(100.0 * COUNT("practitionerAgreementAcceptedAt") / COUNT(*), 2) as acceptance_percentage,
  '✅ Keep for legal compliance even if low usage' as note
FROM profiles;

-- Sample agreement data
SELECT 
  "clerkUserId",
  "firstName",
  "lastName",
  "practitionerAgreementAcceptedAt",
  "practitionerAgreementVersion",
  "practitionerAgreementIpAddress",
  "published"
FROM profiles 
WHERE "practitionerAgreementAcceptedAt" IS NOT NULL
LIMIT 5;

-- ============================================================================
-- 5. ONBOARDING TRACKING FIELDS
-- ============================================================================

SELECT 
  '🔍 ONBOARDING FIELDS' as check_type,
  COUNT(*) as total_users,
  COUNT("welcomeEmailSentAt") as with_welcome_email,
  COUNT("onboardingCompletedAt") as with_onboarding,
  ROUND(100.0 * COUNT("welcomeEmailSentAt") / COUNT(*), 2) as welcome_email_percentage,
  ROUND(100.0 * COUNT("onboardingCompletedAt") / COUNT(*), 2) as onboarding_percentage,
  '✅ Keep - used for onboarding flow' as recommendation
FROM users;

-- ============================================================================
-- 6. IDENTITY VERIFICATION FIELDS (Should be used)
-- ============================================================================

SELECT 
  '🔍 IDENTITY VERIFICATION FIELDS' as check_type,
  COUNT(*) as total_users,
  COUNT("stripeIdentityVerificationId") as with_verification_id,
  COUNT(CASE WHEN "stripeIdentityVerified" = true THEN 1 END) as verified_users,
  COUNT("stripeIdentityVerificationStatus") as with_status,
  COUNT("stripeIdentityVerificationLastChecked") as with_last_checked,
  ROUND(100.0 * COUNT("stripeIdentityVerificationId") / COUNT(*), 2) as verification_rate,
  '✅ Keep - actively used feature' as recommendation
FROM users;

-- Verification status breakdown
SELECT 
  "stripeIdentityVerificationStatus",
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM users 
WHERE "stripeIdentityVerificationStatus" IS NOT NULL
GROUP BY "stripeIdentityVerificationStatus"
ORDER BY count DESC;

-- ============================================================================
-- 7. SLOT RESERVATION REMINDER FIELDS (Should be used)
-- ============================================================================

SELECT 
  '🔍 SLOT RESERVATION REMINDER FIELDS' as check_type,
  COUNT(*) as total_reservations,
  COUNT("gentleReminderSentAt") as with_gentle_reminder,
  COUNT("urgentReminderSentAt") as with_urgent_reminder,
  COUNT(CASE WHEN "expiresAt" > NOW() THEN 1 END) as active_reservations,
  '✅ Keep - used for payment reminders' as recommendation
FROM slot_reservations;

-- ============================================================================
-- 8. MEETING URL FIELD (Check if actually populated)
-- ============================================================================

SELECT 
  '🔍 MEETING URL FIELD' as check_type,
  COUNT(*) as total_meetings,
  COUNT("meetingUrl") as with_meeting_url,
  ROUND(100.0 * COUNT("meetingUrl") / COUNT(*), 2) as url_percentage,
  '⚠️ If low, Google Meet integration may not be working' as note
FROM meetings;

-- ============================================================================
-- 9. STRIPE METADATA USAGE (JSON field check)
-- ============================================================================

SELECT 
  '🔍 STRIPE METADATA' as check_type,
  COUNT(*) as total_meetings,
  COUNT("stripeMetadata") as with_metadata,
  ROUND(100.0 * COUNT("stripeMetadata") / COUNT(*), 2) as metadata_percentage,
  '✅ Keep - essential for debugging' as recommendation
FROM meetings;

-- ============================================================================
-- 10. PROFILE SORTING/FILTERING FIELDS
-- ============================================================================

SELECT 
  '🔍 PROFILE DISPLAY FIELDS' as check_type,
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN "isVerified" = true THEN 1 END) as verified_count,
  COUNT(CASE WHEN "isTopExpert" = true THEN 1 END) as top_expert_count,
  COUNT(CASE WHEN "published" = true THEN 1 END) as published_count,
  AVG("order") as avg_order,
  '✅ Keep - used for listings' as recommendation
FROM profiles;

-- ============================================================================
-- 11. COMPREHENSIVE EMPTY FIELD REPORT
-- ============================================================================

WITH field_analysis AS (
  SELECT 
    'users' as table_name,
    'subscriptionId' as field_name,
    COUNT(*) as total_rows,
    COUNT("subscriptionId") as non_null_count,
    COUNT(*) - COUNT("subscriptionId") as null_count,
    ROUND(100.0 * (COUNT(*) - COUNT("subscriptionId")) / COUNT(*), 2) as null_percentage
  FROM users
  
  UNION ALL
  
  SELECT 
    'users',
    'subscriptionStatus',
    COUNT(*),
    COUNT("subscriptionStatus"),
    COUNT(*) - COUNT("subscriptionStatus"),
    ROUND(100.0 * (COUNT(*) - COUNT("subscriptionStatus")) / COUNT(*), 2)
  FROM users
  
  UNION ALL
  
  SELECT 
    'meetings',
    'stripePayoutId',
    COUNT(*),
    COUNT("stripePayoutId"),
    COUNT(*) - COUNT("stripePayoutId"),
    ROUND(100.0 * (COUNT(*) - COUNT("stripePayoutId")) / COUNT(*), 2)
  FROM meetings
  
  UNION ALL
  
  SELECT 
    'meetings',
    'stripePayoutAmount',
    COUNT(*),
    COUNT("stripePayoutAmount"),
    COUNT(*) - COUNT("stripePayoutAmount"),
    ROUND(100.0 * (COUNT(*) - COUNT("stripePayoutAmount")) / COUNT(*), 2)
  FROM meetings
  
  UNION ALL
  
  SELECT 
    'meetings',
    'lastProcessedAt',
    COUNT(*),
    COUNT("lastProcessedAt"),
    COUNT(*) - COUNT("lastProcessedAt"),
    ROUND(100.0 * (COUNT(*) - COUNT("lastProcessedAt")) / COUNT(*), 2)
  FROM meetings
  
  UNION ALL
  
  SELECT 
    'users',
    'stripeBankAccountLast4',
    COUNT(*),
    COUNT("stripeBankAccountLast4"),
    COUNT(*) - COUNT("stripeBankAccountLast4"),
    ROUND(100.0 * (COUNT(*) - COUNT("stripeBankAccountLast4")) / COUNT(*), 2)
  FROM users
)
SELECT 
  table_name,
  field_name,
  total_rows,
  non_null_count,
  null_count,
  null_percentage,
  CASE 
    WHEN null_percentage >= 99 THEN '🔴 REMOVE - Always empty'
    WHEN null_percentage >= 90 THEN '🟡 CONSIDER REMOVING - Rarely used'
    WHEN null_percentage >= 50 THEN '🟡 LOW USAGE - Review'
    ELSE '✅ KEEP - Actively used'
  END as recommendation
FROM field_analysis
ORDER BY null_percentage DESC, table_name, field_name;

-- ============================================================================
-- 12. DATA QUALITY CHECK - Find inconsistencies
-- ============================================================================

-- Check for meetings with transfers but no transfer data
SELECT 
  '⚠️ DATA QUALITY: Meetings vs Transfers' as check_type,
  COUNT(DISTINCT m.id) as meetings_with_payment,
  COUNT(DISTINCT pt.id) as payment_transfers,
  COUNT(DISTINCT m.id) - COUNT(DISTINCT pt.id) as missing_transfers,
  '❌ If missing_transfers > 0, data sync issue!' as warning
FROM meetings m
LEFT JOIN payment_transfers pt ON m."stripePaymentIntentId" = pt.payment_intent_id
WHERE m."stripePaymentIntentId" IS NOT NULL;

-- Check for Stripe Connect accounts without bank details
SELECT 
  '⚠️ DATA QUALITY: Connect Accounts' as check_type,
  COUNT(CASE WHEN "stripeConnectAccountId" IS NOT NULL THEN 1 END) as with_connect_account,
  COUNT(CASE WHEN "stripeConnectAccountId" IS NOT NULL 
             AND "stripeBankAccountLast4" IS NOT NULL THEN 1 END) as with_bank_data,
  COUNT(CASE WHEN "stripeConnectAccountId" IS NOT NULL 
             AND "stripeBankAccountLast4" IS NULL THEN 1 END) as missing_bank_data,
  '✅ Missing bank data is OK - fetch from Stripe API' as note
FROM users;

-- ============================================================================
-- 13. STORAGE IMPACT ANALYSIS
-- ============================================================================

SELECT 
  '📊 STORAGE IMPACT' as analysis_type,
  pg_size_pretty(pg_total_relation_size('meetings')) as meetings_table_size,
  pg_size_pretty(pg_total_relation_size('users')) as users_table_size,
  pg_size_pretty(pg_total_relation_size('profiles')) as profiles_table_size,
  pg_size_pretty(pg_total_relation_size('payment_transfers')) as payment_transfers_size,
  '💾 Removing unused fields could save 5-10% storage' as estimate;

-- Row count summary
SELECT 
  '📊 ROW COUNTS' as summary,
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM meetings) as total_meetings,
  (SELECT COUNT(*) FROM payment_transfers) as total_transfers,
  (SELECT COUNT(*) FROM slot_reservations) as total_reservations;

-- ============================================================================
-- END OF VERIFICATION QUERIES
-- ============================================================================

-- 💡 INSTRUCTIONS:
-- 1. Connect to legacy database using provided credentials
-- 2. Run each query section and note the results
-- 3. Look for fields with 95%+ NULL values
-- 4. Compare findings with SCHEMA-ANALYSIS-REPORT.md
-- 5. Make final decision on which fields to remove

-- 🎯 EXPECTED RESULTS:
-- - Subscription fields: 100% NULL
-- - Meeting payout fields: 100% NULL  
-- - lastProcessedAt: 100% NULL
-- - Bank account fields: < 50% populated (safe to remove)
-- - Identity verification: 10-30% populated (keep)
-- - Onboarding fields: 50%+ populated (keep)

