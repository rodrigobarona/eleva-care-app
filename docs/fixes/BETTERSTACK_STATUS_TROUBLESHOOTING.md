# BetterStack ServerStatus Not Showing in Production

## Problem

ServerStatus component renders in **localhost** ✅ but **NOT in production** ❌

## Root Cause

The component returns `null` when environment variables are missing:

```typescript
// ServerStatus.tsx line 31-34
if (!betterstackConfig.apiKey || !betterstackConfig.statusPageUrl) {
  return null; // Component doesn't render!
}
```

## Solution

### Step 1: Verify Vercel Environment Variables

Go to: https://vercel.com/your-team/eleva-care-app/settings/environment-variables

**Required Variables:**

```bash
BETTERSTACK_API_KEY=btok_your_actual_api_key_here
BETTERSTACK_URL=https://status.eleva.care
```

### Step 2: Check Current Values

Your reported Vercel values:

```bash
BETTERSTACK_URL="https://status.eleva.care" # ✅ Looks good
BETTERSTACK_API_KEY="vcs9q935637QhdKjr7WJYaoa" # ⚠️ Verify format
```

**⚠️ Important**: BetterStack API keys should start with `btok_` not `vcs`

### Step 3: Get Correct API Key

1. Go to https://betterstack.com
2. Navigate to **Settings → API Tokens**
3. Create/find token with **"Read Monitors"** permission
4. Copy the token (should start with `btok_`)

### Step 4: Update Vercel

1. Go to Vercel Environment Variables
2. Update `BETTERSTACK_API_KEY` with correct value
3. **Redeploy** (or wait for next deployment)

### Step 5: Verify Deployment

After redeployment:

```bash
# Check Vercel logs for errors:
# https://vercel.com/your-team/eleva-care-app/deployments

# Look for:
"Error fetching BetterStack status:"
```

## Testing Locally

To verify your API key works:

```bash
# Add to .env.local
BETTERSTACK_API_KEY=btok_your_key_here
BETTERSTACK_URL=https://status.eleva.care

# Test
pnpm dev
# Visit http://localhost:3000 and check footer
```

## Quick Debug API Call

Test your API key manually:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://uptime.betterstack.com/api/v2/monitors
```

**Expected response:** JSON with monitor data  
**Error response:** 401 Unauthorized (wrong key)

## Common Issues

### Issue 1: Wrong API Key Format

- ❌ Starts with `vcs` (incorrect)
- ✅ Starts with `btok_` (correct)

### Issue 2: API Key Not in Vercel

- Check **all environments** (Production, Preview, Development)
- ServerStatus only works with correct keys in Production

### Issue 3: Deployment Not Updated

- After adding env vars, **trigger a new deployment**
- Go to Vercel → Deployments → Redeploy

### Issue 4: No Monitors in BetterStack

- Component returns "No monitors configured" if account has 0 monitors
- Add at least 1 monitor to BetterStack

## Verification Steps

### 1. Check Component Logic

```typescript
// If this logs "undefined", env vars aren't set
console.log('BetterStack Config:', {
  apiKey: ENV_CONFIG.BETTERSTACK_API_KEY ? 'SET' : 'MISSING',
  url: ENV_CONFIG.BETTERSTACK_URL ? 'SET' : 'MISSING',
});
```

### 2. Check Vercel Build Logs

Look for:

```
Building...
✓ Environment variables loaded
  BETTERSTACK_API_KEY: ***
  BETTERSTACK_URL: https://status.eleva.care
```

### 3. Check Runtime

Add temporary logging in production:

```typescript
export async function ServerStatus() {
  console.log('[ServerStatus] Config check:', {
    hasApiKey: !!betterstackConfig.apiKey,
    hasUrl: !!betterstackConfig.statusPageUrl,
  });

  // ... rest of component
}
```

## Expected Behavior

### When Working ✅

- Footer shows status indicator with animation
- Clicking opens BetterStack status page
- Status updates every 3 minutes

### When Not Working ❌

- **No status indicator in footer** (component returns null)
- No errors in console (silent failure by design)

## Still Not Working?

1. **Check API key permissions**
   - Must have "Read Monitors" permission
   - Not expired

2. **Check Vercel environment**
   - Variables set for **Production**
   - Not just Preview or Development

3. **Force redeploy**

   ```bash
   git commit --allow-empty -m "chore: trigger redeploy"
   git push origin main
   ```

4. **Check Footer component**
   - Ensure `<ServerStatus />` is still in Footer.tsx
   - Line 106 should have it

## Contact Support

If still not working after all steps:

1. Export Vercel logs
2. Check BetterStack API status: https://status.betterstack.com
3. Verify API key in BetterStack dashboard
4. Try regenerating API token

---

**Last Updated:** 2025-10-28  
**Commit:** c34df11  
**Status:** Environment variables in Vercel need verification
