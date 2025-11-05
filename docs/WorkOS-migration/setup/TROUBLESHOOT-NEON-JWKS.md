# Troubleshooting Neon Auth JWKS Configuration

## 🐛 **Error: "Failed to set up authentication provider: invalid JWKS"**

This error occurs when Neon cannot validate the JWKS URL.

---

## ✅ **Solution 1: Check the Exact Field Names**

In Neon Console → Data API → Authentication Configuration:

### **Correct Configuration:**

1. **Provider**: Select **"Other Provider"** or **"Custom"** (NOT "Neon Auth" or "Stack Auth")
2. **JWKS URL**:
   ```
   https://api.workos.com/sso/jwks/client_01HGDWFKBW2QKGEYDQS4B92ZZK
   ```
3. **JWT Audience**: **LEAVE BLANK** (delete any value like `api://default`)
4. **JWT Issuer** (if shown):
   ```
   https://api.workos.com
   ```

---

## ✅ **Solution 2: Verify You're in the Right Section**

There are **TWO** sections in Neon that look similar:

### **❌ WRONG Section: "Auth" (Top-level)**

- This is for Neon's built-in auth (Stack Auth)
- NOT what we want

### **✅ RIGHT Section: "Data API" → "Authentication"**

- This is where you configure custom JWKS
- Should show "Configure authentication provider"

**Path**: Project → **Data API** → Scroll to **"Authentication"** section

---

## ✅ **Solution 3: Copy-Paste Without Formatting**

Sometimes hidden characters cause issues:

1. Open a plain text editor (Notepad, VS Code, etc.)
2. Copy this URL:
   ```
   https://api.workos.com/sso/jwks/client_01HGDWFKBW2QKGEYDQS4B92ZZK
   ```
3. Paste into text editor
4. Copy from text editor
5. Paste into Neon Console (without extra spaces/quotes)

---

## ✅ **Solution 4: Alternative - Use OpenID Configuration**

Some systems prefer the OpenID configuration endpoint:

Instead of JWKS URL, try:

```
https://api.workos.com/.well-known/openid-configuration
```

But this is a fallback - the direct JWKS URL should work.

---

## ✅ **Solution 5: Contact Neon Support**

If none of the above work, the issue might be:

1. **Neon Data API Beta Limitation**: Custom JWKS might not be fully supported yet
2. **WorkOS JWKS Format**: Neon might expect a different structure

**What to tell Neon Support:**

> "I'm trying to configure custom JWKS authentication for Neon Data API using WorkOS.
>
> My JWKS URL: `https://api.workos.com/sso/jwks/client_01HGDWFKBW2QKGEYDQS4B92ZZK`
>
> When I test this URL directly, it returns valid JWKS:
>
> ```json
> {"keys":[{"alg":"RS256","kty":"RSA","use":"sig",...}]}
> ```
>
> But when I try to configure it in the Data API section, I get 'invalid JWKS' error.
>
> Can you help me configure WorkOS authentication for the Data API?"

**Neon Support**: https://neon.tech/docs/introduction/support

---

## 🔍 **Diagnostic Checklist**

Run through this checklist:

- [ ] ✅ JWKS URL is accessible: `curl https://api.workos.com/sso/jwks/client_01HGDWFKBW2QKGEYDQS4B92ZZK`
- [ ] ✅ Returns valid JSON with `keys` array
- [ ] ✅ In correct section: "Data API" → "Authentication" (NOT top-level "Auth")
- [ ] ✅ Provider type: "Custom" or "Other Provider"
- [ ] ✅ JWT Audience field is BLANK
- [ ] ✅ No extra spaces or quotes in URL
- [ ] ✅ Tried copying URL from plain text editor

---

## 🔄 **Alternative: Proceed Without Neon Auth**

If Neon Auth configuration continues to fail, we can proceed differently:

### **Option A: Manual JWT Verification**

Instead of relying on `auth.user_id()`, we can:

1. Verify JWTs in the application layer
2. Use connection pooling with user context
3. Apply RLS using `SET LOCAL` statements

**Trade-off**: Slightly more complex, but more portable.

### **Option B: Skip Data API**

Use standard Postgres connections instead of Data API:

1. Connect via `DATABASE_URL` (already set up)
2. Implement RLS with application-level context
3. Use Drizzle ORM normally

**Trade-off**: No REST API, but more control.

### **Option C: Wait for Neon Beta Updates**

Data API is in **Beta** - custom JWKS might be:

1. Not fully implemented yet
2. Coming in a future update
3. Requires specific configuration format

---

## 📊 **Current Status**

| Component         | Status   | Notes                              |
| ----------------- | -------- | ---------------------------------- |
| WorkOS JWKS URL   | ✅ Valid | Returns proper public keys         |
| Neon Data API     | ⚠️ Beta  | Custom auth might have limitations |
| Standard Postgres | ✅ Ready | Can use without Data API           |
| Schema + RLS SQL  | ✅ Ready | Independent of Neon Auth           |

---

## 🎯 **Recommended Next Steps**

### **Path 1: Continue Troubleshooting Neon Auth**

1. Try all solutions above
2. Contact Neon Support
3. Wait for response

### **Path 2: Proceed Without Neon Auth (Recommended)**

1. Use standard Postgres connection
2. Implement RLS with application context
3. Migrate now, add Data API later

**I recommend Path 2** because:

- ✅ Unblocks your migration immediately
- ✅ RLS still works with standard connections
- ✅ Can add Data API later when it's more mature
- ✅ More control over authentication flow

---

## 🚀 **Ready to Proceed?**

If you want to proceed **without Neon Auth** (using standard Postgres), we can:

1. ✅ Generate Drizzle migrations
2. ✅ Apply RLS policies (using `SET LOCAL` for user context)
3. ✅ Implement WorkOS JWT verification in app layer
4. ✅ Complete the migration

**This approach is actually MORE common** in production systems!

Let me know which path you want to take! 🎯
