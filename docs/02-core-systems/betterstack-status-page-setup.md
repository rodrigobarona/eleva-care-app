# BetterStack Status Page Setup Guide

## Overview

The **ServerStatus** component in the footer displays real-time uptime status from BetterStack, providing transparency about service health to users. This guide explains how to configure the status page integration.

## What You'll See

When properly configured, the footer displays a **status indicator** with:

- 🟢 **Green**: All systems operational
- 🟠 **Orange**: Partial outage (some monitors down)
- 🔴 **Red**: Degraded performance (major issues)
- ⚪ **Gray**: Unable to fetch status

Clicking the indicator opens your public BetterStack status page.

## Prerequisites

- BetterStack account with Uptime monitoring enabled
- At least one monitor configured in BetterStack
- API token with "Read Monitors" permission

## Step 1: Create Monitors in BetterStack

### 1.1 Log in to BetterStack

Go to https://betterstack.com and log in to your account.

### 1.2 Create Your First Monitor

1. Navigate to **Uptime** → **Monitors**
2. Click **"Create Monitor"**
3. Configure your monitor:
   - **Type**: Website (HTTP/HTTPS)
   - **URL**: `https://eleva.care` (or your domain)
   - **Name**: "Eleva Care Production"
   - **Check Frequency**: 60 seconds (recommended)
   - **Regions**: Select multiple regions (US, EU, Asia)

### 1.3 Recommended Monitors

For comprehensive coverage, create monitors for:

| Monitor Name       | URL                                  | Priority |
| ------------------ | ------------------------------------ | -------- |
| Production Website | `https://eleva.care`                 | Critical |
| API Health         | `https://eleva.care/api/healthcheck` | Critical |
| Database           | (handled by health endpoint)         | High     |
| Stripe Webhooks    | (handled by health endpoint)         | High     |

## Step 2: Get Your BetterStack API Token

### 2.1 Navigate to API Tokens

1. Go to **Settings** → **API Tokens**
2. Click **"Create API Token"**

### 2.2 Configure Token Permissions

- **Name**: "Eleva Care Status Page"
- **Permissions**: Check **"Read Monitors"** only
- **Expiration**: Set to "Never" or choose your policy
- Click **"Create Token"**

### 2.3 Copy Your Token

```bash
# Example token format
btok_abc123def456ghi789jkl012mno345pqr678
```

**⚠️ Important**: Copy this token immediately. BetterStack only shows it once!

## Step 3: Configure Environment Variables

### 3.1 Add to Your `.env` File

Add these two environment variables to your `.env` file:

```bash
# BetterStack Status Page Configuration
# ------------------------------------
# API key for fetching monitor status (for Footer ServerStatus component)
BETTERSTACK_API_KEY="btok_your_actual_token_here"

# Public status page URL (e.g., https://status.eleva.care)
BETTERSTACK_URL="https://status.eleva.care"
```

### 3.2 Create a Status Page (Optional but Recommended)

If you want a public status page:

1. Go to **Status Pages** in BetterStack
2. Click **"Create Status Page"**
3. Configure:
   - **Domain**: `status.eleva.care` (or use BetterStack subdomain)
   - **Name**: "Eleva Care Status"
   - **Monitors**: Select which monitors to display
4. Copy the URL and use it for `BETTERSTACK_URL`

**Alternative**: If you don't have a custom status page, use your BetterStack default URL:

```bash
BETTERSTACK_URL="https://elevacafedfsfre.betteruptime.com"
```

### 3.3 Verify Configuration

Run this command to test your setup:

```bash
curl -H "Authorization: Bearer $BETTERSTACK_API_KEY" \
  https://uptime.betterstack.com/api/v2/monitors
```

Expected response:

```json
{
  "data": [
    {
      "id": "123456",
      "type": "monitor",
      "attributes": {
        "pronounceable_name": "Eleva Care Production",
        "status": "up",
        "url": "https://eleva.care"
      }
    }
  ]
}
```

## Step 4: Deploy and Verify

### 4.1 Add to Vercel Environment Variables

If deploying to Vercel:

```bash
# Add via CLI
vercel env add BETTERSTACK_API_KEY
# Paste your token when prompted

vercel env add BETTERSTACK_URL
# Enter: https://status.eleva.care
```

Or via **Vercel Dashboard**:

1. Go to your project → **Settings** → **Environment Variables**
2. Add `BETTERSTACK_API_KEY` (Secret)
3. Add `BETTERSTACK_URL` (Plain text, it's public anyway)

### 4.2 Restart Your Development Server

```bash
# Stop your server (Ctrl+C)
pnpm dev
```

### 4.3 Verify the Component Appears

1. Open your app in a browser
2. Scroll to the footer
3. You should see the status indicator near the compliance badges
4. Click it to verify it opens your status page

## Component Architecture

### File Structure

```
components/atoms/ServerStatus.tsx      # Server Component
config/betterstack.ts                  # Configuration
config/env.ts                          # Environment validation
types/betterstack.ts                   # TypeScript types
components/organisms/Footer.tsx        # Integration point
```

### How It Works

```typescript
// ServerStatus.tsx (simplified)
export async function ServerStatus() {
  const t = await getTranslations('status');

  // Returns null if not configured (graceful degradation)
  if (!betterstackConfig.apiKey || !betterstackConfig.statusPageUrl) {
    return null;
  }

  // Fetch from BetterStack API (server-side only)
  const response = await fetch(betterstackConfig.apiEndpoint, {
    headers: { Authorization: `Bearer ${betterstackConfig.apiKey}` },
    next: { revalidate: 180 } // Cache for 3 minutes
  });

  // Calculate status from monitors
  const upMonitors = data.filter(m => m.attributes.status === 'up').length;
  const status = upMonitors / totalMonitors;

  return (
    <a href={betterstackConfig.statusPageUrl}>
      <StatusIndicator color={statusColor} />
      <span>{statusLabel}</span>
    </a>
  );
}
```

### Security Features

- ✅ **API Key Never Exposed**: Component runs server-side only
- ✅ **Secure Fetch**: Uses Next.js 15 native fetch with caching
- ✅ **Graceful Degradation**: Returns null if not configured
- ✅ **Type-Safe**: Full TypeScript support

## Translations

The component supports all 4 locales:

| Status  | EN                     | ES                            | PT                              | BR                              |
| ------- | ---------------------- | ----------------------------- | ------------------------------- | ------------------------------- |
| All Up  | All systems normal     | Todos los sistemas normales   | Todos os sistemas normais       | Todos os sistemas normais       |
| Partial | Partial outage         | Interrupción parcial          | Interrupção parcial             | Interrupção parcial             |
| Down    | Degraded performance   | Rendimiento degradado         | Desempenho degradado            | Desempenho degradado            |
| Unknown | Unable to fetch status | No se puede obtener el estado | Não foi possível obter o estado | Não foi possível obter o status |

## Troubleshooting

### Issue: Status Not Appearing in Footer

**Cause**: Missing environment variables

**Solution**:

1. Check `.env` file has both `BETTERSTACK_API_KEY` and `BETTERSTACK_URL`
2. Restart your development server
3. Check browser console for errors

### Issue: "Unable to fetch status"

**Causes**:

- Invalid API token
- Network issues
- BetterStack API outage

**Solution**:

```bash
# Test API token manually
curl -H "Authorization: Bearer $BETTERSTACK_API_KEY" \
  https://uptime.betterstack.com/api/v2/monitors

# Check BetterStack status
open https://status.betterstack.com
```

### Issue: Wrong Status Displayed

**Cause**: Cached data (updates every 3 minutes)

**Solution**: Wait up to 3 minutes for cache to refresh, or force revalidate:

```bash
# Clear Next.js cache
rm -rf .next
pnpm dev
```

### Issue: Status Shows Gray (Unknown)

**Causes**:

- No monitors configured in BetterStack
- API returned unexpected response
- Network timeout

**Solution**:

1. Verify monitors exist in BetterStack dashboard
2. Check server logs for error details
3. Verify API token has "Read Monitors" permission

## Validation

Use the built-in validator:

```typescript
import { ENV_VALIDATORS } from '@/config/env';

const validation = ENV_VALIDATORS.betterstackStatus();

if (!validation.isValid) {
  console.warn(validation.message);
  console.warn('Missing:', validation.missingVars);
}
```

Output when missing:

```
Missing BetterStack Status Page environment variables: BETTERSTACK_API_KEY, BETTERSTACK_URL. Status indicator will not be displayed.
Missing: ['BETTERSTACK_API_KEY', 'BETTERSTACK_URL']
```

## Best Practices

### 1. Monitor Coverage

Create monitors for all critical endpoints:

- ✅ Main website
- ✅ API health endpoint
- ✅ Payment webhooks
- ✅ Database connectivity

### 2. Alert Configuration

Set up alerts in BetterStack:

- **Email**: For all downtime events
- **Slack**: For critical services
- **SMS**: For extended outages (> 5 minutes)

### 3. Check Frequency

- **Production**: 60 seconds
- **Staging**: 5 minutes
- **Development**: Not monitored

### 4. Status Page

Keep your status page updated:

- ✅ Link to it from footer (done automatically)
- ✅ Share it in incident communications
- ✅ Include in SLA documentation

### 5. Security

- 🔒 **API Key**: Keep it secret, rotate it periodically
- 🔒 **Read-Only**: Only grant "Read Monitors" permission
- 🔒 **Environment**: Never commit to Git
- 🔒 **Access**: Limit team access to API tokens

## Monitoring Costs

**BetterStack Pricing** (as of 2025):

| Plan       | Monitors  | Checks/month | Price  | Recommendation |
| ---------- | --------- | ------------ | ------ | -------------- |
| Free       | 10        | Unlimited    | $0     | ✅ Development |
| Basic      | 20        | Unlimited    | $18/mo | ✅ Startup     |
| Pro        | 50        | Unlimited    | $42/mo | Production     |
| Enterprise | Unlimited | Unlimited    | Custom | Scale          |

**Recommendation**: Start with **Basic plan** ($18/mo) which includes:

- ✅ 20 monitors (more than enough for Eleva Care)
- ✅ Unlimited checks
- ✅ Status pages
- ✅ Incident management
- ✅ API access

## Related Documentation

- [BetterStack Heartbeat Setup](./betterstack-setup-guide.md) - Cron job monitoring
- [BetterStack Heartbeat Monitoring](./betterstack-heartbeat-monitoring.md) - Detailed guide
- [Server/Client Composition](../04-development/server-client-composition.md) - Architecture patterns
- [BetterStack API Documentation](https://betterstack.com/docs/uptime/api)

## Summary Checklist

Before going live, ensure:

- [ ] BetterStack account created
- [ ] At least 3 monitors configured (website, API, health)
- [ ] API token created with "Read Monitors" permission
- [ ] `BETTERSTACK_API_KEY` added to `.env`
- [ ] `BETTERSTACK_URL` added to `.env`
- [ ] Status page created (or using default BetterStack URL)
- [ ] Environment variables added to Vercel
- [ ] Status indicator visible in footer
- [ ] Clicking indicator opens status page
- [ ] All monitors showing "Up" status
- [ ] Alert notifications configured
- [ ] Team members have access to BetterStack dashboard

## Support

If you encounter issues:

1. **Check BetterStack Status**: https://status.betterstack.com
2. **Review Logs**: Check server console for errors
3. **Test API**: Use curl to verify token works
4. **Contact Support**: support@betterstack.com
5. **Community**: BetterStack Discord or GitHub discussions

---

**Status**: ✅ Component is implemented and ready to use
**Last Updated**: 2025-10-28
**Maintainer**: Eleva Care Engineering Team
