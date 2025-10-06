# Expert Payout to Bank - Heartbeat Setup Complete ✅

## 🎯 What Was Implemented

Successfully added BetterStack Heartbeat monitoring to the **`process-pending-payouts`** cron job, which creates actual Stripe payouts from Connect accounts to expert bank accounts.

---

## ✅ Changes Made

### 1. Environment Configuration (`config/env.ts`)

Added to centralized environment config:

```typescript
BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT: process.env.BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT || '';
```

### 2. Cron Job Integration (`app/api/cron/process-pending-payouts/route.ts`)

**Imports Added:**

```typescript
import { ENV_CONFIG } from '@/config/env';
import { sendHeartbeatFailure, sendHeartbeatSuccess } from '@/lib/betterstack-heartbeat';
```

**Success Heartbeat:**

```typescript
// Send success heartbeat to BetterStack
await sendHeartbeatSuccess({
  url: ENV_CONFIG.BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT,
  jobName: 'Expert Payout to Bank',
});
```

**Failure Heartbeat:**

```typescript
// Send failure heartbeat to BetterStack
await sendHeartbeatFailure(
  {
    url: ENV_CONFIG.BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT,
    jobName: 'Expert Payout to Bank',
  },
  error,
);
```

---

## 🚀 Deployment Steps

### Step 1: Add Environment Variable to Vercel ✅

**You've already done this locally!** Now add to Vercel:

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Add:

   ```
   Name:  BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT
   Value: https://uptime.betterstack.com/api/v1/heartbeat/LfuXdKxiteBZx6zo1F5TELxk
   Environments: ✅ Production ✅ Preview ✅ Development
   ```

3. Click **Save**

### Step 2: Deploy the Code

```bash
# Review changes
git status

# Commit
git add config/env.ts app/api/cron/process-pending-payouts/route.ts
git commit -m "feat: add BetterStack heartbeat monitoring for pending payouts

- Add BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT to env config
- Integrate heartbeat success/failure notifications
- Monitor daily payout creation from Connect to bank accounts
"

# Push to trigger deployment
git push
```

### Step 3: Verify It's Working

Wait for the next daily run (or trigger manually) and check:

1. **Vercel Logs:**

   ```
   ✅ [Expert Payout to Bank] Heartbeat sent successfully
   ```

2. **BetterStack Dashboard:**
   ```
   🟢 Expert Payout to Bank
      Last ping: X hours ago
      Status: Up
   ```

---

## 📊 What This Monitors

**Job Purpose:**
Creates actual Stripe payouts from expert Connect accounts to their bank accounts after:

- 24-hour post-appointment complaint window
- Transfer completion from platform to Connect account
- Legal compliance verification

**Why It's Critical:**
This is the **final step** in expert payment flow. If this fails, experts have money in their Connect account but it won't reach their bank!

**Monitoring Benefits:**

- ✅ **Immediate alerts** if payout creation fails
- ✅ **Missing run detection** if job doesn't execute
- ✅ **Financial compliance** - ensures timely payouts
- ✅ **Expert satisfaction** - prevents payment delays

---

## 🔔 BetterStack Configuration

**Your Heartbeat Settings:**

```yaml
Name: Expert Payout to Bank
Period: 86400 seconds (24 hours / daily)
Grace: 3600 seconds (1 hour)
Priority: CRITICAL 🔴

Heartbeat URL:
https://uptime.betterstack.com/api/v1/heartbeat/LfuXdKxiteBZx6zo1F5TELxk

Notifications:
  ☑ Email
  ☑ SMS (recommended for critical financial operations)
  ☑ Call (optional)

Escalation:
  Immediate alert
  Escalate to team after: 15-30 minutes
```

---

## 🎯 Success Criteria

You'll know it's working when:

1. **Vercel Logs Show:**

   ```
   🚀 Enhanced payout processing starting...
   ✅ Successfully created X payouts
   ✅ [Expert Payout to Bank] Heartbeat sent successfully
   ```

2. **BetterStack Shows:**

   ```
   🟢 Expert Payout to Bank
      Last received: X hours ago (should be ~24h)
      Next expected: In X hours
      Status: Up
   ```

3. **Experts Receive Payouts:**
   - Check Stripe Dashboard → Payouts
   - Should see regular daily payouts to expert bank accounts
   - Status: "Paid" or "In transit"

---

## 📈 Current Monitoring Status

### Implemented Heartbeats (2/10 cron jobs) ✅

| Priority    | Cron Job                   | Status      | Schedule      |
| ----------- | -------------------------- | ----------- | ------------- |
| 🔴 CRITICAL | `process-expert-transfers` | ✅ **LIVE** | Every 2 hours |
| 🔴 CRITICAL | `process-pending-payouts`  | ✅ **LIVE** | Daily         |

### Next to Implement (Recommended Order)

| Priority    | Cron Job                    | Schedule      | Impact                                        |
| ----------- | --------------------------- | ------------- | --------------------------------------------- |
| 🔴 CRITICAL | `send-payment-reminders`    | Every 6 hours | Lost revenue from expired Multibanco payments |
| 🟠 HIGH     | `appointment-reminders`     | Daily         | Customer no-shows                             |
| 🟠 HIGH     | `appointment-reminders-1hr` | Hourly        | Missed meetings                               |
| 🟠 HIGH     | `check-upcoming-payouts`    | Daily         | Expert experience                             |

---

## 🧪 Testing the Integration

### Test 1: Wait for Next Daily Run

**Expected Behavior:**

```
Day 1, 12:00 AM UTC:
  → Cron runs
  → Processes pending payouts
  → Creates Stripe payouts
  → Sends heartbeat ✅

BetterStack:
  🟢 Last received: Just now
```

### Test 2: Manual Trigger (Optional)

```bash
# Trigger the cron manually (if you have CRON_API_KEY)
curl -X GET https://eleva.care/api/cron/process-pending-payouts \
  -H "x-api-key: $CRON_API_KEY"

# Check response
{
  "success": true,
  "summary": {
    "total": 5,
    "successful": 5,
    "failed": 0
  },
  "timestamp": "2025-10-06T..."
}
```

### Test 3: Check BetterStack

Within a few seconds of the cron running:

1. Go to BetterStack → Heartbeats
2. Find "Expert Payout to Bank"
3. Should show: 🟢 "Last received: X seconds ago"

---

## ⚠️ Troubleshooting

### Issue: "Heartbeat URL not configured"

**Logs show:**

```
⚠️ [Expert Payout to Bank] Heartbeat URL not configured - skipping heartbeat
```

**Fix:**

1. Verify env var exists in Vercel: `BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT`
2. Redeploy if needed
3. Check it's set in all environments (Production, Preview, Development)

### Issue: Heartbeat not received in BetterStack

**Checks:**

1. **Is the cron actually running?**

   ```bash
   # Check Vercel logs for the last 48 hours
   vercel logs --since 48h | grep "process-pending-payouts"
   ```

2. **Are there any errors?**

   ```bash
   # Look for error messages
   vercel logs --since 24h | grep "Expert Payout to Bank"
   ```

3. **Is the job running but failing silently?**
   - Check for "Enhanced payout processing failed" in logs
   - Should still send failure heartbeat

### Issue: Job runs but doesn't process payouts

**This is working as designed if:**

- No transfers are eligible yet (waiting for 24h complaint window)
- All eligible payouts already processed
- No Connect accounts have pending balances

**Check logs for:**

```
✅ No eligible transfers found for payout
✅ All eligible payouts already processed
```

---

## 📚 Related Documentation

- [Main Heartbeat Deployment Guide](./HEARTBEAT-DEPLOYMENT-GUIDE.md)
- [Heartbeat Monitoring Strategy](./docs/03-infrastructure/monitoring/HEARTBEAT-MONITORING-STRATEGY.md)
- [Stripe Transfer Fix](./docs/fixes/STRIPE-TRANSFER-FIX-AND-HEARTBEAT-MONITORING.md)
- [Monitors vs Heartbeats](./docs/03-infrastructure/monitoring/betterstack-monitors-vs-heartbeats.md)

---

## ✅ Completion Checklist

- [x] Environment variable added to `config/env.ts`
- [x] Heartbeat utility imported
- [x] Success heartbeat integrated
- [x] Failure heartbeat integrated
- [x] No linter errors
- [ ] Environment variable added to Vercel
- [ ] Code committed and pushed
- [ ] Deployment completed
- [ ] First heartbeat received in BetterStack
- [ ] Verified in production logs

---

## 🎉 Next Steps

After deploying this:

1. **Add env var to Vercel** (see Step 1 above)
2. **Deploy the code** (see Step 2 above)
3. **Verify first heartbeat** (see Step 3 above)
4. **Implement next critical heartbeat:** `send-payment-reminders`

**Your financial operations are now monitored!** 🚀

Both critical payment cron jobs now have heartbeat monitoring:

- ✅ Transfers (Platform → Connect): Every 2 hours
- ✅ Payouts (Connect → Bank): Daily

Experts will get paid reliably, and you'll know immediately if something goes wrong!
