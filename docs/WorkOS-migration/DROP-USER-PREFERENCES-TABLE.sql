-- ⚠️ Run this ONLY AFTER:
-- 1. Running MIGRATE-PREFERENCES.sql
-- 2. Verifying the data migration was successful
-- 3. Testing the application works without the user_preferences table

-- Drop the user_preferences table
DROP TABLE IF EXISTS user_preferences CASCADE;

-- Verify table is dropped
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'user_preferences';
-- Should return 0 rows

