# BetterStack Heartbeat Monitoring

## Overview

Eleva Care uses **BetterStack Uptime** heartbeat monitoring to ensure critical cron jobs are running smoothly. Heartbeats provide real-time alerts when jobs fail or miss their scheduled execution, protecting revenue and user experience.

## Current Heartbeat Status

**Using 5 of 10 available heartbeats**

### Phase 1: Critical Financial Jobs ✅ (2 heartbeats)

| Job                  | Heartbeat URL                            | Schedule      | Priority    | Status    |
| -------------------- | ---------------------------------------- | ------------- | ----------- | --------- |
| **Expert Transfers** | `BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT` | Every 2 hours | 🚨 CRITICAL | ✅ Active |
| **Pending Payouts**  | `BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT`  | Daily at 6 AM | 🚨 CRITICAL | ✅ Active |

### Phase 2: Revenue Protection Jobs ✅ (3 heartbeats)

| Job                      | Heartbeat URL                                | Schedule         | Priority  | Status    |
| ------------------------ | -------------------------------------------- | ---------------- | --------- | --------- |
| **Payment Reminders**    | `BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT`    | Every 6 hours    | 🚨 HIGH   | ✅ Active |
| **Cleanup Reservations** | `BETTERSTACK_CLEANUP_RESERVATIONS_HEARTBEAT` | Every 15 minutes | 🚨 HIGH   | ✅ Active |
| **Upcoming Payouts**     | `BETTERSTACK_UPCOMING_PAYOUTS_HEARTBEAT`     | Daily            | 📊 MEDIUM | ✅ Active |

### Phase 3: User Experience Jobs (Optional - 2 heartbeats available)

| Job                             | Heartbeat URL                                     | Schedule         | Priority  | Status       |
| ------------------------------- | ------------------------------------------------- | ---------------- | --------- | ------------ |
| **Appointment Reminders (24h)** | `BETTERSTACK_APPOINTMENT_REMINDERS_HEARTBEAT`     | Every 30 minutes | 📊 MEDIUM | ⏸️ Available |
| **Appointment Reminders (1h)**  | `BETTERSTACK_APPOINTMENT_REMINDERS_1HR_HEARTBEAT` | Every 15 minutes | 📊 MEDIUM | ⏸️ Available |

### Phase 4: Operational Jobs (Optional - 1 heartbeat available)

| Job               | Heartbeat URL                 | Schedule | Priority | Status       |
| ----------------- | ----------------------------- | -------- | -------- | ------------ |
| **Process Tasks** | `BETTERSTACK_TASKS_HEARTBEAT` | Varies   | ✅ LOW   | ⏸️ Available |

---

## Why These Jobs Need Monitoring

### 🚨 Critical Financial Jobs

#### 1. **Expert Transfers** (`process-expert-transfers`)

- **What it does**: Transfers funds from platform to expert Connect accounts
- **Why critical**: Direct revenue impact - experts won't receive payments if this fails
- **Failure impact**: Expert trust, legal compliance, payment delays
- **Schedule**: Every 2 hours
- **Monitoring**: Success/failure heartbeat

#### 2. **Pending Payouts** (`process-pending-payouts`)

- **What it does**: Creates Stripe payouts from Connect accounts to expert bank accounts
- **Why critical**: Final step in expert payment flow - legal compliance requirement
- **Failure impact**: Regulatory violations, expert dissatisfaction, payment delays
- **Schedule**: Daily at 6 AM
- **Monitoring**: Success/failure heartbeat

### 🚨 Revenue Protection Jobs

#### 3. **Payment Reminders** (`send-payment-reminders`)

- **What it does**: Sends staged Multibanco payment reminders (Day 3 & Day 6)
- **Why critical**: Prevents revenue loss from expired Multibanco payments
- **Failure impact**: Lost bookings, reduced conversion, customer frustration
- **Schedule**: Every 6 hours
- **Monitoring**: Success/failure heartbeat

#### 4. **Cleanup Reservations** (`cleanup-expired-reservations`)

- **What it does**: Releases unpaid slot reservations and removes duplicates
- **Why critical**: Prevents slot blocking and ensures availability
- **Failure impact**: Expert calendar blocked, lost revenue opportunities
- **Schedule**: Every 15 minutes
- **Monitoring**: Success/failure heartbeat

#### 5. **Upcoming Payouts** (`check-upcoming-payouts`)

- **What it does**: Notifies experts about payouts eligible in 1-2 days
- **Why important**: Expert communication and transparency
- **Failure impact**: Expert satisfaction, trust in platform
- **Schedule**: Daily
- **Monitoring**: Success/failure heartbeat

---

## Implementation Guide

### Step 1: Create Heartbeat Monitors in BetterStack

For each critical job, create a heartbeat monitor:

1. **Log in to BetterStack** → Navigate to **Uptime** → **Heartbeats**
2. **Click "Create Heartbeat"**
3. **Configure the heartbeat:**

```json
{
  "name": "Expert Transfers",
  "period": 7200, // 2 hours in seconds
  "grace": 1440, // 20% of period (24 minutes)
  "email": true,
  "push": true,
  "critical_alert": true
}
```

4. **Copy the heartbeat URL** (format: `https://uptime.betterstack.com/api/v1/heartbeat/<TOKEN>`)

### Step 2: Add Environment Variables

Add the heartbeat URLs to your `.env` file:

```bash
# Phase 1: Critical Financial Jobs
BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/YOUR_TOKEN_1
BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/YOUR_TOKEN_2

# Phase 2: Revenue Protection Jobs
BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/YOUR_TOKEN_3
BETTERSTACK_CLEANUP_RESERVATIONS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/YOUR_TOKEN_4
BETTERSTACK_UPCOMING_PAYOUTS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/YOUR_TOKEN_5
```

### Step 3: Verify Implementation

The cron jobs are already configured to send heartbeats. Verify they're working:

1. **Trigger a job manually** (via QStash or API)
2. **Check BetterStack dashboard** for heartbeat confirmation
3. **Verify alerts** by waiting for a missed heartbeat

---

## Heartbeat Configuration Best Practices

### Recommended Settings by Job Type

| Job Type               | Period       | Grace Period  | Alert Channels     | Critical Alert |
| ---------------------- | ------------ | ------------- | ------------------ | -------------- |
| **Financial**          | Job schedule | 20% of period | Email + Push + SMS | ✅ Yes         |
| **Revenue Protection** | Job schedule | 20% of period | Email + Push       | ✅ Yes         |
| **User Experience**    | Job schedule | 30% of period | Email + Push       | ❌ No          |
| **Operational**        | Job schedule | 50% of period | Email only         | ❌ No          |

### Grace Period Calculation

The grace period allows for minor delays without triggering false alerts:

```typescript
// Example: Expert Transfers (every 2 hours)
const period = 2 * 60 * 60; // 7200 seconds
const grace = period * 0.2; // 1440 seconds (24 minutes)

// If job runs at 10:00 AM, BetterStack expects heartbeat by:
// 12:00 PM (period) + 24 minutes (grace) = 12:24 PM
```

---

## How Heartbeats Work

### Success Flow

```typescript
// In your cron job
try {
  // Execute job logic
  await processExpertTransfers();

  // Send success heartbeat
  await sendHeartbeatSuccess({
    url: ENV_CONFIG.BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT,
    jobName: 'Expert Payout Processing',
  });
} catch (error) {
  // Send failure heartbeat
  await sendHeartbeatFailure(
    {
      url: ENV_CONFIG.BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT,
      jobName: 'Expert Payout Processing',
    },
    error,
  );
}
```

### Heartbeat Utility Functions

Located in `lib/betterstack-heartbeat.ts`:

#### `sendHeartbeatSuccess()`

```typescript
await sendHeartbeatSuccess({
  url: 'https://uptime.betterstack.com/api/v1/heartbeat/<TOKEN>',
  jobName: 'Job Name',
  timeout: 5000, // Optional, default 5s
});
```

#### `sendHeartbeatFailure()`

```typescript
await sendHeartbeatFailure(
  {
    url: 'https://uptime.betterstack.com/api/v1/heartbeat/<TOKEN>',
    jobName: 'Job Name',
  },
  error,
);
```

#### `withHeartbeat()` (Wrapper)

```typescript
await withHeartbeat(
  {
    url: ENV_CONFIG.BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT,
    jobName: 'Expert Payout Processing',
  },
  async () => {
    // Your job logic here
    await processExpertTransfers();
  },
);
```

---

## Monitoring & Alerts

### Alert Configuration

BetterStack sends alerts via:

- 📧 **Email** - All team members
- 📱 **Push Notifications** - Mobile app (iOS/Android)
- 💬 **Slack** - #alerts channel (optional)
- 📞 **Phone Call** - On-call engineer (critical jobs only)

### Escalation Policy

1. **Immediate** (0 min) - Email + Push to on-call engineer
2. **5 minutes** - Escalate to team lead
3. **15 minutes** - Escalate to entire engineering team
4. **30 minutes** - Page CTO

### Alert Examples

#### Success Heartbeat

```
✅ Heartbeat received: Expert Payout Processing
Last check: 2 minutes ago
Status: Operational
```

#### Missed Heartbeat

```
🚨 CRITICAL: Expert Payout Processing missed heartbeat
Expected: 10:00 AM
Grace period expired: 10:24 AM
Last successful: 8:00 AM (2 hours ago)
Action required: Investigate immediately
```

#### Failure Heartbeat

```
❌ FAILURE: Expert Payout Processing
Error: Stripe API rate limit exceeded
Failed at: 10:15 AM
Retry count: 1/3
Action required: Check Stripe dashboard
```

---

## Troubleshooting

### Common Issues

#### 1. Heartbeat URL Not Configured

```
⚠️ [Expert Payout Processing] Heartbeat URL not configured - skipping heartbeat
```

**Solution**: Add the environment variable to `.env` and redeploy

#### 2. Heartbeat Timeout

```
❌ [Expert Payout Processing] Failed to send heartbeat: Request timeout
```

**Solution**: Check network connectivity, increase timeout if needed

#### 3. False Positive Alerts

```
🚨 Heartbeat missed but job actually succeeded
```

**Solution**: Increase grace period or check for network issues

### Debugging Heartbeats

```bash
# Test heartbeat manually
curl -X POST "https://uptime.betterstack.com/api/v1/heartbeat/<TOKEN>"

# Test failure endpoint
curl -X POST "https://uptime.betterstack.com/api/v1/heartbeat/<TOKEN>/fail"

# Check logs for heartbeat attempts
pnpm logs:cron | grep "Heartbeat"
```

---

## Best Practices

### 1. **Always Use Try-Catch**

```typescript
try {
  await jobLogic();
  await sendHeartbeatSuccess({ ... });
} catch (error) {
  await sendHeartbeatFailure({ ... }, error);
  throw error; // Re-throw for QStash retry
}
```

### 2. **Don't Block on Heartbeat Failures**

```typescript
// ✅ Good - Heartbeat failures don't break the job
await sendHeartbeatSuccess({ ... }).catch(err =>
  console.error('Heartbeat failed but job succeeded:', err)
);

// ❌ Bad - Job fails if heartbeat fails
await sendHeartbeatSuccess({ ... }); // Throws on failure
```

### 3. **Use Descriptive Job Names**

```typescript
// ✅ Good
jobName: 'Expert Payout Processing';

// ❌ Bad
jobName: 'Job 1';
```

### 4. **Set Appropriate Timeouts**

```typescript
// For critical jobs with strict SLAs
timeout: 3000; // 3 seconds

// For less critical jobs
timeout: 10000; // 10 seconds
```

### 5. **Monitor Heartbeat Health**

- Review BetterStack dashboard weekly
- Check for patterns in missed heartbeats
- Adjust grace periods based on actual job duration
- Set up Slack notifications for critical jobs

---

## Cost Management

### Current Usage: 5/10 Heartbeats

**BetterStack Pricing** (as of 2024):

- Free tier: 10 heartbeat monitors
- Pro tier: Unlimited heartbeats + advanced features

### Optimization Strategy

1. **Prioritize critical financial jobs** (2 heartbeats) ✅
2. **Add revenue protection jobs** (3 heartbeats) ✅
3. **Add user experience jobs** (2 heartbeats) - Optional
4. **Add operational jobs** (1 heartbeat) - Optional

### When to Upgrade

Consider upgrading to Pro tier when:

- Need more than 10 heartbeats
- Require custom escalation policies
- Want advanced analytics and reporting
- Need integration with incident management tools

---

## Related Documentation

- [BetterStack Heartbeat API](https://betterstack.com/docs/uptime/cron-and-heartbeat-monitor)
- [QStash Cron Jobs](./qstash-cron-jobs.md)
- [Payment Processing Flow](./payment-processing.md)
- [Expert Payout System](./expert-payouts.md)

---

## Maintenance

### Regular Tasks

- **Weekly**: Review heartbeat dashboard for patterns
- **Monthly**: Audit grace periods and adjust if needed
- **Quarterly**: Review alert escalation policy
- **Annually**: Evaluate upgrade to Pro tier

### Health Checks

```bash
# Check all heartbeat URLs are configured
pnpm run check:heartbeats

# Test all heartbeats
pnpm run test:heartbeats

# View heartbeat logs
pnpm logs:heartbeats
```

---

## Support

For issues with BetterStack heartbeat monitoring:

1. **Check BetterStack Status**: https://status.betterstack.com
2. **Review Logs**: Check cron job logs for heartbeat errors
3. **Contact Support**: support@betterstack.com
4. **Internal Escalation**: #engineering-alerts Slack channel

---

**Last Updated**: October 27, 2025  
**Maintained By**: Engineering Team  
**Review Frequency**: Quarterly
