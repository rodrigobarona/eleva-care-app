# Stripe Transfer Fix & Heartbeat Monitoring Setup

## 🚨 Critical Issue Fixed

**Problem:** Stripe Connect expert payouts were failing with error:  
`No such charge: 'pi_3SC2LiK5Ap4Um3Sp0mZCTbIj'`

**Impact:** Experts weren't receiving their payouts!

---

## 🔍 Root Cause Analysis

### The Error

```json
{
  "error": {
    "code": "resource_missing",
    "message": "No such charge: 'pi_3SC2LiK5Ap4Um3Sp0mZCTbIj'",
    "param": "source_transaction",
    "type": "invalid_request_error"
  }
}
```

### What Was Wrong

The code was using a **PaymentIntent ID** (`pi_...`) as the `source_transaction` when creating Stripe transfers:

```typescript
// ❌ WRONG
const stripeTransfer = await stripe.transfers.create({
  amount: 5950,
  currency: 'eur',
  destination: 'acct_1R2634GbopiCXJgJ',
  source_transaction: transfer.paymentIntentId, // ❌ pi_3SC2LiK5Ap4Um3Sp0mZCTbIj
});

// Stripe expects a CHARGE ID (ch_xxx), not a PaymentIntent ID (pi_xxx)!
```

### Why This Failed

1. **PaymentIntent** (`pi_xxx`) is a higher-level object representing the payment flow
2. **Charge** (`ch_xxx`) is the actual transaction that moves money
3. Stripe `transfers.create()` requires the **Charge ID** as `source_transaction`
4. A PaymentIntent can have multiple charges (if retries happen), so you need to get the `latest_charge`

---

## ✅ The Fix

### Files Modified

1. `/app/api/cron/process-expert-transfers/route.ts` (lines 233-256)
2. `/app/api/cron/process-tasks/route.ts` (lines 136-159)

### Code Change

**Before:**

```typescript
const stripeTransfer = await stripe.transfers.create({
  amount: transfer.amount,
  currency: transfer.currency,
  destination: transfer.expertConnectAccountId,
  source_transaction: transfer.paymentIntentId, // ❌ PaymentIntent ID
});
```

**After:**

```typescript
// Retrieve the PaymentIntent to get the charge ID
const paymentIntent = await stripe.paymentIntents.retrieve(transfer.paymentIntentId);

if (!paymentIntent.latest_charge) {
  throw new Error(
    `PaymentIntent ${transfer.paymentIntentId} has no charge. Status: ${paymentIntent.status}`,
  );
}

// Get the charge ID (latest_charge can be a string ID or a Charge object)
const chargeId =
  typeof paymentIntent.latest_charge === 'string'
    ? paymentIntent.latest_charge
    : paymentIntent.latest_charge.id;

console.log(`Using charge ID ${chargeId} for transfer`);

// Create transfer with the CHARGE ID
const stripeTransfer = await stripe.transfers.create({
  amount: transfer.amount,
  currency: transfer.currency,
  destination: transfer.expertConnectAccountId,
  source_transaction: chargeId, // ✅ Charge ID
  metadata: {
    /* ... */
  },
});
```

### What Changed

1. ✅ Retrieve the full PaymentIntent object
2. ✅ Extract the `latest_charge` (the actual charge ID)
3. ✅ Handle both string IDs and Charge objects
4. ✅ Add error handling if no charge exists
5. ✅ Use the correct Charge ID for the transfer

---

## 🧪 Testing the Fix

### 1. Test Locally (If Possible)

```bash
# Run the cron job manually
curl -X GET http://localhost:3000/api/cron/process-expert-transfers \
  -H "Authorization: Bearer $CRON_SECRET"

# Check logs for:
# ✅ "Using charge ID ch_xxx for transfer"
# ✅ "Successfully transferred..."
# ❌ No "resource_missing" errors
```

### 2. Test in Production

Wait for the next scheduled run (5:00 AM, 7:00 AM, etc.) and check:

1. **Stripe Dashboard → Logs:**
   - Should see successful `POST /v1/transfers` with 200 status
   - No more 400 errors

2. **Vercel Logs:**
   - Look for "Using charge ID ch_xxx for transfer"
   - Look for "Successfully transferred..."

3. **Database:**
   ```sql
   SELECT * FROM payment_transfers
   WHERE status = 'completed'
   AND updated > NOW() - INTERVAL '1 day';
   ```

---

## 💓 Adding Heartbeat Monitoring

Now that you've discovered these **scheduled cron jobs**, they're **perfect candidates for Heartbeat monitoring**!

### Why Use Heartbeats Here?

Your cron jobs run on a **schedule**:

- ✅ `process-expert-transfers` - Runs every 2 hours
- ✅ `process-tasks` - Runs on schedule

If they fail to run, you won't know unless you check logs manually. **Heartbeats solve this!**

---

## 🔧 Setting Up Heartbeats

### Step 1: Create Heartbeats in BetterStack

**Via Dashboard:**

1. Go to BetterStack → **Heartbeats** → **Create Heartbeat**

2. **For Expert Transfers Cron:**

   ```
   Name: Expert Payout Processing
   Period: 7200 seconds (2 hours)
   Grace: 600 seconds (10 minutes)

   Notifications:
   ☑ Email
   ☑ SMS (critical!)
   ☑ Call (critical!)

   Escalation:
   Escalate to team after: 30 minutes
   ```

3. **For Process Tasks Cron:**

   ```
   Name: Scheduled Tasks Processing
   Period: 3600 seconds (1 hour) // Adjust to your schedule
   Grace: 300 seconds (5 minutes)

   Notifications:
   ☑ Email
   ☑ Push

   Escalation:
   Escalate to team after: 15 minutes
   ```

4. Copy the generated heartbeat URLs

### Step 2: Add Environment Variables

Add to Vercel:

```bash
BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT="https://uptime.betterstack.com/api/v1/heartbeat/abc123..."
BETTERSTACK_TASKS_HEARTBEAT="https://uptime.betterstack.com/api/v1/heartbeat/def456..."
```

### Step 3: Update Cron Jobs

**For `process-expert-transfers/route.ts`:**

```typescript
// At the top of the file
const BETTERSTACK_HEARTBEAT_URL = process.env.BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT;

export async function GET(request: NextRequest) {
  try {
    // ... existing code ...

    // At the END of successful processing
    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failureCount = results.filter((r) => r.status === 'rejected').length;

    // Notify BetterStack heartbeat
    if (BETTERSTACK_HEARTBEAT_URL) {
      try {
        await fetch(BETTERSTACK_HEARTBEAT_URL);
        console.log('✅ Heartbeat sent to BetterStack');
      } catch (heartbeatError) {
        console.error('Failed to send heartbeat:', heartbeatError);
        // Don't fail the whole job if heartbeat fails
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: successCount,
      failed: failureCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Critical error in expert transfers processing:', error);

    // Report failure to BetterStack
    if (BETTERSTACK_HEARTBEAT_URL) {
      try {
        await fetch(`${BETTERSTACK_HEARTBEAT_URL}/fail`, {
          method: 'POST',
          body: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (heartbeatError) {
        console.error('Failed to send failure heartbeat:', heartbeatError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
```

**For `process-tasks/route.ts`:** (Same pattern)

```typescript
// At the top
const BETTERSTACK_HEARTBEAT_URL = process.env.BETTERSTACK_TASKS_HEARTBEAT;

// At the end of successful processing
if (BETTERSTACK_HEARTBEAT_URL) {
  await fetch(BETTERSTACK_HEARTBEAT_URL);
}

// In catch block for failures
if (BETTERSTACK_HEARTBEAT_URL) {
  await fetch(`${BETTERSTACK_HEARTBEAT_URL}/fail`, {
    method: 'POST',
    body: JSON.stringify({ error: error.message }),
  });
}
```

---

## 📊 What You'll Get with Heartbeats

### Success Scenario

```
5:00 AM: Cron runs → Processes transfers → Sends heartbeat ✅
7:00 AM: Cron runs → Processes transfers → Sends heartbeat ✅
9:00 AM: Cron runs → Processes transfers → Sends heartbeat ✅

BetterStack: 🟢 All good!
```

### Failure Scenario

```
5:00 AM: Cron runs → Processes transfers → Sends heartbeat ✅
7:00 AM: Cron FAILS → No heartbeat sent ❌

BetterStack waits for: Period (2h) + Grace (10m) = 2h 10m

9:10 AM: No heartbeat received!
BetterStack: 🔴 ALERT! "Expert Payout Processing failed"
         → Email sent
         → SMS sent
         → Call initiated
```

### Error Detection

```
5:00 AM: Cron runs → Stripe error → Sends /fail heartbeat ❌

BetterStack: 🔴 IMMEDIATE ALERT!
         "Expert Payout Processing reported failure"
         Error: "No such charge: pi_xxx"
```

---

## 🎯 Complete BetterStack Setup

### Monitors (What You Already Have) ✅

```yaml
Core Platform: ✅ System Health - /api/healthcheck?services=true
  ✅ Primary Database (Neon) - /api/health/neon-database

Authentication & Security: ✅ User Authentication (Clerk) - /api/health/clerk
  ✅ Payment Processing (Stripe) - /api/health/stripe

Infrastructure: ✅ Application Cache (Redis) - /api/health/upstash-redis
  ✅ Background Jobs (QStash) - /api/health/upstash-qstash
  ✅ Hosting Platform (Vercel) - /api/health/vercel

Communication: ✅ Email Delivery (Resend) - /api/health/resend
  ✅ Push Notifications (Novu) - /api/health/novu

Analytics: ✅ Usage Analytics (PostHog) - /api/health/posthog
```

### Heartbeats (Add These) 🆕

```yaml
Scheduled Tasks:
  🆕 Expert Payout Processing
     Period: 2 hours
     Grace: 10 minutes
     Priority: CRITICAL 🔴

  🆕 Scheduled Tasks Processing
     Period: 1 hour
     Grace: 5 minutes
     Priority: HIGH 🟠
```

---

## 🚀 Deployment Checklist

- [ ] Review the code changes
- [ ] Test locally (if possible)
- [ ] Commit changes
- [ ] Deploy to production
- [ ] Wait for next cron run
- [ ] Check Stripe Dashboard for success
- [ ] Create BetterStack Heartbeats
- [ ] Add environment variables to Vercel
- [ ] Update cron code to send heartbeats
- [ ] Deploy heartbeat changes
- [ ] Verify heartbeats are received

---

## 📝 Monitoring Dashboard

After setup, your BetterStack dashboard will show:

```
🟢 Monitors (Active Checks):
   ✅ System Health
   ✅ 9 Service Health Checks

💓 Heartbeats (Passive Checks):
   ✅ Expert Payout Processing (last ping: 2 min ago)
   ✅ Scheduled Tasks Processing (last ping: 15 min ago)
```

---

## 🎓 Key Learnings

### 1. PaymentIntent vs Charge

- **PaymentIntent** = Intent to pay (can have multiple attempts)
- **Charge** = Actual transaction (one per successful payment)
- Transfers need the **Charge ID**, not PaymentIntent ID

### 2. When to Use Heartbeats

- ✅ Scheduled cron jobs
- ✅ Background batch processing
- ✅ Periodic data synchronization
- ❌ Event-driven webhooks (use provider monitoring)
- ❌ API endpoints (use monitors)

### 3. Error Handling in Cron Jobs

- Always retrieve full objects when needed (don't assume IDs work everywhere)
- Add validation before external API calls
- Log detailed information for debugging
- Notify monitoring systems of both success and failure

---

## 🔗 Related Documentation

- [Stripe Transfers API](https://stripe.com/docs/api/transfers)
- [Stripe Connect Payouts](https://stripe.com/docs/connect/payouts)
- [BetterStack Heartbeats](https://betterstack.com/docs/uptime/cron-and-heartbeat-monitor)
- [Monitors vs Heartbeats Guide](../03-infrastructure/monitoring/betterstack-monitors-vs-heartbeats.md)

---

## ✅ Summary

**Problem:** Using PaymentIntent ID instead of Charge ID for Stripe transfers  
**Fix:** Retrieve PaymentIntent, extract Charge ID, use for transfer  
**Files Changed:** 2 cron job files  
**Bonus:** Discovered cron jobs are perfect for Heartbeat monitoring  
**Next Step:** Deploy fix + Set up Heartbeats for cron job monitoring

**Your experts will now get their payouts, and you'll know immediately if something goes wrong!** 🎉
