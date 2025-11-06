-- Insert Rodrigo Barona's WorkOS user into database
-- This version adds missing columns first, then inserts data

BEGIN;

-- Step 1: Add missing columns to users table if they don't exist
DO $$ 
BEGIN
    -- Add first_name if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'first_name'
    ) THEN
        ALTER TABLE users ADD COLUMN first_name text;
        RAISE NOTICE 'Added first_name column to users table';
    END IF;

    -- Add last_name if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_name'
    ) THEN
        ALTER TABLE users ADD COLUMN last_name text;
        RAISE NOTICE 'Added last_name column to users table';
    END IF;

    -- Add other columns that might be missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'stripe_bank_account_last4'
    ) THEN
        ALTER TABLE users ADD COLUMN stripe_bank_account_last4 text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'stripe_bank_name'
    ) THEN
        ALTER TABLE users ADD COLUMN stripe_bank_name text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE users ADD COLUMN image_url text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'welcome_email_sent_at'
    ) THEN
        ALTER TABLE users ADD COLUMN welcome_email_sent_at timestamp;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'onboarding_completed_at'
    ) THEN
        ALTER TABLE users ADD COLUMN onboarding_completed_at timestamp;
    END IF;
END $$;

-- Step 2: Insert Organization
INSERT INTO organizations (workos_org_id, slug, name, type)
VALUES (
  'org_01K978WVKETKD7T0BK8ZPVS5XT',
  'user-user_01K8QT17KX25XPHVQ4H1K0HTR7',
  'Rodrigo Barona''s Account',
  'expert_individual'
)
ON CONFLICT (workos_org_id) DO NOTHING
RETURNING id, workos_org_id, name;

-- Step 3: Get the organization's internal ID and insert user + membership
DO $$
DECLARE
  org_internal_id UUID;
BEGIN
  -- Get the organization's internal UUID
  SELECT id INTO org_internal_id
  FROM organizations
  WHERE workos_org_id = 'org_01K978WVKETKD7T0BK8ZPVS5XT';

  RAISE NOTICE 'Organization internal ID: %', org_internal_id;

  -- Insert User
  INSERT INTO users (
    workos_user_id,
    email,
    first_name,
    last_name,
    stripe_customer_id,
    stripe_connect_account_id
  )
  VALUES (
    'user_01K8QT17KX25XPHVQ4H1K0HTR7',
    'rbarona@hey.com',
    'Rodrigo',
    'Barona',
    NULL,
    NULL
  )
  ON CONFLICT (workos_user_id) DO UPDATE
  SET 
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name
  RETURNING workos_user_id;

  -- Insert Membership
  INSERT INTO user_org_memberships (
    workos_user_id,
    org_id,
    role,
    status
  )
  VALUES (
    'user_01K8QT17KX25XPHVQ4H1K0HTR7',
    org_internal_id,
    'owner',
    'active'
  )
  ON CONFLICT (workos_user_id, org_id) DO UPDATE
  SET 
    role = EXCLUDED.role,
    status = EXCLUDED.status;

  RAISE NOTICE '✅ User and membership inserted successfully!';
END $$;

-- Step 4: Verify the setup
SELECT
  u.workos_user_id,
  u.email,
  COALESCE(u.first_name || ' ' || u.last_name, u.email) AS name,
  o.name AS org_name,
  o.slug AS org_slug,
  o.type AS org_type,
  uom.role,
  uom.status
FROM users u
JOIN user_org_memberships uom ON u.workos_user_id = uom.workos_user_id
JOIN organizations o ON uom.org_id = o.id
WHERE u.email = 'rbarona@hey.com';

COMMIT;

-- Final confirmation
SELECT '✅ Rodrigo Barona user setup complete!' as status;

