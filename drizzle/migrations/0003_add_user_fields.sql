-- Drop existing tables
DROP TABLE IF EXISTS "Users" CASCADE;
DROP TABLE IF EXISTS "Token" CASCADE;

-- Create fresh users table with all required fields
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clerkUserId" text NOT NULL UNIQUE,
  "stripeCustomerId" text UNIQUE,
  "subscriptionId" text,
  "subscriptionStatus" text CHECK ("subscriptionStatus" IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid')),
  "subscriptionPriceId" text,
  "subscriptionCurrentPeriodEnd" timestamp,
  "subscriptionCanceledAt" timestamp,
  "hasHadSubscription" boolean DEFAULT false,
  -- User profile fields (synced from Clerk)
  "email" text NOT NULL,
  "first_name" text,
  "last_name" text,
  "image_url" text,
  -- Role and Stripe Connect fields
  "role" text NOT NULL DEFAULT 'user' CHECK ("role" IN ('user', 'expert', 'admin')),
  "stripe_connect_account_id" text UNIQUE,
  "stripe_connect_onboarding_complete" boolean NOT NULL DEFAULT false,
  -- Timestamps
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "users_clerk_user_id_idx" ON "users" ("clerkUserId");
CREATE INDEX IF NOT EXISTS "users_stripe_customer_id_idx" ON "users" ("stripeCustomerId");

-- Create tokens table for any OAuth tokens
CREATE TABLE IF NOT EXISTS "tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clerkUserId" text NOT NULL UNIQUE REFERENCES "users"("clerkUserId") ON DELETE CASCADE,
  "accessToken" text NOT NULL,
  "refreshToken" text NOT NULL,
  "expiryDate" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
); 