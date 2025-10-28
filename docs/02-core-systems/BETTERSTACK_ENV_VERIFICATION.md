# BetterStack Environment Variables - Verification Report

## Your Current Vercel Configuration

```bash
# Status Page Configuration
BETTERSTACK_URL="https://status.eleva.care"
BETTERSTACK_API_KEY="vcs9q935637QhdKjr7WJYaoa"

# Heartbeat Endpoints (CRON Monitoring)
BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT="https://uptime.betterstack.com/api/v1/heartbeat/5JQa6JD74ZgvDj1yrDy2oDJt"
BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT="https://uptime.betterstack.com/api/v1/heartbeat/LfuXdKxiteBZx6zo1F5TELxk"
BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT="https://uptime.betterstack.com/api/v1/heartbeat/9dQ8KKFdgYqbEo4v46Wo3Ges"
BETTERSTACK_CLEANUP_RESERVATIONS_HEARTBEAT="https://uptime.betterstack.com/api/v1/heartbeat/TARcQghCFVCoaYUhGsWjJWyt"
BETTERSTACK_UPCOMING_PAYOUTS_HEARTBEAT="https://uptime.betterstack.com/api/v1/heartbeat/sq1VHeBBApADE627a58pkYdZ"
```

## Verification Results

### ✅ Required Variables (config/env.ts)

| Variable                                     | Status                    | Value                       | Notes          |
| -------------------------------------------- | ------------------------- | --------------------------- | -------------- |
| `BETTERSTACK_URL`                            | ✅ **PRESENT**            | `https://status.eleva.care` | Correct format |
| `BETTERSTACK_API_KEY`                        | ⚠️ **NEEDS VERIFICATION** | `vcs9q935637QhdKjr7WJYaoa`  | See below      |
| `BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT`     | ✅ **PRESENT**            | Valid heartbeat URL         | Active         |
| `BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT`      | ✅ **PRESENT**            | Valid heartbeat URL         | Active         |
| `BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT`    | ✅ **PRESENT**            | Valid heartbeat URL         | Active         |
| `BETTERSTACK_CLEANUP_RESERVATIONS_HEARTBEAT` | ✅ **PRESENT**            | Valid heartbeat URL         | Active         |
| `BETTERSTACK_UPCOMING_PAYOUTS_HEARTBEAT`     | ✅ **PRESENT**            | Valid heartbeat URL         | Active         |

### ⏸️ Optional Variables (Not Yet Configured)

| Variable                                          | Status     | Purpose                       |
| ------------------------------------------------- | ---------- | ----------------------------- |
| `BETTERSTACK_APPOINTMENT_REMINDERS_HEARTBEAT`     | ❌ Missing | 24-hour appointment reminders |
| `BETTERSTACK_APPOINTMENT_REMINDERS_1HR_HEARTBEAT` | ❌ Missing | 1-hour appointment reminders  |
| `BETTERSTACK_TASKS_HEARTBEAT`                     | ❌ Missing | Task processing monitoring    |

## ⚠️ API Key Verification Required

Your `BETTERSTACK_API_KEY` value appears unusual:

```bash
BETTERSTACK_API_KEY="vcs9q935637QhdKjr7WJYaoa"
```

### Expected Format

BetterStack API tokens typically:

- Start with `btok_` prefix
- Are much longer (40-60 characters)
- Example: `btok_abc123def456ghi789jkl012mno345pqr678stuv901`

### What You Have

Your key is:

- 24 characters long
- Doesn't start with `btok_`
- Might be a different type of credential

### Possible Issues

1. **This might be a Heartbeat token** (not an API key)
   - Heartbeat tokens are embedded in URLs
   - API keys are separate credentials

2. **This might be from a different service**
   - Verify it's from BetterStack's API Tokens section

3. **This might be an old format**
   - BetterStack may have changed formats

### How to Verify

Test your API key:

```bash
curl -H "Authorization: Bearer vcs9q935637QhdKjr7WJYaoa" \
  https://uptime.betterstack.com/api/v2/monitors
```

**Expected responses:**

✅ **If key is valid:**

```json
{
  "data": [
    {
      "id": "123456",
      "type": "monitor",
      "attributes": {
        "pronounceable_name": "Monitor Name",
        "status": "up"
      }
    }
  ]
}
```

❌ **If key is invalid:**

```json
{
  "errors": "Unauthorized"
}
```

## How to Get the Correct API Key

### Step 1: Log in to BetterStack

Go to https://betterstack.com/sign-in

### Step 2: Navigate to API Tokens

**Settings** → **API Tokens**

### Step 3: Create New Token

1. Click **"Create API Token"**
2. **Name**: `Eleva Care Status Page`
3. **Permissions**:
   - ✅ Check **"Read Monitors"** ONLY
   - ❌ Don't check other permissions
4. Click **"Create Token"**

### Step 4: Copy the Token

The token will look like:

```
btok_abc123def456ghi789jkl012mno345pqr678stuv901
```

⚠️ **Important**: BetterStack only shows the token once! Copy it immediately.

### Step 5: Update Vercel

```bash
# Via CLI
vercel env rm BETTERSTACK_API_KEY production
vercel env add BETTERSTACK_API_KEY production
# Paste the new btok_... token

# Or via Vercel Dashboard
# 1. Go to Project → Settings → Environment Variables
# 2. Edit BETTERSTACK_API_KEY
# 3. Paste the new btok_... token
# 4. Save
```

## Understanding the Difference

### API Key vs Heartbeat URLs

You have **TWO different types** of BetterStack credentials:

#### 1. API Key (for ServerStatus component)

```bash
BETTERSTACK_API_KEY="btok_abc123..."
```

- **Purpose**: Read monitor status for footer indicator
- **Format**: `btok_...` prefix, 40-60 chars
- **Where**: Settings → API Tokens
- **Permissions**: "Read Monitors" only
- **Used by**: `components/atoms/ServerStatus.tsx`

#### 2. Heartbeat URLs (for CRON monitoring)

```bash
BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT="https://uptime.betterstack.com/api/v1/heartbeat/5JQa6JD74ZgvDj1yrDy2oDJt"
```

- **Purpose**: Monitor cron job execution
- **Format**: Full URL with embedded token
- **Where**: Uptime → Heartbeats → Create Heartbeat
- **Permissions**: No auth needed (URL is the auth)
- **Used by**: `app/api/cron/*` routes

## What's Working vs What's Not

### ✅ Currently Working

Your **heartbeat monitoring** is fully configured:

- ✅ Expert transfers monitoring
- ✅ Pending payouts monitoring
- ✅ Payment reminders monitoring
- ✅ Cleanup reservations monitoring
- ✅ Upcoming payouts monitoring

These will send heartbeats to BetterStack when cron jobs run.

### ⚠️ Needs Verification

Your **status page component**:

- ⚠️ `BETTERSTACK_API_KEY` might be incorrect
- ✅ `BETTERSTACK_URL` is correct
- Result: Component might return "Unable to fetch status"

## Quick Test in Production

Once you verify/update the API key, test it:

### 1. Check the Footer

Visit https://eleva.care and scroll to footer. You should see:

```
🟢 All systems normal
```

### 2. Check Browser Console

Look for errors:

- ✅ No errors → Working!
- ❌ "Failed to fetch" → API key issue
- ❌ "Unauthorized" → Wrong API key

### 3. Check Server Logs (Vercel)

Look for BetterStack errors in your deployment logs.

## Summary

| Component            | Status          | Action Needed                               |
| -------------------- | --------------- | ------------------------------------------- |
| Heartbeat Monitoring | ✅ **WORKING**  | None - all configured                       |
| Status Page URL      | ✅ **WORKING**  | None - correct value                        |
| Status Page API Key  | ⚠️ **VERIFY**   | Test the key, possibly get new one          |
| Optional Heartbeats  | ⏸️ **OPTIONAL** | Add if you want appointment/task monitoring |

## Recommended Actions

### Priority 1: Verify API Key

```bash
# Test current key
curl -H "Authorization: Bearer vcs9q935637QhdKjr7WJYaoa" \
  https://uptime.betterstack.com/api/v2/monitors

# If it fails (401 Unauthorized):
# 1. Create new API token in BetterStack
# 2. Update Vercel environment variable
# 3. Redeploy
```

### Priority 2: Add to Local Environment

Don't forget your local `.env` file:

```bash
# Add to .env
BETTERSTACK_URL="https://status.eleva.care"
BETTERSTACK_API_KEY="btok_your_actual_token_here"

# Restart dev server
pnpm dev
```

### Priority 3 (Optional): Add Missing Heartbeats

If you want to monitor appointment reminders and tasks:

1. Create 3 more heartbeat monitors in BetterStack
2. Add the URLs to Vercel environment variables
3. Update your cron routes to send heartbeats

## Files Reference

All variables are defined in:

- **Configuration**: `config/env.ts` (lines 76-97)
- **Validation**: `config/env.ts` (lines 268-282)
- **BetterStack Config**: `config/betterstack.ts`
- **Component**: `components/atoms/ServerStatus.tsx`
- **Setup Guide**: `docs/02-core-systems/betterstack-status-page-setup.md`

## Support

If you need help:

1. **Test API Key**: Use the curl command above
2. **Check Logs**: Vercel deployment logs
3. **BetterStack Support**: support@betterstack.com
4. **Documentation**: https://betterstack.com/docs/uptime/api

---

**Last Updated**: 2025-10-28
**Status**: ⚠️ Verification needed for BETTERSTACK_API_KEY
