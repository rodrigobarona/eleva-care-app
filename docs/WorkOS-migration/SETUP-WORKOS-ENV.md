# WorkOS Environment Setup

Before you can create users and test the migration, you need to configure WorkOS credentials.

## 1. Get Your WorkOS API Key

1. Go to [WorkOS Dashboard](https://dashboard.workos.com/)
2. Log in to your account
3. Navigate to **API Keys** in the left sidebar
4. Copy your **API Key** (starts with `sk_`)
5. Copy your **Client ID** (starts with `client_`)

## 2. Add to `.env` File

Add these variables to your `.env` file:

```bash
# WorkOS Configuration
WORKOS_API_KEY=sk_your_api_key_here
WORKOS_CLIENT_ID=client_your_client_id_here
WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback
```

**For Production:**

```bash
WORKOS_REDIRECT_URI=https://your-domain.com/auth/callback
```

## 3. Verify Configuration

Run this to check your setup:

```bash
node -e "require('dotenv').config(); console.log('WORKOS_API_KEY:', process.env.WORKOS_API_KEY ? '✅ Set' : '❌ Missing'); console.log('WORKOS_CLIENT_ID:', process.env.WORKOS_CLIENT_ID ? '✅ Set' : '❌ Missing');"
```

**Expected output:**

```
WORKOS_API_KEY: ✅ Set
WORKOS_CLIENT_ID: ✅ Set
```

## 4. Test WorkOS Connection

After adding the keys, test the connection:

```bash
pnpm tsx scripts/create-expert-user.ts
```

This will create your test expert user: Rodrigo Barona (rbarona@hey.com)

---

## Environment Variables Reference

Your `.env` should have:

```bash
# Database
DATABASE_URL=your_neon_database_url

# WorkOS (for authentication and user management)
WORKOS_API_KEY=sk_...
WORKOS_CLIENT_ID=client_...
WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Other services...
```

---

## Troubleshooting

### "WORKOS_API_KEY is required" Error

**Solution:**

1. Check that `.env` file exists in project root
2. Verify `WORKOS_API_KEY` is set (no spaces, no quotes)
3. Restart your terminal/server after adding variables

### "Invalid API Key" Error

**Solution:**

1. Verify you copied the correct key from WorkOS Dashboard
2. Make sure it starts with `sk_`
3. Check for extra spaces or characters
4. Try generating a new API key in WorkOS Dashboard

### Can't Find WorkOS Dashboard

**Solution:**

1. Go to https://dashboard.workos.com/
2. Create an account if you don't have one
3. It's free for development/testing

---

## Next Steps

Once your environment is configured:

1. ✅ Create expert user: `pnpm tsx scripts/create-expert-user.ts`
2. ✅ Test guest booking flow
3. ✅ Verify data in database

---

**Need Help?**

- [WorkOS Documentation](https://workos.com/docs)
- [WorkOS API Reference](https://workos.com/docs/reference)
- Check `lib/integrations/workos/client.ts` for configuration
