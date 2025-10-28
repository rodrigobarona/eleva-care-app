-- ================================================================================================
-- DATABASE AUDIT QUERIES FOR DUPLICATE TRANSFER ISSUE
-- Run these queries in Neon database to verify data integrity and find potential issues
-- ================================================================================================

-- ================================================================================================
-- 1. CHECK FOR TRANSFERS WITH NULL transferId (Potential duplicates)
-- ================================================================================================
-- These records may have transfers in Stripe but not in our database
SELECT 
  id,
  payment_intent_id,
  checkout_session_id,
  expert_clerk_user_id,
  amount / 100.0 as amount_euros,
  currency,
  status,
  transfer_id,
  scheduled_transfer_time,
  created,
  updated,
  stripe_error_message,
  retry_count
FROM payment_transfers
WHERE transfer_id IS NULL
  AND status IN ('PENDING', 'READY', 'APPROVED')
ORDER BY scheduled_transfer_time DESC;

-- Expected: Should show any pending transfers that haven't been processed
-- ⚠️ If scheduled_transfer_time has passed, these need investigation


-- ================================================================================================
-- 2. CHECK FOR DUPLICATE PAYMENT INTENT IDs
-- ================================================================================================
-- Multiple transfer records for the same payment should NOT exist
SELECT 
  payment_intent_id,
  COUNT(*) as record_count,
  ARRAY_AGG(id) as transfer_ids,
  ARRAY_AGG(status) as statuses,
  ARRAY_AGG(transfer_id) as stripe_transfer_ids
FROM payment_transfers
GROUP BY payment_intent_id
HAVING COUNT(*) > 1
ORDER BY record_count DESC;

-- Expected: No results (each payment intent should have only ONE transfer record)
-- ⚠️ If results found, this indicates duplicate database records


-- ================================================================================================
-- 3. CHECK FOR FAILED TRANSFERS WITH HIGH RETRY COUNT
-- ================================================================================================
-- These transfers have failed multiple times and may need manual intervention
SELECT 
  id,
  payment_intent_id,
  expert_clerk_user_id,
  amount / 100.0 as amount_euros,
  status,
  retry_count,
  stripe_error_code,
  stripe_error_message,
  scheduled_transfer_time,
  updated
FROM payment_transfers
WHERE retry_count >= 2
  OR status = 'FAILED'
ORDER BY retry_count DESC, updated DESC;

-- Expected: Few or no results (retry count should stay low with proper fix)
-- ⚠️ High retry counts indicate recurring issues


-- ================================================================================================
-- 4. CHECK FOR STUCK TRANSFERS (Scheduled but not processed)
-- ================================================================================================
-- Transfers that were scheduled to run but haven't completed
SELECT 
  id,
  payment_intent_id,
  checkout_session_id,
  expert_clerk_user_id,
  amount / 100.0 as amount_euros,
  status,
  transfer_id,
  scheduled_transfer_time,
  EXTRACT(EPOCH FROM (NOW() - scheduled_transfer_time)) / 3600 as hours_overdue,
  created,
  updated,
  stripe_error_message
FROM payment_transfers
WHERE status IN ('PENDING', 'READY', 'APPROVED')
  AND transfer_id IS NULL
  AND scheduled_transfer_time < NOW() - INTERVAL '24 hours'
ORDER BY scheduled_transfer_time ASC;

-- Expected: No results (all scheduled transfers should complete within 24 hours)
-- ⚠️ Results indicate transfers stuck for investigation


-- ================================================================================================
-- 5. VERIFY TRANSFER STATUS DISTRIBUTION
-- ================================================================================================
-- Get overview of transfer statuses in the system
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount) / 100.0 as total_amount_euros,
  MIN(scheduled_transfer_time) as earliest_scheduled,
  MAX(scheduled_transfer_time) as latest_scheduled,
  COUNT(CASE WHEN transfer_id IS NULL THEN 1 END) as missing_transfer_id,
  COUNT(CASE WHEN transfer_id IS NOT NULL THEN 1 END) as has_transfer_id
FROM payment_transfers
GROUP BY status
ORDER BY count DESC;

-- Expected: Most transfers in 'COMPLETED' status with transfer_id populated
-- ⚠️ High counts in PENDING/FAILED indicate issues


-- ================================================================================================
-- 6. CHECK FOR MULTIBANCO PAYMENTS (Most likely to have duplicates)
-- ================================================================================================
-- Multibanco payments with checkout_session_id = 'UNKNOWN' are created by webhooks
SELECT 
  id,
  payment_intent_id,
  checkout_session_id,
  expert_clerk_user_id,
  amount / 100.0 as amount_euros,
  status,
  transfer_id,
  scheduled_transfer_time,
  created,
  updated
FROM payment_transfers
WHERE checkout_session_id = 'UNKNOWN'
ORDER BY created DESC
LIMIT 50;

-- Expected: These should all have transfer_id populated after fix deployment
-- ⚠️ NULL transfer_id on old records indicates they may need syncing


-- ================================================================================================
-- 7. CHECK RECENT TRANSFERS (Last 7 days)
-- ================================================================================================
-- Recent activity to verify fix is working
SELECT 
  id,
  payment_intent_id,
  checkout_session_id,
  expert_clerk_user_id,
  amount / 100.0 as amount_euros,
  status,
  transfer_id,
  scheduled_transfer_time,
  created,
  updated,
  CASE 
    WHEN transfer_id IS NOT NULL THEN '✅ Has transfer ID'
    WHEN status = 'COMPLETED' AND transfer_id IS NULL THEN '⚠️ COMPLETED but no transfer ID'
    ELSE '⏳ Pending/Scheduled'
  END as sync_status
FROM payment_transfers
WHERE created >= NOW() - INTERVAL '7 days'
ORDER BY created DESC;

-- Expected: All COMPLETED transfers should have transfer_id after fix
-- ⚠️ COMPLETED with NULL transfer_id indicates sync issue


-- ================================================================================================
-- 8. CHECK FOR MISMATCHED AMOUNTS (Transfer vs Platform Fee)
-- ================================================================================================
-- Verify the math: platform receives fee, expert receives remainder
SELECT 
  id,
  payment_intent_id,
  amount / 100.0 as expert_amount_euros,
  platform_fee / 100.0 as platform_fee_euros,
  (amount + platform_fee) / 100.0 as total_payment_euros,
  status,
  CASE 
    WHEN (amount + platform_fee) > 0 THEN 
      ROUND((platform_fee::numeric / (amount + platform_fee)::numeric * 100), 2)
    ELSE 0
  END as platform_fee_percentage
FROM payment_transfers
ORDER BY created DESC
LIMIT 50;

-- Expected: Platform fee typically 15% (1050/7000 = 15%)
-- ⚠️ Unusual percentages may indicate calculation errors


-- ================================================================================================
-- 9. EXPERT PAYOUT SUMMARY (Last 30 days)
-- ================================================================================================
-- Summary of transfers per expert
SELECT 
  expert_clerk_user_id,
  COUNT(*) as total_transfers,
  SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_transfers,
  SUM(CASE WHEN status IN ('PENDING', 'READY', 'APPROVED') THEN 1 ELSE 0 END) as pending_transfers,
  SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_transfers,
  SUM(amount) / 100.0 as total_amount_euros,
  SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END) / 100.0 as completed_amount_euros,
  SUM(CASE WHEN status IN ('PENDING', 'READY', 'APPROVED') THEN amount ELSE 0 END) / 100.0 as pending_amount_euros
FROM payment_transfers
WHERE created >= NOW() - INTERVAL '30 days'
GROUP BY expert_clerk_user_id
ORDER BY total_amount_euros DESC;

-- Expected: Most experts should have high completion rates
-- ⚠️ High failed/pending counts per expert indicate expert-specific issues


-- ================================================================================================
-- 10. CHECK SCHEMA ALIGNMENT
-- ================================================================================================
-- Verify table structure matches expected schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'payment_transfers'
ORDER BY ordinal_position;

-- Expected: Should match schema.ts definition
-- ⚠️ Missing columns or type mismatches indicate migration needed


-- ================================================================================================
-- 11. CHECK FOR MISSING INDEXES (Performance)
-- ================================================================================================
-- Verify proper indexes exist for query optimization
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'payment_transfers'
ORDER BY indexname;

-- Expected: Should have indexes on:
--   - payment_intent_id (for looking up by payment)
--   - transfer_id (for looking up by Stripe transfer)
--   - status (for filtering pending transfers)
--   - scheduled_transfer_time (for cron job queries)
-- ⚠️ Missing indexes will slow down queries


-- ================================================================================================
-- 12. FIND TRANSFERS THAT NEED SYNC FROM STRIPE
-- ================================================================================================
-- Transfers that are COMPLETED but have no transfer_id
-- These need to be synced with Stripe to get the actual transfer ID
SELECT 
  id,
  payment_intent_id,
  expert_clerk_user_id,
  amount / 100.0 as amount_euros,
  status,
  scheduled_transfer_time,
  updated,
  EXTRACT(EPOCH FROM (NOW() - updated)) / 3600 as hours_since_update
FROM payment_transfers
WHERE status = 'COMPLETED'
  AND transfer_id IS NULL
ORDER BY updated DESC;

-- Expected: No results after fix deployment
-- ⚠️ Results indicate transfers that completed without storing Stripe transfer ID
-- ACTION: These need manual sync by running the Stripe charge retrieval


-- ================================================================================================
-- 13. CHECK PAYMENT_INTENT_ID FORMAT (Data Quality)
-- ================================================================================================
-- Verify all payment intent IDs follow Stripe format
SELECT 
  payment_intent_id,
  COUNT(*) as count,
  CASE 
    WHEN payment_intent_id LIKE 'pi_%' THEN '✅ Valid format'
    ELSE '❌ Invalid format'
  END as format_check
FROM payment_transfers
GROUP BY payment_intent_id, format_check
HAVING NOT payment_intent_id LIKE 'pi_%'
ORDER BY count DESC;

-- Expected: All payment_intent_id should start with 'pi_'
-- ⚠️ Invalid formats indicate data corruption


-- ================================================================================================
-- 14. CHECK FOR ORPHANED TRANSFERS (No corresponding meeting)
-- ================================================================================================
-- Transfers that don't have a matching meeting record
SELECT 
  pt.id,
  pt.payment_intent_id,
  pt.event_id,
  pt.expert_clerk_user_id,
  pt.amount / 100.0 as amount_euros,
  pt.status,
  pt.created
FROM payment_transfers pt
LEFT JOIN meetings m ON m.stripe_payment_intent_id = pt.payment_intent_id
WHERE m.id IS NULL
ORDER BY pt.created DESC
LIMIT 20;

-- Expected: Very few or no results (transfers should have meetings)
-- ⚠️ Orphaned transfers may indicate webhook/meeting creation issues


-- ================================================================================================
-- 15. TIMELINE ANALYSIS (Transfer Creation vs Scheduled Time)
-- ================================================================================================
-- Analyze the delay between when transfer is created and when it's scheduled
SELECT 
  DATE_TRUNC('day', created) as date,
  COUNT(*) as transfers_created,
  AVG(EXTRACT(EPOCH FROM (scheduled_transfer_time - created)) / 3600) as avg_hours_until_scheduled,
  MIN(EXTRACT(EPOCH FROM (scheduled_transfer_time - created)) / 3600) as min_hours_until_scheduled,
  MAX(EXTRACT(EPOCH FROM (scheduled_transfer_time - created)) / 3600) as max_hours_until_scheduled
FROM payment_transfers
WHERE created >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created)
ORDER BY date DESC;

-- Expected: Average should match country-specific delays (7 days for Portugal)
-- ⚠️ Unusual delays may indicate scheduling configuration issues


-- ================================================================================================
-- SUMMARY RECOMMENDATIONS
-- ================================================================================================
/*
After running these queries:

1. IF Query #1 shows transfers with NULL transfer_id and past scheduled_transfer_time:
   - These need manual investigation
   - Check Stripe dashboard for each payment_intent_id
   - Update database with actual transfer_id if exists in Stripe

2. IF Query #2 shows duplicate payment_intent_ids:
   - Critical issue - need to consolidate records
   - Keep the record with transfer_id, delete duplicates

3. IF Query #4 shows stuck transfers > 48 hours:
   - Check Stripe for actual transfer status
   - Update database or retry transfer creation

4. IF Query #11 shows missing indexes:
   - Create missing indexes with migration:
     CREATE INDEX idx_payment_transfers_payment_intent ON payment_transfers(payment_intent_id);
     CREATE INDEX idx_payment_transfers_transfer_id ON payment_transfers(transfer_id);
     CREATE INDEX idx_payment_transfers_status ON payment_transfers(status);
     CREATE INDEX idx_payment_transfers_scheduled_time ON payment_transfers(scheduled_transfer_time);

5. IF Query #12 shows COMPLETED transfers without transfer_id:
   - Run sync script to fetch transfer IDs from Stripe
   - These are likely from before the fix was deployed
*/

