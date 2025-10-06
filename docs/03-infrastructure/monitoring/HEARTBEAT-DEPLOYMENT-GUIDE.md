# BetterStack Heartbeat Deployment Guide

## ✅ Implementation Complete!

Your Expert Payout Processing cron job is now integrated with BetterStack Heartbeat monitoring using production-ready best practices.

---

## 🎯 What Was Implemented

### 1. Centralized Heartbeat Utility (`lib/betterstack-heartbeat.ts`)

**Features:**

- ✅ **Resilient**: Heartbeat failures don't break the main job
- ✅ **Observable**: All attempts logged for debugging
- ✅ **Reusable**: Single utility for all cron jobs
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Timeout protection**: 5-second timeout prevents hanging

**Functions:**

```typescript
// Send success heartbeat
sendHeartbeatSuccess({ url, jobName });

// Send failure heartbeat
sendHeartbeatFailure({ url, jobName }, error);

// Automatic wrapper (recommended)
withHeartbeat({ url, jobName }, async () => {
  // Your job logic
});
```

### 2. Environment Configuration (`config/env.ts`)

Added to centralized config:

```typescript
BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT: process.env.BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT || '';
BETTERSTACK_TASKS_HEARTBEAT: process.env.BETTERSTACK_TASKS_HEARTBEAT || '';
```

### 3. Cron Job Integration (`app/api/cron/process-expert-transfers/route.ts`)

**Success Flow:**

```typescript
// After successful processing
await sendHeartbeatSuccess({
  url: ENV_CONFIG.BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT,
  jobName: 'Expert Payout Processing',
});
return NextResponse.json({ success: true, summary });
```

**Failure Flow:**

```typescript
// In catch block
await sendHeartbeatFailure({
  url: ENV_CONFIG.BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT,
  jobName: 'Expert Payout Processing',
}, error);
return NextResponse.json({ error: '...' }, { status: 500 });
```

---

## 🚀 Deployment Steps

### Step 1: Add Environment Variable to Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Add new variable:

   ```
   Name:  BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT
   Value: https://uptime.betterstack.com/api/v1/heartbeat/5JQa6JD74ZgvDj1yrDy2oDJt
   Environment: Production, Preview, Development (select all)
   ```

3. Click **Save**

### Step 2: Deploy the Code

```bash
# Review changes
git status

# Commit
git add lib/betterstack-heartbeat.ts \
        config/env.ts \
        app/api/cron/process-expert-transfers/route.ts \
        docs/fixes/STRIPE-TRANSFER-FIX-AND-HEARTBEAT-MONITORING.md

git commit -m "feat: add BetterStack heartbeat monitoring for expert payout processing

- Create centralized heartbeat utility with resilience patterns
- Add environment config for heartbeat URLs
- Integrate success/failure heartbeat notifications
- Fix Stripe transfer issue (use Charge ID instead of PaymentIntent ID)
"

# Push to trigger deployment
git push
```

### Step 3: Verify Deployment

Wait for Vercel deployment to complete (2-3 minutes), then verify:

```bash
# Check Vercel logs
vercel logs --app eleva-care-app

# Look for:
# ✅ "Expert Payout Processing" starting
# ✅ "Heartbeat sent successfully"
```

### Step 4: Verify Heartbeat Reception

1. **Manually trigger the cron** (if possible):

   ```bash
   curl -X GET https://eleva.care/api/cron/process-expert-transfers \
     -H "x-api-key: $CRON_SECRET"
   ```

2. **Check BetterStack Dashboard:**
   - Go to **Heartbeats** → **Expert Payout Processing**
   - Should show: 🟢 "Last received: X seconds ago"

3. **Check Vercel Logs:**
   ```
   ✅ [Expert Payout Processing] Heartbeat sent successfully
   ```

---

## 📊 What You'll See in BetterStack

### Success Scenario

```
Your Cron Schedule:
5:00 AM: Cron runs → Processes transfers → ✅ Heartbeat sent
7:00 AM: Cron runs → Processes transfers → ✅ Heartbeat sent
9:00 AM: Cron runs → Processes transfers → ✅ Heartbeat sent

BetterStack Dashboard:
🟢 Expert Payout Processing
   Last ping: 2 hours ago
   Status: Up
   Next expected: 2 hours from now
```

### Failure Scenario (Job doesn't run)

```
5:00 AM: Cron runs → ✅ Heartbeat sent
7:00 AM: Cron FAILS to run → ❌ No heartbeat

BetterStack waits: Period (2h) + Grace (10m) = 2h 10m

9:10 AM: No heartbeat received!
🔴 ALERT TRIGGERED!
   → Email sent to team
   → SMS sent
   → Call initiated
   → Status page shows incident
```

### Error Scenario (Job runs but fails)

```
5:00 AM: Cron runs → Error occurs → 🚨 Sends /fail heartbeat

BetterStack:
🔴 IMMEDIATE ALERT!
   Expert Payout Processing reported failure
   Error: "No such charge: pi_xxx"
   Timestamp: 2025-10-06 05:00:04
```

---

## 🧪 Testing the Integration

### Test 1: Success Path (Wait for next scheduled run)

**Expected:**

- Cron runs successfully
- Vercel logs show: `✅ [Expert Payout Processing] Heartbeat sent successfully`
- BetterStack shows: 🟢 Last received: X minutes ago

### Test 2: Manual Trigger (Optional)

```bash
# Trigger manually via API
curl -X GET https://eleva.care/api/cron/process-expert-transfers \
  -H "x-api-key: YOUR_CRON_SECRET"

# Check response
{
  "success": true,
  "summary": {
    "total": 5,
    "successful": 5,
    "failed": 0,
    ...
  }
}
```

### Test 3: Failure Detection (Simulate)

To test failure handling, temporarily break something:

```typescript
// In route.ts (TEMPORARY - for testing only)
export async function GET(request: Request) {
  // Add this temporarily
  throw new Error('Test failure for heartbeat monitoring');

  // ... rest of code
}
```

**Expected:**

- Job fails immediately
- Heartbeat failure sent: `🚨 [Expert Payout Processing] Failure heartbeat sent`
- BetterStack: 🔴 Immediate alert with error details
- **Remember to remove the test error!**

---

## 📱 BetterStack Alert Configuration

Your heartbeat in BetterStack is configured to:

```yaml
Name: Expert Payout Processing
Period: 7200 seconds (2 hours)
Grace Period: 600 seconds (10 minutes)
Expected: Every 2 hours

Notifications: ☑ Email
  ☑ SMS
  ☑ Call

Alert Timing:
  - Missing heartbeat: Alert after 2h 10m
  - Failure heartbeat: Immediate alert
  - Escalation: After 30 minutes
```

---

## 🔧 Troubleshooting

### Issue: "Heartbeat URL not configured - skipping heartbeat"

**Cause:** Environment variable not set in Vercel

**Fix:**

1. Go to Vercel → Settings → Environment Variables
2. Add `BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT`
3. Redeploy

### Issue: "Failed to send heartbeat: AbortError"

**Cause:** BetterStack API timeout (>5 seconds)

**Fix:** This is handled gracefully - the job will continue even if heartbeat fails. Check BetterStack status.

### Issue: No heartbeats received in BetterStack

**Checks:**

1. Is the cron job actually running?

   ```bash
   # Check Vercel cron logs
   vercel logs --since 2h
   ```

2. Is the environment variable set correctly?

   ```bash
   # Check in Vercel dashboard or
   curl https://eleva.care/api/healthcheck?detailed=true | jq '.config'
   ```

3. Is BetterStack having issues?
   - Check https://betterstack.com/status

---

## 🎯 Monitoring Best Practices

### 1. Log Everything

The utility logs all attempts:

```
✅ [Expert Payout Processing] Heartbeat sent successfully
🚨 [Expert Payout Processing] Failure heartbeat sent successfully
❌ [Expert Payout Processing] Failed to send heartbeat: timeout
```

### 2. Don't Let Heartbeats Break Your Job

The implementation ensures heartbeat failures never break the main job:

```typescript
try {
  await sendHeartbeatSuccess(...);
} catch (error) {
  // Error logged but not thrown
  // Job continues normally
}
```

### 3. Monitor the Monitors

Set up alerts in BetterStack for:

- ✅ Heartbeat not received (automatic)
- ✅ Heartbeat failure reported (automatic)
- ✅ Repeated failures over time (create custom alert)

---

## 📚 Related Files

```
Core Implementation:
  lib/betterstack-heartbeat.ts           - Reusable heartbeat utility
  config/env.ts                          - Environment configuration
  app/api/cron/process-expert-transfers/route.ts - Cron job with heartbeat

Documentation:
  docs/fixes/STRIPE-TRANSFER-FIX-AND-HEARTBEAT-MONITORING.md - Complete guide
  docs/03-infrastructure/monitoring/betterstack-monitors-vs-heartbeats.md

Environment:
  Vercel Dashboard → Environment Variables
```

---

## ✅ Deployment Checklist

- [ ] Code changes committed and pushed
- [ ] Environment variable added to Vercel
- [ ] Deployment completed successfully
- [ ] Cron job runs (wait for next scheduled time or trigger manually)
- [ ] Heartbeat received in BetterStack (🟢 shows "Last received")
- [ ] Vercel logs show success message
- [ ] Test failure scenario (optional but recommended)
- [ ] Document cron schedule for team

---

## 🎉 Success Criteria

You'll know everything is working when:

1. ✅ **Vercel Logs Show:**

   ```
   🚀 [Expert Payout Processing] Starting job...
   ✅ [Expert Payout Processing] Heartbeat sent successfully
   ```

2. ✅ **BetterStack Shows:**

   ```
   🟢 Expert Payout Processing
      Last ping: 2 hours ago
      Status: Up
   ```

3. ✅ **Experts Receive Payouts:**
   - Check Stripe Dashboard → Transfers
   - All show "Succeeded" status
   - No more 400 errors

---

## 🚀 Next Steps

### Optional: Add Heartbeat to Other Cron Jobs

Use the same pattern for other scheduled tasks:

```typescript
// app/api/cron/process-tasks/route.ts
import { ENV_CONFIG } from '@/config/env';
import { sendHeartbeatFailure, sendHeartbeatSuccess } from '@/lib/betterstack-heartbeat';

export async function GET(request: Request) {
  try {
    // ... your job logic ...

    await sendHeartbeatSuccess({
      url: ENV_CONFIG.BETTERSTACK_TASKS_HEARTBEAT,
      jobName: 'Scheduled Tasks Processing',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    await sendHeartbeatFailure(
      {
        url: ENV_CONFIG.BETTERSTACK_TASKS_HEARTBEAT,
        jobName: 'Scheduled Tasks Processing',
      },
      error,
    );

    throw error;
  }
}
```

---

**Your Expert Payout Processing cron job now has production-grade monitoring!** 🎉

Any questions? Check the comprehensive guide in `docs/fixes/STRIPE-TRANSFER-FIX-AND-HEARTBEAT-MONITORING.md`
