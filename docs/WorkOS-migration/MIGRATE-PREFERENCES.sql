-- ⚠️ IMPORTANT: Run this BEFORE dropping user_preferences table!
-- This migrates existing user preferences data to the users table

-- Step 1: Migrate existing preferences data (only theme and language)
UPDATE users u
SET
  theme = COALESCE(up.theme, 'light'),
  language = COALESCE(up.language, 'en')
FROM user_preferences up
WHERE u.workos_user_id = up.workos_user_id;

-- Step 2: Verify migration (check a few records)
SELECT 
  u.workos_user_id,
  u.email,
  u.theme,
  u.language,
  up.theme as old_theme,
  up.language as old_language
FROM users u
LEFT JOIN user_preferences up ON u.workos_user_id = up.workos_user_id
WHERE up.workos_user_id IS NOT NULL
LIMIT 10;

-- Step 3: Count how many records will be affected
SELECT 
  COUNT(*) as total_users,
  COUNT(up.workos_user_id) as users_with_preferences
FROM users u
LEFT JOIN user_preferences up ON u.workos_user_id = up.workos_user_id;

