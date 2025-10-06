-- Verification Queries for Welcome Email Backfill
-- Run these queries to verify the backfill was successful

-- 1. Overview: Check coverage
SELECT 
  COUNT(*) as total_users,
  COUNT(welcome_email_sent_at) as users_with_timestamp,
  COUNT(*) - COUNT(welcome_email_sent_at) as users_without_timestamp,
  ROUND(COUNT(welcome_email_sent_at)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as coverage_percentage
FROM users;

-- 2. Sample: View users with timestamps
SELECT 
  email,
  "createdAt" as created_at,
  welcome_email_sent_at,
  CASE 
    WHEN welcome_email_sent_at = "createdAt" THEN '✅ Backfilled'
    WHEN welcome_email_sent_at > "createdAt" THEN '📧 Sent Later'
    ELSE '⚠️ Issue'
  END as status
FROM users
ORDER BY "createdAt" DESC
LIMIT 10;

-- 3. Verify: Users without timestamp (should be empty)
SELECT 
  email,
  "createdAt" as created_at,
  welcome_email_sent_at
FROM users
WHERE welcome_email_sent_at IS NULL;

-- 4. Timeline: When users were created vs welcome email sent
SELECT 
  DATE("createdAt") as date,
  COUNT(*) as users_created,
  COUNT(welcome_email_sent_at) as users_with_timestamp
FROM users
GROUP BY DATE("createdAt")
ORDER BY date DESC;

-- 5. Recent users (last 24 hours)
SELECT 
  email,
  "createdAt" as created_at,
  welcome_email_sent_at,
  CASE 
    WHEN welcome_email_sent_at IS NULL THEN '📧 Will receive welcome'
    ELSE '✅ Already sent'
  END as status
FROM users
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
ORDER BY "createdAt" DESC;
