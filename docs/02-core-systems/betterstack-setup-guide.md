# BetterStack Heartbeat Setup Guide

## Quick Start: Creating Heartbeat Monitors

This guide walks you through creating the 5 critical heartbeat monitors for Eleva Care's financial and revenue protection cron jobs.

---

## Prerequisites

- BetterStack account with Uptime monitoring enabled
- Access to Eleva Care's `.env` file
- BetterStack API token (optional, for automation)

---

## Step-by-Step Setup

### Phase 1: Critical Financial Jobs (2 heartbeats)

#### 1. Expert Transfers Heartbeat

**Job Details:**

- **Name**: Expert Transfers
- **Purpose**: Monitors fund transfers from platform to expert Connect accounts
- **Schedule**: Every 2 hours
- **Criticality**: 🚨 CRITICAL

**Configuration:**

```json
{
  "name": "Expert Transfers",
  "period": 7200,
  "grace": 1440,
  "call": false,
  "sms": false,
  "email": true,
  "push": true,
  "critical_alert": true,
  "team_wait": 300
}
```

**Steps:**

1. Go to BetterStack → **Uptime** → **Heartbeats**
2. Click **"Create Heartbeat"**
3. Enter the configuration above
4. Copy the heartbeat URL
5. Add to `.env`:
   ```bash
   BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/YOUR_TOKEN
   ```

---

#### 2. Pending Payouts Heartbeat

**Job Details:**

- **Name**: Pending Payouts
- **Purpose**: Monitors Stripe payouts to expert bank accounts
- **Schedule**: Daily at 6 AM
- **Criticality**: 🚨 CRITICAL

**Configuration:**

```json
{
  "name": "Pending Payouts",
  "period": 86400,
  "grace": 17280,
  "call": false,
  "sms": false,
  "email": true,
  "push": true,
  "critical_alert": true,
  "team_wait": 300
}
```

**Steps:**

1. Click **"Create Heartbeat"**
2. Enter the configuration above
3. Copy the heartbeat URL
4. Add to `.env`:
   ```bash
   BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/YOUR_TOKEN
   ```

---

### Phase 2: Revenue Protection Jobs (3 heartbeats)

#### 3. Payment Reminders Heartbeat

**Job Details:**

- **Name**: Payment Reminders
- **Purpose**: Monitors Multibanco payment reminder emails
- **Schedule**: Every 6 hours
- **Criticality**: 🚨 HIGH

**Configuration:**

```json
{
  "name": "Payment Reminders",
  "period": 21600,
  "grace": 4320,
  "call": false,
  "sms": false,
  "email": true,
  "push": true,
  "critical_alert": true,
  "team_wait": 600
}
```

**Steps:**

1. Click **"Create Heartbeat"**
2. Enter the configuration above
3. Copy the heartbeat URL
4. Add to `.env`:
   ```bash
   BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/YOUR_TOKEN
   ```

---

#### 4. Cleanup Reservations Heartbeat

**Job Details:**

- **Name**: Cleanup Reservations
- **Purpose**: Monitors slot reservation cleanup
- **Schedule**: Every 15 minutes
- **Criticality**: 🚨 HIGH

**Configuration:**

```json
{
  "name": "Cleanup Reservations",
  "period": 900,
  "grace": 180,
  "call": false,
  "sms": false,
  "email": true,
  "push": true,
  "critical_alert": true,
  "team_wait": 600
}
```

**Steps:**

1. Click **"Create Heartbeat"**
2. Enter the configuration above
3. Copy the heartbeat URL
4. Add to `.env`:
   ```bash
   BETTERSTACK_CLEANUP_RESERVATIONS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/YOUR_TOKEN
   ```

---

#### 5. Upcoming Payouts Heartbeat

**Job Details:**

- **Name**: Upcoming Payouts
- **Purpose**: Monitors expert payout notifications
- **Schedule**: Daily
- **Criticality**: 📊 MEDIUM

**Configuration:**

```json
{
  "name": "Upcoming Payouts",
  "period": 86400,
  "grace": 25920,
  "call": false,
  "sms": false,
  "email": true,
  "push": true,
  "critical_alert": false,
  "team_wait": 1800
}
```

**Steps:**

1. Click **"Create Heartbeat"**
2. Enter the configuration above
3. Copy the heartbeat URL
4. Add to `.env`:
   ```bash
   BETTERSTACK_UPCOMING_PAYOUTS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/YOUR_TOKEN
   ```

---

## Verification

After creating all heartbeats:

### 1. Test Each Heartbeat

```bash
# Test Expert Transfers
curl -X POST "$BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT"

# Test Pending Payouts
curl -X POST "$BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT"

# Test Payment Reminders
curl -X POST "$BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT"

# Test Cleanup Reservations
curl -X POST "$BETTERSTACK_CLEANUP_RESERVATIONS_HEARTBEAT"

# Test Upcoming Payouts
curl -X POST "$BETTERSTACK_UPCOMING_PAYOUTS_HEARTBEAT"
```

### 2. Verify in BetterStack Dashboard

1. Go to **Uptime** → **Heartbeats**
2. Check that all 5 heartbeats show **"Operational"** status
3. Verify last check time is recent

### 3. Test Failure Alerts

```bash
# Test failure notification (optional)
curl -X POST "$BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT/fail"
```

---

## Environment Variables Summary

Add these to your `.env` file:

```bash
# ============================================
# BetterStack Heartbeat Monitoring
# ============================================

# Phase 1: Critical Financial Jobs (2/10 heartbeats)
BETTERSTACK_EXPERT_TRANSFERS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/TOKEN_1
BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/TOKEN_2

# Phase 2: Revenue Protection Jobs (3/10 heartbeats)
BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/TOKEN_3
BETTERSTACK_CLEANUP_RESERVATIONS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/TOKEN_4
BETTERSTACK_UPCOMING_PAYOUTS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/TOKEN_5

# Phase 3: User Experience Jobs (Optional - 2/10 heartbeats available)
# BETTERSTACK_APPOINTMENT_REMINDERS_HEARTBEAT=
# BETTERSTACK_APPOINTMENT_REMINDERS_1HR_HEARTBEAT=

# Phase 4: Operational Jobs (Optional - 1/10 heartbeats available)
# BETTERSTACK_TASKS_HEARTBEAT=
```

---

## Alert Configuration

### Recommended Alert Settings

| Priority    | Email | Push | SMS | Call | Critical Alert | Team Wait |
| ----------- | ----- | ---- | --- | ---- | -------------- | --------- |
| 🚨 CRITICAL | ✅    | ✅   | ❌  | ❌   | ✅             | 5 min     |
| 🚨 HIGH     | ✅    | ✅   | ❌  | ❌   | ✅             | 10 min    |
| 📊 MEDIUM   | ✅    | ✅   | ❌  | ❌   | ❌             | 30 min    |
| ✅ LOW      | ✅    | ❌   | ❌  | ❌   | ❌             | 60 min    |

### Alert Channels

1. **Email**: All team members receive email alerts
2. **Push**: Mobile app notifications (iOS/Android)
3. **SMS**: Phone text messages (optional, costs extra)
4. **Call**: Phone calls (optional, costs extra)
5. **Critical Alert**: Bypasses Do Not Disturb mode

---

## Automation (Optional)

### Create Heartbeats via API

```bash
#!/bin/bash
# create-heartbeats.sh

BETTERSTACK_API_TOKEN="your_api_token"

# Create Expert Transfers heartbeat
curl -X POST https://uptime.betterstack.com/api/v2/heartbeats \
  -H "Authorization: Bearer $BETTERSTACK_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Expert Transfers",
    "period": 7200,
    "grace": 1440,
    "email": true,
    "push": true,
    "critical_alert": true
  }'

# Repeat for other heartbeats...
```

---

## Maintenance Schedule

### Daily

- ✅ Check BetterStack dashboard for any missed heartbeats
- ✅ Review alert notifications

### Weekly

- ✅ Analyze heartbeat patterns
- ✅ Adjust grace periods if needed

### Monthly

- ✅ Review alert escalation policy
- ✅ Update on-call schedule

### Quarterly

- ✅ Audit all heartbeat configurations
- ✅ Evaluate need for additional heartbeats

---

## Troubleshooting

### Issue: Heartbeat Not Receiving Signals

**Symptoms:**

- BetterStack shows "Down" status
- No recent heartbeat received

**Solutions:**

1. Check environment variable is set correctly
2. Verify cron job is running (check QStash logs)
3. Test heartbeat URL manually with `curl`
4. Check network connectivity from Vercel

### Issue: False Positive Alerts

**Symptoms:**

- Alerts triggered but job succeeded
- Heartbeat received after grace period

**Solutions:**

1. Increase grace period (20-30% of period)
2. Check for network latency issues
3. Review job execution time

### Issue: Missing Alerts

**Symptoms:**

- Job failed but no alert received
- Heartbeat shows "Down" but no notification

**Solutions:**

1. Verify alert channels are enabled
2. Check email/push notification settings
3. Review escalation policy configuration

---

## Cost Optimization

### Current Usage: 5/10 Heartbeats

**Free Tier Limits:**

- 10 heartbeat monitors
- Unlimited checks
- Email + Push notifications
- Basic escalation policies

**When to Upgrade to Pro:**

- Need more than 10 heartbeats
- Require SMS/Call alerts
- Want advanced analytics
- Need custom escalation policies

**Estimated Costs:**

- Free tier: $0/month (current)
- Pro tier: $20/month (if needed)

---

## Next Steps

1. ✅ Create all 5 heartbeat monitors in BetterStack
2. ✅ Add environment variables to `.env`
3. ✅ Deploy to production (Vercel)
4. ✅ Test each heartbeat manually
5. ✅ Verify alerts are working
6. ✅ Document heartbeat URLs in password manager
7. ✅ Set up on-call schedule
8. ✅ Configure Slack notifications (optional)

---

## Related Documentation

- [BetterStack Heartbeat Monitoring](./betterstack-heartbeat-monitoring.md)
- [QStash Cron Jobs](./qstash-cron-jobs.md)
- [Payment Processing Flow](./payment-processing.md)

---

**Last Updated**: October 27, 2025  
**Setup Time**: ~30 minutes  
**Maintained By**: Engineering Team
