-- Add Stripe Identity verification fields to the user table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_identity_verification_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_identity_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_identity_verification_status TEXT,
ADD COLUMN IF NOT EXISTS stripe_identity_verification_last_checked TIMESTAMP;

-- Create an index for the verification ID for faster lookups
CREATE INDEX IF NOT EXISTS users_stripe_identity_verification_id_idx ON users (stripe_identity_verification_id);

-- Update updatedAt to reflect the schema change
UPDATE users SET "updatedAt" = NOW() WHERE TRUE; 