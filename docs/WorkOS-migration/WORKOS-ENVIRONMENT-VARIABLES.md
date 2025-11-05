# WorkOS Environment Variables

**Date**: November 5, 2025  
**Status**: ✅ Added to `config/env.ts` for type-safe access

---

## Required Environment Variables

Add these to your `.env` file for WorkOS authentication:

```bash
# ============================================================================
# WorkOS Authentication (New - Phase 1-3 Complete)
# ============================================================================

# Server-side API Key (Secret - DO NOT expose to client)
WORKOS_API_KEY=sk_test_xxxxx # Test key
# WORKOS_API_KEY=sk_live_xxxxx # Production key

# Client ID (Used by both server and client)
WORKOS_CLIENT_ID=client_xxxxx
NEXT_PUBLIC_WORKOS_CLIENT_ID=client_xxxxx # Same value, for client-side

# Session Cookie Password (32+ character random string)
# Generate with: openssl rand -base64 32
WORKOS_COOKIE_PASSWORD=your-32-character-random-string-here

# OAuth Redirect URI (Where WorkOS sends users after auth)
WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback # Dev
# WORKOS_REDIRECT_URI=https://yourdomain.com/api/auth/callback # Production

# Webhook Secret (Optional - for webhook signature verification)
WORKOS_WEBHOOK_SECRET=wh_secret_xxxxx
```

---

## Environment Variable Breakdown

### 1. WORKOS_API_KEY (Required)

**Purpose**: Server-side authentication with WorkOS API  
**Type**: Secret (never expose to client)  
**Where to get**: WorkOS Dashboard → API Keys  
**Format**: `sk_test_xxxxx` (test) or `sk_live_xxxxx` (production)

**Usage**:

```typescript
import { ENV_CONFIG } from '@/config/env';

const workos = new WorkOS(ENV_CONFIG.WORKOS_API_KEY);
```

### 2. WORKOS_CLIENT_ID (Required)

**Purpose**: Identifies your application to WorkOS  
**Type**: Public (safe to expose)  
**Where to get**: WorkOS Dashboard → Configuration  
**Format**: `client_xxxxx`

**Usage**: Used in server-side OAuth flows

### 3. NEXT_PUBLIC_WORKOS_CLIENT_ID (Required)

**Purpose**: Same as WORKOS_CLIENT_ID but accessible from client-side code  
**Type**: Public (safe to expose)  
**Value**: **Same as WORKOS_CLIENT_ID** (just duplicate the value)

**Usage**: Used in client-side components and pages

### 4. WORKOS_COOKIE_PASSWORD (Required)

**Purpose**: Encrypts session cookies (for security)  
**Type**: Secret (32+ characters)  
**How to generate**:

```bash
openssl rand -base64 32
```

**Example**: `aB3$kL9@mN2#pQ5^rT8*vW1!xY4&zA7%`

**Important**:

- Must be at least 32 characters
- Keep it secret like a password
- Different for dev/staging/production

### 5. WORKOS_REDIRECT_URI (Optional but Recommended)

**Purpose**: Where users are sent after authentication  
**Type**: Public  
**Format**: Full URL to your callback endpoint

**Development**: `http://localhost:3000/api/auth/callback`  
**Production**: `https://yourdomain.com/api/auth/callback`

**Note**: Must be registered in WorkOS Dashboard → Redirect URIs

### 6. WORKOS_WEBHOOK_SECRET (Optional)

**Purpose**: Verifies webhook signatures from WorkOS  
**Type**: Secret  
**Where to get**: WorkOS Dashboard → Webhooks  
**Format**: `wh_secret_xxxxx`

**Usage**: Validates that webhook requests actually come from WorkOS

---

## Type-Safe Access

All variables are now available via the centralized config:

```typescript
import { ENV_CONFIG, ENV_VALIDATORS } from '@/config/env';

// Access variables (type-safe)
const apiKey = ENV_CONFIG.WORKOS_API_KEY;
const clientId = ENV_CONFIG.WORKOS_CLIENT_ID;
const cookiePassword = ENV_CONFIG.WORKOS_COOKIE_PASSWORD;

// Validate configuration
const validation = ENV_VALIDATORS.workos();
if (!validation.isValid) {
  console.error(validation.message);
  console.error('Missing:', validation.missingVars);
}

// Check environment summary
const summary = ENV_HELPERS.getEnvironmentSummary();
console.log('Auth Provider:', summary.authProvider); // 'WorkOS' or 'Clerk'
console.log('Has WorkOS:', summary.hasWorkOS); // true/false
```

---

## Validation

The config includes automatic validation:

```typescript
import { ENV_VALIDATORS } from '@/config/env';

// Check if WorkOS is configured
const workosValidation = ENV_VALIDATORS.workos();

if (!workosValidation.isValid) {
  console.error('❌ WorkOS not configured properly!');
  console.error('Missing variables:', workosValidation.missingVars);
  // Missing variables: ['WORKOS_API_KEY', 'WORKOS_CLIENT_ID', ...]
}
```

---

## Migration Notes

### Current State (Phase 3 Complete)

- ✅ WorkOS environment variables **added to config**
- ✅ Type-safe access via `ENV_CONFIG`
- ✅ Validation functions available
- ⏳ **Not yet required** (Clerk still works)

### During Migration (Phases 4-8)

Both Clerk and WorkOS variables will coexist:

```bash
# Clerk (Legacy - still active during migration)
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx

# WorkOS (New - being set up)
WORKOS_API_KEY=sk_test_xxxxx
WORKOS_CLIENT_ID=client_xxxxx
NEXT_PUBLIC_WORKOS_CLIENT_ID=client_xxxxx
WORKOS_COOKIE_PASSWORD=your-random-string
```

### After Migration (Phase 8 Complete)

Clerk variables can be removed:

```bash
# Only WorkOS needed
WORKOS_API_KEY=sk_live_xxxxx
WORKOS_CLIENT_ID=client_xxxxx
NEXT_PUBLIC_WORKOS_CLIENT_ID=client_xxxxx
WORKOS_COOKIE_PASSWORD=your-production-random-string
WORKOS_REDIRECT_URI=https://yourdomain.com/api/auth/callback
WORKOS_WEBHOOK_SECRET=wh_secret_xxxxx
```

---

## Getting Your WorkOS Credentials

### 1. Sign Up / Log In

Go to: https://workos.com/

### 2. Get API Key

- Dashboard → API Keys
- Copy your **API Key** (starts with `sk_test_` or `sk_live_`)

### 3. Get Client ID

- Dashboard → Configuration
- Copy your **Client ID** (starts with `client_`)

### 4. Generate Cookie Password

```bash
openssl rand -base64 32
```

### 5. Configure Redirect URI

- Dashboard → Redirect URIs
- Add: `http://localhost:3000/api/auth/callback` (dev)
- Add: `https://yourdomain.com/api/auth/callback` (production)

### 6. Set Up Webhooks (Optional)

- Dashboard → Webhooks
- Add endpoint: `https://yourdomain.com/api/webhooks/workos`
- Copy **Webhook Secret** (starts with `wh_secret_`)

---

## Example .env File

Complete example for development:

```bash
# ============================================================================
# Database
# ============================================================================
DATABASE_URL=postgresql://user:password@host/database
AUDITLOG_DATABASE_URL=postgresql://user:password@host/audit

# ============================================================================
# Authentication - Clerk (Legacy - during migration)
# ============================================================================
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx

# ============================================================================
# Authentication - WorkOS (New)
# ============================================================================
WORKOS_API_KEY=sk_test_xxxxx
WORKOS_CLIENT_ID=client_xxxxx
NEXT_PUBLIC_WORKOS_CLIENT_ID=client_xxxxx
WORKOS_COOKIE_PASSWORD=aB3$kL9@mN2#pQ5^rT8*vW1!xY4&zA7%
WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback
WORKOS_WEBHOOK_SECRET=wh_secret_xxxxx

# ============================================================================
# Stripe
# ============================================================================
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
# ... rest of your config
```

---

## Security Best Practices

### ✅ DO:

- Keep `WORKOS_API_KEY` secret (never commit to git)
- Keep `WORKOS_COOKIE_PASSWORD` secret (32+ characters)
- Keep `WORKOS_WEBHOOK_SECRET` secret
- Use different values for dev/staging/production
- Rotate secrets periodically
- Use `.env.local` for local development (git-ignored)

### ❌ DON'T:

- Never commit `.env` files to git
- Never expose API keys in client-side code
- Never hardcode secrets in source code
- Never share secrets in Slack/email
- Never use production secrets in development

---

## Troubleshooting

### "Missing WorkOS environment variables"

**Solution**: Check that all required variables are set in your `.env` file.

```bash
# Verify variables are loaded
cd /your/project
grep WORKOS .env
```

### "Invalid WORKOS_COOKIE_PASSWORD"

**Solution**: Must be at least 32 characters. Generate a new one:

```bash
openssl rand -base64 32
```

### "Redirect URI not allowed"

**Solution**: Add your redirect URI in WorkOS Dashboard → Redirect URIs

### "WorkOS API Key is invalid"

**Solution**:

- Check you're using the correct environment key (test vs live)
- Verify the key hasn't been revoked
- Generate a new key in WorkOS Dashboard

---

## Next Steps

1. ✅ Add WorkOS variables to your `.env` file
2. ✅ Verify validation passes: `ENV_VALIDATORS.workos()`
3. ✅ Proceed with Phase 4: Legacy Data Migration
4. ⏳ Test WorkOS authentication flows
5. ⏳ Remove Clerk after full migration

---

**Reference**:

- `config/env.ts` - Type-safe environment config
- `docs/WorkOS-migration/setup/SETUP-WORKOS-ENV.md` - Detailed setup guide
- WorkOS Documentation: https://workos.com/docs

**Updated**: November 5, 2025
