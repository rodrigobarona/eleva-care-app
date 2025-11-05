# Creating Test Expert User

## Issue Encountered

Database connection failed when running the script. This can happen due to:

- Network connectivity issues
- Firewall blocking Neon connections
- VPN/proxy interference
- Neon database sleeping (cold start)

## Solution 1: Use WorkOS Dashboard (Recommended)

The fastest way to create your test user:

### Step 1: Create User in WorkOS Dashboard

1. Go to [WorkOS Dashboard](https://dashboard.workos.com/)
2. Navigate to **User Management** → **Users**
3. Click **Create User**
4. Fill in details:
   - Email: `rbarona@hey.com`
   - First Name: `Rodrigo`
   - Last Name: `Barona`
   - Email Verified: ✅ Yes
5. Click **Create User**
6. Copy the **User ID** (starts with `user_`)

### Step 2: Create Organization in WorkOS Dashboard

1. Navigate to **Organizations**
2. Click **Create Organization**
3. Fill in:
   - Name: `Rodrigo Barona's Account`
   - (No domain needed for individual experts)
4. Click **Create Organization**
5. Copy the **Organization ID** (starts with `org_`)

### Step 3: Create Membership

1. In the organization view, go to **Memberships**
2. Click **Add Member**
3. Select the user you just created
4. Role: **Owner** (or whatever role you have configured)
5. Click **Add**

### Step 4: Insert into Database

Now insert the records into your database. Run this SQL:

```sql
-- Insert Organization
INSERT INTO organizations (workos_org_id, slug, name, type)
VALUES (
  'org_YOUR_ORG_ID_HERE',  -- Replace with actual org ID
  'user-YOUR_USER_ID',      -- Replace with actual user ID
  'Rodrigo Barona''s Account',
  'expert_individual'
) RETURNING id;

-- Note the internal UUID returned above, use it below

-- Insert User
INSERT INTO users (
  workos_user_id,
  email,
  first_name,
  last_name
)
VALUES (
  'user_YOUR_USER_ID_HERE',  -- Replace with actual user ID
  'rbarona@hey.com',
  'Rodrigo',
  'Barona'
);

-- Insert Membership (use the internal UUID from step 1)
INSERT INTO user_org_memberships (
  workos_user_id,
  org_id,  -- Use the internal UUID from the organizations INSERT above
  role,
  status
)
VALUES (
  'user_YOUR_USER_ID_HERE',
  'YOUR_INTERNAL_ORG_UUID',  -- From the organizations INSERT
  'owner',
  'active'
);
```

---

## Solution 2: Fix Database Connection

### Check Neon Database Status

1. Go to [Neon Console](https://console.neon.tech/)
2. Check if your database is running
3. If it's sleeping, wake it up by running a simple query

### Test Database Connection

```bash
# Test if you can connect
node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT 1 as test\`.then(result => {
  console.log('✅ Database connection working:', result);
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
});
"
```

### Network Troubleshooting

```bash
# Check if you can reach Neon
ping ep-snowy-fire-a5r1p5k6.us-east-2.aws.neon.tech

# Check DNS resolution
nslookup ep-snowy-fire-a5r1p5k6.us-east-2.aws.neon.tech
```

### Retry the Script

Once database connection is working:

```bash
pnpm tsx scripts/create-expert-user.ts
```

---

## Solution 3: Manual SQL Script

If you prefer, run this complete SQL script:

```sql
-- Create Test Expert User: Rodrigo Barona
-- Replace the WorkOS IDs with actual ones from WorkOS Dashboard

BEGIN;

-- Step 1: Insert Organization
WITH new_org AS (
  INSERT INTO organizations (workos_org_id, slug, name, type)
  VALUES (
    'org_YOUR_WORKOS_ORG_ID',  -- Replace with actual WorkOS org ID
    'user-user_YOUR_WORKOS_USER_ID',  -- Replace with actual WorkOS user ID
    'Rodrigo Barona''s Account',
    'expert_individual'
  )
  RETURNING id, workos_org_id
)
-- Step 2: Insert User
, new_user AS (
  INSERT INTO users (
    workos_user_id,
    email,
    first_name,
    last_name,
    stripe_customer_id,
    stripe_connect_account_id
  )
  VALUES (
    'user_YOUR_WORKOS_USER_ID',  -- Replace with actual WorkOS user ID
    'rbarona@hey.com',
    'Rodrigo',
    'Barona',
    NULL,  -- Will be filled when connecting Stripe
    NULL   -- Will be filled when setting up payouts
  )
  RETURNING workos_user_id
)
-- Step 3: Insert Membership
INSERT INTO user_org_memberships (
  workos_user_id,
  org_id,
  role,
  status
)
SELECT
  new_user.workos_user_id,
  new_org.id,
  'owner',
  'active'
FROM new_user, new_org;

-- Verify
SELECT
  u.workos_user_id,
  u.email,
  u.first_name,
  u.last_name,
  o.name as org_name,
  o.slug as org_slug,
  uom.role,
  uom.status
FROM users u
JOIN user_org_memberships uom ON u.workos_user_id = uom.workos_user_id
JOIN organizations o ON uom.org_id = o.id
WHERE u.email = 'rbarona@hey.com';

COMMIT;
```

---

## Verification

After creating the user, verify everything is set up:

### 1. Check WorkOS Dashboard

- User exists
- Organization exists
- Membership is active

### 2. Check Database

```sql
-- Check user
SELECT * FROM users WHERE email = 'rbarona@hey.com';

-- Check organization
SELECT * FROM organizations WHERE slug LIKE 'user-user_%';

-- Check membership
SELECT
  u.email,
  o.name,
  uom.role,
  uom.status
FROM users u
JOIN user_org_memberships uom ON u.workos_user_id = uom.workos_user_id
JOIN organizations o ON uom.org_id = o.id
WHERE u.email = 'rbarona@hey.com';
```

### 3. Test Login

Try logging in with the test user:

1. Go to your app login page
2. Use: `rbarona@hey.com`
3. Request magic auth link
4. Check email and log in

---

## Next Steps

Once your test expert user is created:

1. ✅ Log in to the dashboard
2. ✅ Create a test event
3. ✅ Test guest booking flow
4. ✅ Verify guest user auto-registration

---

## Need Help?

If connection issues persist:

- Check Neon dashboard for outages
- Try from a different network
- Contact Neon support
- Use WorkOS Dashboard method (Solution 1)
