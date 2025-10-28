# BetterStack Status Page - Quick Start 🚀

## The Problem ❌

Your footer ServerStatus component is **not showing** because these environment variables are missing:

```bash
BETTERSTACK_API_KEY=<missing>
BETTERSTACK_URL=<missing>
```

## The Solution ✅

### Step 1: Get Your BetterStack API Token (5 minutes)

1. Go to https://betterstack.com → Log in
2. Navigate to **Settings** → **API Tokens**
3. Click **"Create API Token"**
4. Name it: `Eleva Care Status Page`
5. Permission: **"Read Monitors"** only
6. Copy the token (starts with `btok_...`)

### Step 2: Get Your Status Page URL

**Option A - Use BetterStack Default URL:**

- Go to **Uptime** → **Monitors**
- Click any monitor → "View Status Page"
- Copy the URL (e.g., `https://elevacafesfre.betteruptime.com`)

**Option B - Create Custom Status Page:**

- Go to **Status Pages** → **"Create Status Page"**
- Use custom domain: `status.eleva.care`
- Copy the URL

### Step 3: Add to Your `.env` File

Add these two lines to your `.env` file:

```bash
# BetterStack Status Page Configuration
BETTERSTACK_API_KEY="btok_your_actual_token_here"
BETTERSTACK_URL="https://status.eleva.care"
```

### Step 4: Restart Your Server

```bash
# Stop your server (Ctrl+C if running)
pnpm dev
```

### Step 5: Verify It Works

1. Open http://localhost:3000
2. Scroll to the footer
3. Look for the status indicator with animated dot:
   - 🟢 "All systems normal" → **Success!**
   - ⚪ "Unable to fetch status" → Check your API token
   - Nothing visible → Environment variables not loaded

## What You'll See

### Before (Missing Vars):

```
Footer:
├── Compliance Badges (GDPR, LGPD, HIPAA, ISO)
├── Platform Disclaimer
└── [Nothing here] ❌ ← Status should be here
```

### After (Configured):

```
Footer:
├── Compliance Badges (GDPR, LGPD, HIPAA, ISO)
├── Platform Disclaimer
└── 🟢 All systems normal ✅ ← Clickable status indicator
```

## Quick Test

Test your API token:

```bash
curl -H "Authorization: Bearer btok_your_token_here" \
  https://uptime.betterstack.com/api/v2/monitors
```

Expected response:

```json
{
  "data": [
    {
      "id": "123456",
      "attributes": {
        "pronounceable_name": "My Monitor",
        "status": "up"
      }
    }
  ]
}
```

## Troubleshooting

| Issue                    | Cause            | Fix                              |
| ------------------------ | ---------------- | -------------------------------- |
| Component not showing    | Missing env vars | Add both variables to `.env`     |
| "Unable to fetch status" | Invalid token    | Check token is correct           |
| Gray dot                 | No monitors      | Create monitors in BetterStack   |
| Not updating             | Cached           | Wait 3 minutes or restart server |

## Don't Have Monitors Yet?

### Quick Monitor Setup (2 minutes)

1. BetterStack → **Uptime** → **Monitors** → **"Create Monitor"**
2. Type: **Website (HTTP/HTTPS)**
3. URL: `https://eleva.care`
4. Name: `Eleva Care Production`
5. Check frequency: `60 seconds`
6. Click **"Create Monitor"**

Now your status indicator will work!

## Vercel Deployment

Don't forget to add to Vercel:

```bash
vercel env add BETTERSTACK_API_KEY
# Paste your token

vercel env add BETTERSTACK_URL
# Enter your status page URL
```

Or via Vercel Dashboard:

1. Project → **Settings** → **Environment Variables**
2. Add both variables
3. Redeploy

## Files Modified

✅ Updated files (already done):

- `config/env.ts` - Added BETTERSTACK_API_KEY and BETTERSTACK_URL
- `config/betterstack.ts` - Updated to use ENV_CONFIG
- `_backup_env` - Added documentation
- `components/atoms/ServerStatus.tsx` - Already implemented
- `components/organisms/Footer.tsx` - Already integrated

## Status Colors

| Color     | Status               | Meaning                  |
| --------- | -------------------- | ------------------------ |
| 🟢 Green  | All systems normal   | All monitors up          |
| 🟠 Orange | Partial outage       | Some monitors down       |
| 🔴 Red    | Degraded performance | Many monitors down       |
| ⚪ Gray   | Unable to fetch      | API error or no monitors |

## Cost

**Free Plan**: 10 monitors, unlimited checks
**Basic Plan**: $18/mo for 20 monitors

Start with free plan for testing!

## Full Documentation

For detailed setup: [`docs/02-core-systems/betterstack-status-page-setup.md`](./betterstack-status-page-setup.md)

## Summary

1. ✅ **Component exists** - Already coded and in Footer
2. ✅ **i18n complete** - Translated to 4 languages
3. ✅ **Types defined** - Full TypeScript support
4. ❌ **Missing config** - Need 2 environment variables
5. ⏱️ **5 minutes** - Time to fix

**Next action**: Add the 2 environment variables to your `.env` file and restart!

---

**Quick Links:**

- [BetterStack Login](https://betterstack.com/sign-in)
- [BetterStack Monitors](https://betterstack.com/team/uptime/monitors)
- [BetterStack API Tokens](https://betterstack.com/team/settings/api-tokens)
- [BetterStack Status](https://status.betterstack.com)
