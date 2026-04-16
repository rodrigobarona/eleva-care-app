-- Add phone number columns to booking tables

-- 1. meetings table (uses camelCase column names to match existing convention)
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS "guestPhone" text;

-- 2. pack_purchases table (uses snake_case column names to match existing convention)
ALTER TABLE pack_purchases ADD COLUMN IF NOT EXISTS buyer_phone text;

-- 3. payment_transfers table (uses snake_case column names to match existing convention)
ALTER TABLE payment_transfers ADD COLUMN IF NOT EXISTS guest_phone text;
