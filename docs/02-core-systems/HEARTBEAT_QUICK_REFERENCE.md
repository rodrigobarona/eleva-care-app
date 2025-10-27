# BetterStack Heartbeat Quick Reference Card

## 📊 Current Status: 5 of 10 Heartbeats Used

### ✅ Active Heartbeats (2)

| Job              | Schedule      | Last Used     |
| ---------------- | ------------- | ------------- |
| Expert Transfers | Every 2 hours | ✅ Production |
| Pending Payouts  | Daily at 6 AM | ✅ Production |

### 🆕 Ready to Deploy (3)

| Job                  | Schedule      | Status                     |
| -------------------- | ------------- | -------------------------- |
| Payment Reminders    | Every 6 hours | ⏳ Needs BetterStack setup |
| Cleanup Reservations | Every 15 min  | ⏳ Needs BetterStack setup |
| Upcoming Payouts     | Daily         | ⏳ Needs BetterStack setup |

### 💡 Available (5)

- Appointment Reminders (24h)
- Appointment Reminders (1h)
- Process Tasks
- 2 slots reserved for future use

---

## 🚀 Quick Setup (30 minutes)

### Step 1: BetterStack Dashboard

```bash
1. Login → Uptime → Heartbeats → Create Heartbeat
2. Configure 3 new heartbeats (see configurations below)
3. Copy heartbeat URLs
```

### Step 2: Environment Variables

```bash
# Add to .env
BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/TOKEN_3
BETTERSTACK_CLEANUP_RESERVATIONS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/TOKEN_4
BETTERSTACK_UPCOMING_PAYOUTS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/TOKEN_5
```

### Step 3: Deploy

```bash
git add .
git commit -m "feat: add heartbeat monitoring for revenue protection jobs"
git push origin main
vercel --prod
```

### Step 4: Verify

```bash
# Test heartbeats
curl -X POST "$BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT"
curl -X POST "$BETTERSTACK_CLEANUP_RESERVATIONS_HEARTBEAT"
curl -X POST "$BETTERSTACK_UPCOMING_PAYOUTS_HEARTBEAT"
```

---

## ⚙️ Heartbeat Configurations

### Payment Reminders

```json
{
  "name": "Payment Reminders",
  "period": 21600,
  "grace": 4320,
  "email": true,
  "push": true,
  "critical_alert": true
}
```

### Cleanup Reservations

```json
{
  "name": "Cleanup Reservations",
  "period": 900,
  "grace": 180,
  "email": true,
  "push": true,
  "critical_alert": true
}
```

### Upcoming Payouts

```json
{
  "name": "Upcoming Payouts",
  "period": 86400,
  "grace": 25920,
  "email": true,
  "push": true,
  "critical_alert": false
}
```

---

## 🔍 Monitoring Checklist

### Daily

- [ ] Check BetterStack dashboard for missed heartbeats
- [ ] Review any alert notifications

### Weekly

- [ ] Analyze heartbeat patterns
- [ ] Adjust grace periods if needed

### Monthly

- [ ] Test all heartbeats manually
- [ ] Review alert escalation policy

---

## 🚨 Alert Response

### Critical Alert (Financial Jobs)

1. **Check BetterStack** - View failure details
2. **Check Logs** - Review cron job logs in Vercel
3. **Check QStash** - Verify schedule is active
4. **Check Stripe** - Verify API connectivity
5. **Escalate** - If unresolved in 15 minutes

### High Priority Alert (Revenue Protection)

1. **Check BetterStack** - View failure details
2. **Check Logs** - Review error messages
3. **Check Database** - Verify connectivity
4. **Retry Manually** - Trigger job via API
5. **Escalate** - If unresolved in 30 minutes

---

## 📞 Support Contacts

**BetterStack Issues:**

- Status: https://status.betterstack.com
- Support: support@betterstack.com

**Internal Escalation:**

- #engineering-alerts (Slack)
- On-call engineer (PagerDuty)

---

## 📚 Full Documentation

- [Complete Monitoring Guide](./betterstack-heartbeat-monitoring.md)
- [Setup Guide](./betterstack-setup-guide.md)
- [Implementation Summary](./BETTERSTACK_IMPLEMENTATION_SUMMARY.md)

---

**Last Updated**: October 27, 2025  
**Quick Reference Version**: 1.0
