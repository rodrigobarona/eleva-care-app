# Novu Authentication Issue Fix

## Issue Summary

The Novu integration was failing with "API Key not found" error (401 Unauthorized) in production on Vercel. The error logs showed:

```
[Novu Utils] ❌ Failed to trigger workflow: {
  workflowId: 'security-auth',
  error: 'API Key not found',
  statusCode: 401,
  ...
}
```

## Root Cause Analysis

After investigating the error logs and code, I identified two main issues:

### 1. Incorrect API URL Parameter

**Problem**: The Novu client was using `apiUrl` parameter instead of `serverURL` in the constructor, causing requests to go to the default US endpoint (`https://api.novu.co`) instead of the configured EU endpoint (`https://eu.api.novu.co`).

**Evidence**: Error logs showed requests going to `https://api.novu.co/v1/events/trigger` instead of `https://eu.api.novu.co/v1/events/trigger`.

### 2. Outdated SDK Version

**Problem**: The project was using `@novu/api@1.5.0` while the latest version `1.6.0` was available, which could have compatibility improvements.

## Fixes Applied

### 1. Fixed API URL Configuration

Updated all Novu client initializations to use the correct `serverURL` parameter:

**Files Modified:**

- `lib/novu-utils.ts`
- `app/utils/novu.ts`
- `lib/novu-email-service.ts`

**Before:**

```typescript
novu = new Novu({
  secretKey: ENV_CONFIG.NOVU_SECRET_KEY,
  ...(ENV_CONFIG.NOVU_BASE_URL && { apiUrl: ENV_CONFIG.NOVU_BASE_URL }),
});
```

**After:**

```typescript
novu = new Novu({
  secretKey: ENV_CONFIG.NOVU_SECRET_KEY,
  ...(ENV_CONFIG.NOVU_BASE_URL && { serverURL: ENV_CONFIG.NOVU_BASE_URL }),
});
```

### 2. Updated Novu SDK

Updated `@novu/api` from version `1.5.0` to `1.6.0`:

```bash
pnpm update @novu/api@1.6.0
```

### 3. Created Diagnostic Script

Added a comprehensive diagnostic script at `scripts/test-novu-diagnostics.js` to help troubleshoot Novu configuration issues in the future.

**Usage:**

```bash
node scripts/test-novu-diagnostics.js
# or
pnpm novu:diagnostics
```

The script tests:

- Environment variable configuration
- API connectivity with correct endpoints
- Authentication with the configured API key
- Workflow trigger functionality

## Environment Variables Required

### ✅ Required Variables

Ensure these environment variables are set in Vercel:

```env
NOVU_SECRET_KEY=your_novu_secret_key
NOVU_BASE_URL=https://eu.api.novu.co
NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=your_app_identifier
```

### ⚪ Optional Variables

These are not required for basic functionality:

```env
NOVU_API_KEY=legacy_fallback_key          # Only needed if NOVU_SECRET_KEY is not available
NOVU_ADMIN_SUBSCRIBER_ID=admin            # Only for admin notifications and testing
```

## Verification Steps

1. **Deploy the fixes** to Vercel
2. **Run the diagnostic script** locally to verify configuration:
   ```bash
   pnpm novu:diagnostics
   ```
3. **Monitor Vercel logs** for successful Novu workflow triggers
4. **Test a Clerk webhook event** (like user creation or session creation) to verify the integration works

## Expected Results

After applying these fixes:

- ✅ Novu client will connect to the correct EU endpoint (`https://eu.api.novu.co`)
- ✅ API authentication will work properly with the secret key
- ✅ Workflow triggers from Clerk webhooks will succeed
- ✅ No more "API Key not found" errors in Vercel logs

## Troubleshooting

If issues persist:

1. **Verify API Key**: Ensure `NOVU_SECRET_KEY` is correctly set in Vercel environment variables
2. **Check Region**: Confirm you're using the correct Novu region (EU vs US)
3. **Run Diagnostics**: Use the diagnostic script to identify specific issues
4. **Check Novu Dashboard**: Verify your account is active and API key has proper permissions

## Related Files

- `lib/novu-utils.ts` - Main Novu utilities
- `app/utils/novu.ts` - Alternative Novu client
- `lib/novu-email-service.ts` - Email service integration
- `scripts/test-novu-diagnostics.js` - Diagnostic script
- `config/env.ts` - Environment configuration
- `app/api/webhooks/clerk/route.ts` - Clerk webhook handler

## Prevention

To prevent similar issues in the future:

1. **Use the diagnostic script** when setting up Novu in new environments
2. **Verify API endpoint URLs** match your Novu account region
3. **Keep SDK versions updated** regularly
4. **Test webhook integrations** thoroughly in staging before production deployment
