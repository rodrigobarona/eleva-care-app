/**
 * Setup Test Expert User
 * 
 * Sets up rbarona@hey.com as a top expert with complete onboarding
 * 
 * What this does:
 * 1. Updates user role to 'expert_top'
 * 2. Creates/updates expert_setup with all steps complete
 * 3. Creates/updates user_preferences with defaults
 * 
 * Run with: psql $DATABASE_URL -f scripts/setup-test-expert.sql
 */

-- ============================================================================
-- 1. FIND USER BY EMAIL
-- ============================================================================

-- First, let's see if the user exists and get their workos_user_id
SELECT 
  id,
  workos_user_id,
  email,
  first_name,
  last_name,
  role as current_role
FROM users 
WHERE email = 'rbarona@hey.com';

-- Expected output: Should show your user record with workos_user_id

-- ============================================================================
-- 2. UPDATE USER ROLE TO EXPERT_TOP
-- ============================================================================

UPDATE users 
SET 
  role = 'expert_top',
  updated_at = NOW()
WHERE email = 'rbarona@hey.com'
RETURNING 
  workos_user_id,
  email,
  first_name,
  last_name,
  role;

-- ============================================================================
-- 3. GET ORG_ID FOR THE USER
-- ============================================================================

-- Get the user's organization ID (org-per-user model)
SELECT 
  o.id as org_id,
  o.workos_org_id,
  o.name as org_name,
  uom.role as org_role
FROM users u
JOIN user_org_memberships uom ON u.workos_user_id = uom.workos_user_id
JOIN organizations o ON uom.org_id = o.id
WHERE u.email = 'rbarona@hey.com';

-- ============================================================================
-- 4. CREATE/UPDATE EXPERT SETUP (All Steps Complete)
-- ============================================================================

-- First, try to update existing record
WITH updated AS (
  UPDATE expert_setup 
  SET 
    profile_completed = true,
    availability_completed = true,
    events_completed = true,
    identity_completed = true,
    payment_completed = true,
    google_account_completed = true,
    setup_complete = true,
    setup_completed_at = NOW(),
    updated_at = NOW()
  FROM users
  WHERE expert_setup.workos_user_id = users.workos_user_id
    AND users.email = 'rbarona@hey.com'
  RETURNING expert_setup.*
)
-- If no record exists, insert new one
INSERT INTO expert_setup (
  workos_user_id,
  org_id,
  profile_completed,
  availability_completed,
  events_completed,
  identity_completed,
  payment_completed,
  google_account_completed,
  setup_complete,
  setup_completed_at
)
SELECT 
  u.workos_user_id,
  uom.org_id,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  NOW()
FROM users u
JOIN user_org_memberships uom ON u.workos_user_id = uom.workos_user_id
WHERE u.email = 'rbarona@hey.com'
  AND NOT EXISTS (SELECT 1 FROM updated)
RETURNING *;

-- ============================================================================
-- 5. CREATE/UPDATE USER PREFERENCES (Defaults)
-- ============================================================================

-- First, try to update existing record
WITH updated AS (
  UPDATE user_preferences 
  SET 
    security_alerts = true,
    new_device_alerts = false,
    email_notifications = true,
    in_app_notifications = true,
    unusual_timing_alerts = true,
    location_change_alerts = true,
    theme = 'light',
    language = 'en',
    updated_at = NOW()
  FROM users
  WHERE user_preferences.workos_user_id = users.workos_user_id
    AND users.email = 'rbarona@hey.com'
  RETURNING user_preferences.*
)
-- If no record exists, insert new one
INSERT INTO user_preferences (
  workos_user_id,
  org_id,
  security_alerts,
  new_device_alerts,
  email_notifications,
  in_app_notifications,
  unusual_timing_alerts,
  location_change_alerts,
  theme,
  language
)
SELECT 
  u.workos_user_id,
  uom.org_id,
  true,
  false,
  true,
  true,
  true,
  true,
  'light',
  'en'
FROM users u
JOIN user_org_memberships uom ON u.workos_user_id = uom.workos_user_id
WHERE u.email = 'rbarona@hey.com'
  AND NOT EXISTS (SELECT 1 FROM updated)
RETURNING *;

-- ============================================================================
-- 6. VERIFY CHANGES
-- ============================================================================

-- Verify user role
SELECT 
  'User Role' as check_type,
  email,
  role,
  first_name,
  last_name
FROM users 
WHERE email = 'rbarona@hey.com';

-- Verify expert setup
SELECT 
  'Expert Setup' as check_type,
  es.*
FROM expert_setup es
JOIN users u ON es.workos_user_id = u.workos_user_id
WHERE u.email = 'rbarona@hey.com';

-- Verify user preferences
SELECT 
  'User Preferences' as check_type,
  up.*
FROM user_preferences up
JOIN users u ON up.workos_user_id = u.workos_user_id
WHERE u.email = 'rbarona@hey.com';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Test expert setup complete!';
  RAISE NOTICE '   - User role: expert_top';
  RAISE NOTICE '   - All onboarding steps: completed';
  RAISE NOTICE '   - User preferences: set to defaults';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 You can now test:';
  RAISE NOTICE '   - /setup page (should show complete)';
  RAISE NOTICE '   - Expert dashboard features';
  RAISE NOTICE '   - Role-based access controls';
END $$;

