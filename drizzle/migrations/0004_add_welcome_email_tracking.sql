-- Migration: Add welcome email tracking to users table
-- This prevents duplicate welcome emails from being sent to existing users
-- Date: 2025-10-06
-- NOTE: This migration only adds columns if they don't exist (safe for multiple runs)

-- Add welcomeEmailSentAt column to track when welcome email was sent
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "welcome_email_sent_at" TIMESTAMP;

-- Add onboardingCompletedAt column to track when user completed onboarding
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" TIMESTAMP;

-- Create index on welcomeEmailSentAt for faster lookups
CREATE INDEX IF NOT EXISTS "users_welcome_email_sent_at_idx" ON "users" ("welcome_email_sent_at");

-- Optional: Set welcomeEmailSentAt for all existing users to prevent them from receiving duplicate emails
-- This assumes that any user with createdAt older than today has already received a welcome email
UPDATE "users" 
SET "welcome_email_sent_at" = "createdAt" 
WHERE "createdAt" < NOW() - INTERVAL '1 day' 
  AND "welcome_email_sent_at" IS NULL;

-- Add comments to document the purpose (safe to run multiple times)
COMMENT ON COLUMN "users"."welcome_email_sent_at" IS 'Timestamp when the welcome email was sent to this user. Used to prevent duplicate welcome emails.';
COMMENT ON COLUMN "users"."onboarding_completed_at" IS 'Timestamp when the user completed the onboarding process.';
