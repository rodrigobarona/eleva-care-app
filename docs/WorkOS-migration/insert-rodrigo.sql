-- Insert Rodrigo Barona's WorkOS user into database
-- Run this in Neon Console SQL Editor

BEGIN;

-- Step 1: Insert Organization
INSERT INTO organizations (workos_org_id, slug, name, type)
VALUES (
  'org_01K978WVKETKD7T0BK8ZPVS5XT',
  'user-user_01K8QT17KX25XPHVQ4H1K0HTR7',
  'Rodrigo Barona''s Account',
  'expert_individual'
)
ON CONFLICT (workos_org_id) DO NOTHING
RETURNING id, workos_org_id, name;

-- Step 2: Get the organization's internal ID
-- (You'll see it in the output above, or query it)
DO $$
DECLARE
  org_internal_id UUID;
BEGIN
  -- Get the organization's internal UUID
  SELECT id INTO org_internal_id
  FROM organizations
  WHERE workos_org_id = 'org_01K978WVKETKD7T0BK8ZPVS5XT';

  -- Step 3: Insert User
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
  ON CONFLICT (workos_user_id) DO NOTHING;

  -- Step 4: Insert Membership
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
  ON CONFLICT (workos_user_id, org_id) DO NOTHING;

  RAISE NOTICE 'User inserted successfully!';
END $$;

-- Step 5: Verify the setup
SELECT
  u.workos_user_id,
  u.email,
  u.first_name || ' ' || u.last_name AS name,
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

