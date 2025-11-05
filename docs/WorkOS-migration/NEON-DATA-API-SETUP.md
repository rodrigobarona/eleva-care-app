# Neon Data API Setup Guide

**Quick Reference** for configuring Neon Auth with WorkOS via the Data API UI.

---

## 🎯 Overview

The **Neon Data API** provides a REST interface to your database AND handles JWT authentication via WorkOS. When enabled with the WorkOS JWKS URL, it:

1. Validates WorkOS JWTs automatically
2. Provides the `auth.user_id()` function in SQL
3. Enables Row-Level Security (RLS) with zero manual context setting

**This is way easier than the command-line approach!** ✨

---

## 📋 Setup Steps (5 minutes)

### Step 1: Go to Neon Console

1. Log in to https://console.neon.tech
2. Select your project (e.g., "eleva-workos")
3. Click **Data API** in the left sidebar

### Step 2: Enable Data API

Toggle the **Enable** switch to ON.

### Step 3: Configure Authentication Provider

In the "Authentication provider" section:

| Field                       | Value                                          |
| --------------------------- | ---------------------------------------------- |
| **Provider**                | Select: **"Other Provider"**                   |
| **JWKS URL**                | `https://api.workos.com/.well-known/jwks.json` |
| **JWT Audience** (optional) | Leave blank or use `api://default`             |

### Step 4: Grant Schema Access

Check the box:  
✅ **"Grant public schema access to authenticated users"**

This automatically applies:

```sql
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
```

### Step 5: Save Configuration

Click **Save** or **Enable** button.

---

## ✅ Verification

### Test 1: Check auth.user_id() Function

In Neon Console → **SQL Editor**:

```sql
SELECT auth.user_id();
```

**Expected Result:**

- `NULL` (no JWT provided yet) ✅
- After authentication, it will return the WorkOS user ID

### Test 2: Check Data API Endpoint

You should see an endpoint URL like:

```
https://app-YOUR-PROJECT.data.neon.tech
```

This is your Data API base URL (not used directly in our setup, but good to know it exists).

---

## 🔍 What Just Happened?

### Behind the Scenes

1. **JWKS Configuration**: Neon now fetches WorkOS's public keys from the JWKS URL to validate JWTs

2. **auth.user_id() Function**: A special PostgreSQL function that:
   - Extracts the `sub` claim from the JWT
   - Returns the WorkOS user ID
   - Returns `NULL` if no JWT or invalid JWT

3. **Automatic Validation**: Every query with a JWT:
   ```typescript
   const sql = neon(DATABASE_URL, {
     authToken: session.accessToken, // WorkOS JWT
   });
   ```

   - Neon validates the JWT via WorkOS JWKS
   - Sets `auth.user_id()` to the WorkOS user ID
   - RLS policies use this to filter data

### Security Model

```
┌─────────────────────────────────────────────┐
│  1. User signs in via WorkOS               │
│     ↓ Receives JWT                          │
├─────────────────────────────────────────────┤
│  2. App makes query with JWT               │
│     getDrizzleClient(session.accessToken)   │
├─────────────────────────────────────────────┤
│  3. Neon validates JWT                     │
│     • Fetches public key from JWKS         │
│     • Verifies signature                    │
│     • Checks expiration                     │
│     • Extracts 'sub' claim                  │
├─────────────────────────────────────────────┤
│  4. auth.user_id() returns WorkOS user ID  │
│     Used in RLS policies automatically      │
├─────────────────────────────────────────────┤
│  5. RLS policies filter data               │
│     WHERE workos_user_id = auth.user_id()   │
└─────────────────────────────────────────────┘
```

---

## 📊 JWT Structure

WorkOS issues JWTs with this structure:

```json
{
  "sub": "user_01H2F...", // WorkOS user ID (used by auth.user_id())
  "email": "user@example.com",
  "org_id": "org_01H2G...",
  "role": "owner",
  "iat": 1699564800,
  "exp": 1699568400
}
```

**Key Claims:**

- `sub` - User ID (extracted by `auth.user_id()`)
- `org_id` - Current organization (available in session)
- `role` - WorkOS RBAC role
- `exp` - Expiration timestamp

---

## 🔧 Configuration Details

### What is JWKS?

**JWKS (JSON Web Key Set)** is a standard way to publish public keys for JWT validation.

WorkOS JWKS URL: `https://api.workos.com/.well-known/jwks.json`

Contains:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "key-id-123",
      "n": "modulus...",
      "e": "AQAB"
    }
  ]
}
```

Neon uses these public keys to verify JWT signatures without needing the private key (which WorkOS keeps secret).

### JWT Audience (Optional)

The `audience` claim in JWTs specifies who the token is intended for.

**Options:**

- Leave blank (Neon won't check audience)
- Use `api://default` (WorkOS default)
- Use custom audience if configured in WorkOS

**Recommendation:** Leave blank unless you have specific requirements.

---

## 🚨 Troubleshooting

### Error: "auth.user_id() does not exist"

**Cause:** Data API not enabled or JWKS URL not configured.

**Solution:**

1. Check Data API is enabled (toggle ON)
2. Verify JWKS URL is set: `https://api.workos.com/.well-known/jwks.json`
3. Save configuration
4. Wait 1-2 minutes for changes to propagate

### Error: "Invalid JWT signature"

**Cause:** JWT not signed by WorkOS or using wrong JWKS URL.

**Solution:**

1. Verify JWKS URL is correct
2. Check that JWT is from WorkOS (not expired)
3. Ensure `authToken` is being passed to Neon client

### RLS policies not working

**Cause:** `auth.user_id()` returning NULL or policies not applied.

**Solution:**

1. Test: `SELECT auth.user_id();` (should return user ID when JWT provided)
2. Check RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
3. Verify policies exist: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
4. Ensure JWT is passed to database client

---

## 🎯 Next Steps

After enabling the Data API:

1. ✅ **Environment variables** - Update `.env.local` with database URLs
2. ✅ **Create RLS policies** - Run `drizzle/migrations-manual/001_enable_rls.sql`
3. ✅ **Generate migrations** - `pnpm db:generate`
4. ✅ **Apply migrations** - `pnpm db:migrate`
5. ✅ **Test authentication** - Sign in and verify RLS works

---

## 📚 Resources

### Official Documentation

- [Neon Data API Docs](https://neon.tech/docs/data-api)
- [Neon Auth Guide](https://neon.tech/docs/guides/neon-auth)
- [WorkOS JWKS](https://workos.com/docs/authentication/jwks)
- [JWT.io](https://jwt.io) - Decode JWTs to inspect claims

### Internal Documentation

- `NEXT-STEPS.md` - Complete setup guide
- `drizzle/migrations-manual/001_enable_rls.sql` - RLS policies
- `lib/integrations/neon/rls-client.ts` - Database client
- `lib/auth/workos-session.ts` - Session management

---

## 💡 Pro Tips

### 1. Test with JWT.io

Copy a WorkOS access token and paste it into https://jwt.io to see:

- Header (algorithm, type)
- Payload (sub, email, org_id, role)
- Signature verification status

### 2. Monitor RLS Performance

Check slow queries:

```sql
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
WHERE query LIKE '%auth.user_id%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 3. Debug RLS Policies

Temporarily disable RLS for debugging (⚠️ use carefully):

```sql
-- Disable RLS (as superuser/neondb_owner)
ALTER TABLE events DISABLE ROW LEVEL SECURITY;

-- Debug query...

-- Re-enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
```

### 4. Cache JWKS

Neon caches JWKS keys for performance. If you rotate WorkOS keys:

- Wait ~5 minutes for cache to refresh
- Or contact Neon support to clear cache immediately

---

**You're all set!** The Data API is now configured for WorkOS authentication. 🚀
