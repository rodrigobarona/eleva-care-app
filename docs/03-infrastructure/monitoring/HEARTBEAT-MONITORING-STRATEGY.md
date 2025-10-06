# BetterStack Heartbeat Monitoring Strategy

## 📋 Complete Cron Job Inventory

Your Eleva Care application has **10 scheduled cron jobs**. Based on their criticality and impact, here's the comprehensive strategy for BetterStack Heartbeat monitoring.

---

## 🎯 Prioritization Matrix

### Priority 1: **CRITICAL** 🔴 (Must Monitor)

**Financial operations that directly affect expert payouts and revenue**

| Cron Job                   | Status                 | Schedule      | Why Critical                                                                      |
| -------------------------- | ---------------------- | ------------- | --------------------------------------------------------------------------------- |
| `process-expert-transfers` | ✅ **IMPLEMENTED**     | Every 2 hours | Transfers funds to expert Connect accounts. Failure = experts don't get paid!     |
| `process-pending-payouts`  | ⚠️ **NEEDS HEARTBEAT** | Daily         | Creates Stripe payouts to expert bank accounts. Failure = delayed payments!       |
| `send-payment-reminders`   | ⚠️ **NEEDS HEARTBEAT** | Every 6 hours | Sends Multibanco payment reminders. Failure = lost revenue from expired payments! |

### Priority 2: **HIGH** 🟠 (Should Monitor)

**Customer-facing communications that affect user experience**

| Cron Job                    | Status                 | Schedule           | Why Important                                                                  |
| --------------------------- | ---------------------- | ------------------ | ------------------------------------------------------------------------------ |
| `appointment-reminders`     | ⚠️ **NEEDS HEARTBEAT** | Daily (24h before) | Sends 24-hour appointment reminders. Failure = no-shows & customer complaints! |
| `appointment-reminders-1hr` | ⚠️ **NEEDS HEARTBEAT** | Hourly (1h before) | Sends 1-hour appointment reminders. Failure = missed meetings!                 |
| `check-upcoming-payouts`    | ⚠️ **NEEDS HEARTBEAT** | Daily              | Notifies experts about upcoming payouts. Failure = poor expert experience!     |

### Priority 3: **MEDIUM** 🟡 (Optional)

**Maintenance tasks that improve system health but don't directly impact users**

| Cron Job                       | Status          | Schedule  | Why Optional                                                         |
| ------------------------------ | --------------- | --------- | -------------------------------------------------------------------- |
| `cleanup-expired-reservations` | ℹ️ **OPTIONAL** | Hourly    | Cleans up expired slot reservations. Gracefully degrades if delayed. |
| `cleanup-blocked-dates`        | ℹ️ **OPTIONAL** | Daily     | Cleans up old blocked dates. Gracefully degrades if delayed.         |
| `process-tasks`                | ℹ️ **OPTIONAL** | Scheduled | General task processing. Depends on what tasks it runs.              |

### Priority 4: **SKIP** ⚪ (Do Not Monitor)

**Health checks that shouldn't have heartbeat monitoring**

| Cron Job     | Status                | Schedule | Why Skip                                                               |
| ------------ | --------------------- | -------- | ---------------------------------------------------------------------- |
| `keep-alive` | ❌ **DO NOT MONITOR** | Frequent | This IS a health check itself. Monitoring a monitor creates confusion! |

---

## 🚀 Implementation Plan

### Phase 1: Critical Financial Jobs (Immediate) 🔴

#### 1. ✅ `process-expert-transfers` - DONE!

Already implemented with your heartbeat URL.

#### 2. `process-pending-payouts` - IMPLEMENT NEXT

**BetterStack Setup:**

```yaml
Name: Expert Payout to Bank
Period: 86400 seconds (24 hours / daily)
Grace: 3600 seconds (1 hour)
Priority: CRITICAL 🔴

Notifications:
  ☑ Email
  ☑ SMS
  ☑ Call

Escalation:
  Immediate alert
  Escalate to team after: 15 minutes
```

**Environment Variable:**

```bash
BETTERSTACK_PENDING_PAYOUTS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/[YOUR-ID]
```

**Code Implementation:** (See Phase 1 code below)

#### 3. `send-payment-reminders` - IMPLEMENT NEXT

**BetterStack Setup:**

```yaml
Name: Payment Reminder Notifications
Period: 21600 seconds (6 hours)
Grace: 1800 seconds (30 minutes)
Priority: CRITICAL 🔴

Notifications: ☑ Email
  ☑ Push

Escalation:
  Escalate to team after: 2 hours
```

**Environment Variable:**

```bash
BETTERSTACK_PAYMENT_REMINDERS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/[YOUR-ID]
```

---

### Phase 2: Communication Jobs (High Priority) 🟠

#### 4. `appointment-reminders` (24-hour)

**BetterStack Setup:**

```yaml
Name: Appointment Reminders (24h)
Period: 86400 seconds (24 hours / daily)
Grace: 3600 seconds (1 hour)
Priority: HIGH 🟠

Notifications: ☑ Email
  ☑ Push
```

**Environment Variable:**

```bash
BETTERSTACK_APPOINTMENT_REMINDERS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/[YOUR-ID]
```

#### 5. `appointment-reminders-1hr` (1-hour)

**BetterStack Setup:**

```yaml
Name: Appointment Reminders (1h)
Period: 3600 seconds (1 hour / hourly)
Grace: 600 seconds (10 minutes)
Priority: HIGH 🟠

Notifications: ☑ Email
  ☑ Push
```

**Environment Variable:**

```bash
BETTERSTACK_APPOINTMENT_REMINDERS_1HR_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/[YOUR-ID]
```

#### 6. `check-upcoming-payouts`

**BetterStack Setup:**

```yaml
Name: Upcoming Payout Notifications
Period: 86400 seconds (24 hours / daily)
Grace: 3600 seconds (1 hour)
Priority: HIGH 🟠

Notifications: ☑ Email
```

**Environment Variable:**

```bash
BETTERSTACK_UPCOMING_PAYOUTS_HEARTBEAT=https://uptime.betterstack.com/api/v1/heartbeat/[YOUR-ID]
```

---

### Phase 3: Maintenance Jobs (Optional) 🟡

For these, you can add heartbeats later if you notice issues:

```yaml
BETTERSTACK_CLEANUP_RESERVATIONS_HEARTBEAT
BETTERSTACK_CLEANUP_BLOCKED_DATES_HEARTBEAT
BETTERSTACK_PROCESS_TASKS_HEARTBEAT
```

---

## 💻 Phase 1: Critical Implementation Code

### Step 1: Update Environment Config

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">/Users/rodrigo.barona/Documents/GitHub/eleva-care-app/config/env.ts
