-- RBAC Role Rename Migration
-- Renames 'user' -> 'member' and removes 'expert_lecturer' from the users table.
-- Part of the RBAC naming refactor (see _docs/02-core-systems/RBAC-NAMING-DECISIONS.md).

-- Step 1: Rename 'user' role to 'member' in the users table
UPDATE "users" SET "role" = 'member' WHERE "role" = 'user';

-- Step 2: Migrate any remaining 'expert_lecturer' rows to 'expert_community'
-- Lecturer capabilities are now a Stripe addon, not a standalone role.
UPDATE "users" SET "role" = 'expert_community' WHERE "role" = 'expert_lecturer';

-- Step 3: Update the default value for the role column
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'member';

-- Step 4: Rename 'user' role to 'member' in the roles table (WorkOS RBAC cache)
UPDATE "roles" SET "role" = 'member' WHERE "role" = 'patient';

-- Step 5: Rename partner roles to team roles in the roles table
UPDATE "roles" SET "role" = 'team_member' WHERE "role" = 'partner_member';
UPDATE "roles" SET "role" = 'team_admin' WHERE "role" = 'partner_admin';

-- Step 6: Remove expert_lecturer from roles table
DELETE FROM "roles" WHERE "role" = 'expert_lecturer';
