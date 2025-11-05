-- Test 1: Check if auth schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth';

-- Test 2: Check if auth.user_id() function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'auth' AND routine_name = 'user_id';

-- Test 3: Try calling auth.user_id() (should return NULL without JWT)
SELECT auth.user_id() AS current_user_id;

-- Test 4: Check if authenticated role exists
SELECT rolname FROM pg_roles WHERE rolname = 'authenticated';
