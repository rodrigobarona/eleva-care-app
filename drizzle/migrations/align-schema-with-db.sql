-- MIGRATION: align-schema-with-db.sql
-- Purpose: Align database structure with schema.ts (schema as source of truth)

-- 1. Fix RolePermissionTable: Missing createdAt and updatedAt columns
ALTER TABLE "role_permissions" 
ADD COLUMN IF NOT EXISTS "createdAt" timestamp NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now();

-- 2. Fix UserTable: Remove columns in database but not in code
-- These appear to be legacy columns where the data has likely been migrated to the ProfileTable
ALTER TABLE "users" 
DROP COLUMN IF EXISTS "role",
DROP COLUMN IF EXISTS "expert_bio",
DROP COLUMN IF EXISTS "expert_specialties",
DROP COLUMN IF EXISTS "expert_qualifications",
DROP COLUMN IF EXISTS "is_expert_profile_published",
DROP COLUMN IF EXISTS "expert_onboarding_status";

-- NOTE: Our analysis script had false positives for the following tables:
-- - ScheduleAvailabilityTable: All expected columns ARE defined in schema.ts
-- - MeetingTable: All expected columns ARE defined in schema.ts
-- - RecordTable: All expected columns ARE defined in schema.ts
-- - ProfileTable: All expected columns ARE defined in schema.ts

-- IMPORTANT: This migration just adds createdAt/updatedAt to role_permissions and
-- removes legacy fields from the users table that are no longer needed in the schema. 