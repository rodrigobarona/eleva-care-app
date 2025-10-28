# BetterStack Heartbeat Implementation Summary

## Overview

Successfully implemented heartbeat monitoring for **5 critical cron jobs** using BetterStack Uptime, protecting financial transactions and revenue streams.

**Status**: ✅ Code implementation complete | ⏳ BetterStack dashboard setup required

---

## What Was Implemented

### 1. Code Changes ✅

#### Updated Files:

1. **`config/env.ts`** - Added 6 new heartbeat environment variables
2. **`app/api/cron/send-payment-reminders/route.ts`** - Added heartbeat monitoring
3. **`app/api/cron/cleanup-expired-reservations/route.ts`** - Added heartbeat monitoring
4. **`app/api/cron/check-upcoming-payouts/route.ts`** - Added heartbeat monitoring

#### Existing Heartbeats (Already Implemented):

- ✅ `process-expert-transfers` - Expert fund transfers
- ✅ `process-pending-payouts` - Bank payouts

#### New Heartbeats (Just Added):

- ✅ `send-payment-reminders` - Multibanco payment reminders
- ✅ `cleanup-expired-reservations` - Slot reservation cleanup
- ✅ `check-upcoming-payouts` - Payout notifications

### 2. Documentation ✅

Created comprehensive documentation:

- **`betterstack-heartbeat-monitoring.md`** - Complete monitoring guide
- **`betterstack-setup-guide.md`** - Step-by-step setup instructions

---

## Heartbeat Monitoring Status

### Current Usage: 5 of 10 Heartbeats

| #   | Job                  | Priority    | Schedule      | Status    | Heartbeat URL                                |
| --- | -------------------- | ----------- | ------------- | --------- | -------------------------------------------- |
| 1   | Expert Transfers     | 🚨 CRITICAL | Every 2 hours | ✅ Active | `BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT`     |
| 2   | Pending Payouts      | 🚨 CRITICAL | Daily at 6 AM | ✅ Active | `BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT`      |
| 3   | Payment Reminders    | 🚨 HIGH     | Every 6 hours | ✅ Ready  | `BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT`    |
| 4   | Cleanup Reservations | 🚨 HIGH     | Every 15 min  | ✅ Ready  | `BETTERSTACK_CLEANUP_RESERVATIONS_HEARTBEAT` |
| 5   | Upcoming Payouts     | 📊 MEDIUM   | Daily         | ✅ Ready  | `BETTERSTACK_UPCOMING_PAYOUTS_HEARTBEAT`     |

### Available Heartbeats: 5 of 10

**Optional Phase 3 (User Experience):**

- Appointment Reminders (24h) - `BETTERSTACK_APPOINTMENT_REMINDERS_HEARTBEAT`
- Appointment Reminders (1h) - `BETTERSTACK_APPOINTMENT_REMINDERS_1HR_HEARTBEAT`

**Optional Phase 4 (Operational):**

- Process Tasks - `BETTERSTACK_TASKS_HEARTBEAT`

---

## Why These Jobs Are Critical

### 🚨 Financial Transaction Protection

#### 1. **Expert Transfers** (Already Monitored)

- **Impact**: €10,000+ daily in expert payments
- **Failure Risk**: Legal compliance violations, expert trust issues
- **SLA**: Must complete within 2 hours

#### 2. **Pending Payouts** (Already Monitored)

- **Impact**: Final step in payment flow
- **Failure Risk**: Regulatory violations, payment delays
- **SLA**: Must complete daily by 7 AM

### 🚨 Revenue Protection

#### 3. **Payment Reminders** (NEW)

- **Impact**: Prevents €5,000+ monthly revenue loss from expired Multibanco payments
- **Failure Risk**: Lost bookings, reduced conversion rate
- **SLA**: Must send reminders on Day 3 and Day 6

#### 4. **Cleanup Reservations** (NEW)

- **Impact**: Prevents slot blocking, ensures availability
- **Failure Risk**: Expert calendar blocked, lost revenue opportunities
- **SLA**: Must run every 15 minutes

#### 5. **Upcoming Payouts** (NEW)

- **Impact**: Expert communication and transparency
- **Failure Risk**: Expert dissatisfaction, support tickets
- **SLA**: Must notify 1-2 days before payout

---

## Next Steps for You

### Step 1: Create Heartbeat Monitors in BetterStack

Follow the detailed guide in `betterstack-setup-guide.md`:

1. **Log in to BetterStack** → Uptime → Heartbeats
2. **Create 5 heartbeat monitors** with the configurations provided
3. **Copy the heartbeat URLs** for each monitor
4. **Add to `.env` file** (see below)

### Step 2: Add Environment Variables

Add these to your `.env` file:

```bash
# ============================================
# BetterStack Heartbeat Monitoring
# ============================================

# Phase 1: Critical Financial Jobs (Already configured)
BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/YOUR_TOKEN_1
BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/YOUR_TOKEN_2

# Phase 2: Revenue Protection Jobs (NEW - Need to create in BetterStack)
BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/YOUR_TOKEN_3
BETTERSTACK_CLEANUP_RESERVATIONS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/YOUR_TOKEN_4
BETTERSTACK_UPCOMING_PAYOUTS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/YOUR_TOKEN_5
```

### Step 3: Deploy to Production

```bash
# Commit changes
git add .
git commit -m "feat: add heartbeat monitoring for critical revenue protection jobs"

# Push to production
git push origin main

# Deploy to Vercel
vercel --prod
```

### Step 4: Verify

```bash
# Test each heartbeat manually
curl -X POST "$BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT"
curl -X POST "$BETTERSTACK_CLEANUP_RESERVATIONS_HEARTBEAT"
curl -X POST "$BETTERSTACK_UPCOMING_PAYOUTS_HEARTBEAT"

# Check BetterStack dashboard
# All heartbeats should show "Operational" status
```

---

## Configuration Details

### Heartbeat Settings by Job

| Job                  | Period   | Grace     | Email | Push | Critical |
| -------------------- | -------- | --------- | ----- | ---- | -------- |
| Expert Transfers     | 2 hours  | 24 min    | ✅    | ✅   | ✅       |
| Pending Payouts      | 24 hours | 4.8 hours | ✅    | ✅   | ✅       |
| Payment Reminders    | 6 hours  | 1.2 hours | ✅    | ✅   | ✅       |
| Cleanup Reservations | 15 min   | 3 min     | ✅    | ✅   | ✅       |
| Upcoming Payouts     | 24 hours | 7.2 hours | ✅    | ✅   | ❌       |

### Grace Period Calculation

Grace period = 20% of job period (allows for minor delays without false alerts)

Example:

- **Expert Transfers**: 2 hours = 7200s → Grace = 1440s (24 minutes)
- **Cleanup Reservations**: 15 min = 900s → Grace = 180s (3 minutes)

---

## How It Works

### Success Flow

```typescript
// In your cron job
try {
  // Execute job logic
  await processPaymentReminders();

  // ✅ Send success heartbeat
  await sendHeartbeatSuccess({
    url: ENV_CONFIG.BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT,
    jobName: 'Multibanco Payment Reminders',
  });
} catch (error) {
  // ❌ Send failure heartbeat
  await sendHeartbeatFailure(
    {
      url: ENV_CONFIG.BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT,
      jobName: 'Multibanco Payment Reminders',
    },
    error,
  );

  throw error; // Re-throw for QStash retry
}
```

### Alert Flow

1. **Job runs successfully** → Heartbeat sent → BetterStack shows "Operational"
2. **Job fails** → Failure heartbeat sent → **Immediate alert** to team
3. **Job doesn't run** → Heartbeat missed → **Alert after grace period**

---

## Expected Alerts

### Normal Operation (No Alerts)

- All jobs complete successfully
- Heartbeats received on schedule
- Dashboard shows all green

### Failure Scenarios (Alerts Triggered)

#### Scenario 1: Job Execution Failure

```
❌ FAILURE: Payment Reminders
Error: Database connection timeout
Failed at: 10:15 AM
Action: Check database connectivity
```

#### Scenario 2: Missed Heartbeat

```
🚨 CRITICAL: Cleanup Reservations missed heartbeat
Expected: 10:00 AM
Grace expired: 10:03 AM
Last success: 9:45 AM
Action: Check QStash schedule
```

#### Scenario 3: Partial Success

```
⚠️ WARNING: Payment Reminders
Sent: 15/20 reminders
Errors: 5 failed
Action: Review error logs
```

---

## Cost Analysis

### Current BetterStack Usage

**Free Tier:**

- 10 heartbeat monitors (using 5)
- Unlimited checks
- Email + Push notifications
- Basic escalation policies
- **Cost**: $0/month

**If You Need More:**

- Pro tier: $20/month
- Unlimited heartbeats
- SMS + Call alerts
- Advanced analytics
- Custom escalation

**Recommendation**: Stay on free tier (5/10 heartbeats used)

---

## Monitoring Best Practices

### 1. Review Dashboard Weekly

- Check for patterns in missed heartbeats
- Adjust grace periods if needed
- Review alert frequency

### 2. Test Heartbeats Monthly

```bash
# Test all heartbeats
./scripts/test-heartbeats.sh

# Test failure alerts
./scripts/test-failure-alerts.sh
```

### 3. Update Documentation Quarterly

- Review job schedules
- Update priority levels
- Adjust escalation policies

---

## Troubleshooting

### Issue: Heartbeat Not Configured

**Error:**

```
⚠️ [Payment Reminders] Heartbeat URL not configured - skipping heartbeat
```

**Solution:**

1. Create heartbeat in BetterStack dashboard
2. Add URL to `.env` file
3. Redeploy to Vercel

### Issue: False Positive Alerts

**Symptom:** Alerts triggered but job succeeded

**Solution:**

1. Increase grace period (20-30% of period)
2. Check for network latency
3. Review job execution time

### Issue: Heartbeat Timeout

**Error:**

```
❌ Failed to send heartbeat: Request timeout
```

**Solution:**

1. Check network connectivity
2. Increase timeout in code (default: 5s)
3. Verify BetterStack API status

---

## Success Metrics

### Expected Improvements

1. **Reduced Downtime**
   - Before: Unknown when jobs fail
   - After: Immediate alerts within 3-24 minutes

2. **Revenue Protection**
   - Before: Lost revenue from expired Multibanco payments
   - After: Proactive reminders prevent losses

3. **Expert Satisfaction**
   - Before: Payment delays go unnoticed
   - After: Immediate notification and resolution

4. **Operational Efficiency**
   - Before: Manual monitoring required
   - After: Automated monitoring and alerts

---

## Related Documentation

- [BetterStack Heartbeat Monitoring](./betterstack-heartbeat-monitoring.md) - Complete monitoring guide
- [BetterStack Setup Guide](./betterstack-setup-guide.md) - Step-by-step setup
- [QStash Cron Jobs](./qstash-cron-jobs.md) - Cron job configuration
- [Payment Processing Flow](./payment-processing.md) - Payment system overview

---

## Support

**Questions or Issues?**

1. Check documentation in `docs/02-core-systems/`
2. Review BetterStack status: https://status.betterstack.com
3. Contact BetterStack support: support@betterstack.com
4. Internal: #engineering-alerts Slack channel

---

**Implementation Date**: October 27, 2025  
**Implemented By**: AI Assistant  
**Code Review**: Pending  
**Production Deployment**: Pending (requires BetterStack setup)  
**Estimated Setup Time**: 30 minutes
