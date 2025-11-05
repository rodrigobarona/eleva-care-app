# Correct WorkOS AuthKit JWKS Configuration

## 🎯 **Problem**

The generic JWKS URL `https://api.workos.com/.well-known/jwks.json` is incorrect for WorkOS AuthKit.

## ✅ **Solution**

WorkOS AuthKit uses **client-specific** JWKS URLs.

### **Step 1: Get Your Client ID**

Your `WORKOS_CLIENT_ID` should look like:

```
client_01HGDWFKBW2QKGEYDQS4B92ZZK
```

You can find this in:

- Your `.env` file as `WORKOS_CLIENT_ID`
- WorkOS Dashboard → Your App → API Keys

### **Step 2: Construct JWKS URL**

Format:

```
https://api.workos.com/sso/jwks/{YOUR_CLIENT_ID}
```

Example (replace with your actual client ID):

```
https://api.workos.com/sso/jwks/client_01HGDWFKBW2QKGEYDQS4B92ZZK
```

### **Step 3: Update Neon Auth Configuration**

Go back to Neon Console → Data API → Configuration:

1. Click **Edit** on the Authentication Configuration
2. Update **JWKS URL** to: `https://api.workos.com/sso/jwks/{YOUR_CLIENT_ID}`
3. Keep **JWT Audience** as: `api://default` (or remove it)
4. Click **Save**

---

## 🔍 **Verify Your JWKS URL**

You can test your JWKS URL by visiting it in a browser:

```bash
# Replace with your actual client ID
curl https://api.workos.com/sso/jwks/client_01HGDWFKBW2QKGEYDQS4B92ZZK
```

You should see a JSON response with public keys:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "...",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

---

## 📋 **Access Token Structure**

Once configured, Neon Auth will validate JWTs with this structure:

```json
{
  "iss": "https://api.workos.com",
  "sub": "user_01HBEQKA6K4QJAS93VPE39W1JT", // ← auth.user_id() returns this
  "org_id": "org_01HRDMC6CM357W30QMHMQ96Q0S",
  "role": "member",
  "roles": ["member"],
  "permissions": ["posts:read", "posts:write"],
  "sid": "session_01HQSXZGF8FHF7A9ZZFCW4387R",
  "exp": 1709193857,
  "iat": 1709193557
}
```

**Key Claims:**

- `sub` → WorkOS user ID (returned by `auth.user_id()`)
- `org_id` → WorkOS organization ID
- `role` / `roles` → RBAC roles from WorkOS
- `permissions` → Fine-grained permissions
- `sid` → Session ID

---

## ✅ **Test After Update**

After updating the JWKS URL in Neon, run the test SQL again:

```sql
-- Test 1: Check if auth.user_id() function exists
SELECT auth.user_id() AS current_user_id;
-- Should return NULL (no JWT provided yet)

-- Test 2: Check authenticated role
SELECT rolname FROM pg_roles WHERE rolname = 'authenticated';
-- Should return 'authenticated'
```

---

## 📝 **What Changed in Schema Files**

I've already updated your schema to remove the incorrect RLS syntax. The RLS policies will be applied via the SQL migration file:

- **Schema file**: `drizzle/schema-workos.ts` (no RLS syntax)
- **RLS policies**: `drizzle/migrations-manual/001_enable_rls.sql` (will use correct `auth.user_id()`)

---

## 🚀 **Next Steps**

1. **Update Neon Auth** with correct JWKS URL (using your actual client ID)
2. **Verify** by testing the JWKS URL in your browser
3. **Continue migration**: Generate Drizzle migrations
4. **Apply migrations**: Create tables + enable RLS

Let me know your `WORKOS_CLIENT_ID` format (just the pattern, not the actual ID) and I'll help you verify the JWKS URL! 🎯
