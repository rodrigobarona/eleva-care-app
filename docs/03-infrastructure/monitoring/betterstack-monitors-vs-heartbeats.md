# Better Stack: Monitors vs Heartbeats

## 🎯 Quick Summary

| Feature       | **Monitors**                | **Heartbeats**                      |
| ------------- | --------------------------- | ----------------------------------- |
| **Purpose**   | Check if your service is UP | Check if your scheduled task RAN    |
| **Direction** | Better Stack → Your Service | Your Service → Better Stack         |
| **Type**      | Active (pull-based)         | Passive (push-based)                |
| **Use For**   | APIs, websites, servers     | Cron jobs, backups, batch processes |
| **Example**   | "Is eleva.care responding?" | "Did the database backup run?"      |

---

## 📊 Detailed Comparison

### 🔍 Monitors (Active Monitoring)

**What They Do:**  
Better Stack **actively reaches out** to your service at regular intervals to check if it's available and responding correctly.

**How It Works:**

```
Better Stack  ----[HTTP GET]---->  Your API Endpoint
                                    └─> Returns 200? ✅
                                    └─> Returns 503? ❌ Alert!
                                    └─> Times out? ❌ Alert!
```

**Best For:**

- ✅ API endpoints (e.g., `/api/healthcheck`)
- ✅ Websites and web applications
- ✅ Servers and infrastructure
- ✅ Database connectivity
- ✅ Third-party service dependencies

**Key Characteristics:**

- Better Stack initiates the check
- Runs at specified intervals (30s, 1min, 5min, etc.)
- Tests availability and response time
- Can validate response content, status codes, SSL certificates
- Works from multiple geographic regions

---

### 💓 Heartbeats (Passive Monitoring)

**What They Do:**  
Your scheduled task/script **notifies Better Stack** when it successfully completes. Better Stack monitors if these notifications arrive on time.

**How It Works:**

```
Your Cron Job  ----[HTTP POST]---->  Better Stack Heartbeat URL
    ├─> Runs successfully? Send ping ✅
    ├─> Fails? Send /fail ❌ Alert!
    └─> Doesn't run? No ping ❌ Alert!
```

**Best For:**

- ✅ Cron jobs and scheduled tasks
- ✅ Database backups
- ✅ Data processing pipelines
- ✅ Batch jobs and ETL processes
- ✅ Automated maintenance tasks
- ✅ Background workers

**Key Characteristics:**

- Your service initiates the notification
- Better Stack expects pings at defined intervals
- If ping doesn't arrive on time → Alert
- Can report failures explicitly
- Can include exit codes and output logs

---

## 🏗️ Configuration for Eleva Care

### For Your Health Check API → Use **Monitors**

Your `/api/healthcheck` endpoint should be monitored using **Monitors** because:

- It's an HTTP endpoint that can be actively checked
- You want to know if your service is responding
- You need global availability checks
- You want to monitor response times

#### ✅ Recommended Monitor Configuration

**1. Quick Health Check (Primary Monitor)**

```yaml
Monitor Type: HTTP
URL: https://eleva.care/api/healthcheck
Method: GET
Check Frequency: 30 seconds
Expected Status: 200
Request Timeout: 5 seconds
Regions: US, EU, Asia
Verification: Status code only

Alerts:
  - After 2 failed checks → Alert immediately
  - Escalate to team after: 5 minutes
```

**2. Deep Service Health Check**

```yaml
Monitor Type: HTTP
URL: https://eleva.care/api/healthcheck?services=true
Method: GET
Check Frequency: 5 minutes
Expected Status: 200
Request Timeout: 10 seconds
Regions: US, EU
Verification: Status code + response time

Alerts:
  - After 3 failed checks → Alert
  - Escalate to team after: 10 minutes
```

**3. Individual Service Monitors (Optional)**

```yaml
Critical Services (Check every 2 minutes):
  - https://eleva.care/api/health/stripe
  - https://eleva.care/api/health/clerk
  - https://eleva.care/api/health/neon-database

Optional Services (Check every 5 minutes):
  - https://eleva.care/api/health/posthog
  - https://eleva.care/api/health/resend
  - https://eleva.care/api/health/novu
```

---

### For Background Jobs → Use **Heartbeats**

Heartbeats are perfect for monitoring scheduled tasks that you might add to Eleva Care.

#### 📋 Example Use Cases for Eleva Care

**1. Database Backup (Daily)**

```bash
#!/bin/bash
# /scripts/backup-database.sh

# Perform backup
pg_dump $DATABASE_URL > /backups/$(date +%Y%m%d).sql

# Upload to S3
aws s3 cp /backups/$(date +%Y%m%d).sql s3://eleva-backups/

# Notify Better Stack Heartbeat
curl "https://uptime.betterstack.com/api/v1/heartbeat/<TOKEN>"
```

**Heartbeat Configuration:**

```yaml
Name: 'Daily Database Backup'
Period: 86400 seconds (24 hours)
Grace Period: 1800 seconds (30 minutes)
Expected: Daily at 02:00 AM UTC

Alerts:
  - Email: Yes
  - SMS: Yes (critical)
  - Call: Yes (critical)
```

**2. Stripe Payment Reconciliation (Hourly)**

```typescript
// scripts/reconcile-payments.ts

async function reconcilePayments() {
  try {
    // Your reconciliation logic
    await syncStripePayments();

    // Notify Better Stack on success
    await fetch(
      `https://uptime.betterstack.com/api/v1/heartbeat/${process.env.BETTERSTACK_RECONCILE_TOKEN}`,
    );
  } catch (error) {
    // Notify Better Stack on failure
    await fetch(
      `https://uptime.betterstack.com/api/v1/heartbeat/${process.env.BETTERSTACK_RECONCILE_TOKEN}/fail`,
      {
        method: 'POST',
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
        }),
      },
    );
    throw error;
  }
}
```

**Heartbeat Configuration:**

```yaml
Name: 'Stripe Payment Reconciliation'
Period: 3600 seconds (1 hour)
Grace Period: 300 seconds (5 minutes)
Expected: Every hour

Alerts:
  - Email: Yes
  - Push: Yes
```

**3. Meeting Reminders (Every 15 minutes)**

```typescript
// scripts/send-meeting-reminders.ts

async function sendMeetingReminders() {
  const upcomingMeetings = await getUpcomingMeetings();

  for (const meeting of upcomingMeetings) {
    await sendReminderEmail(meeting);
  }

  // Notify Better Stack
  await fetch(
    `https://uptime.betterstack.com/api/v1/heartbeat/${process.env.BETTERSTACK_REMINDERS_TOKEN}`,
  );
}
```

**Heartbeat Configuration:**

```yaml
Name: 'Meeting Reminders'
Period: 900 seconds (15 minutes)
Grace Period: 120 seconds (2 minutes)
Expected: Every 15 minutes

Alerts:
  - Email: Yes
  - Push: No (not critical)
```

---

## 🛠️ Setup Instructions

### Setting Up Monitors (Your Health Check)

#### Option 1: Via Better Stack Dashboard

1. **Navigate to Uptime Monitoring**
   - Log in to Better Stack
   - Go to "Uptime" → "Monitors"
   - Click "Create Monitor"

2. **Configure Quick Health Monitor**

   ```
   Monitor Type: HTTP(S)
   URL: https://eleva.care/api/healthcheck
   Name: Eleva Care - Quick Health
   Check Frequency: 30 seconds
   Expected Status Code: 200
   Request Timeout: 5 seconds
   Regions: Select "US", "EU", "Asia"
   ```

3. **Set Up Alerts**

   ```
   Alert after: 2 consecutive failures
   Notify via: Email, Push, SMS (optional)
   Escalate to team after: 5 minutes
   ```

4. **Configure Deep Health Monitor**
   ```
   URL: https://eleva.care/api/healthcheck?services=true
   Name: Eleva Care - Deep Health
   Check Frequency: 5 minutes
   Expected Status Code: 200
   Request Timeout: 10 seconds
   ```

#### Option 2: Via API (Automated)

```bash
#!/bin/bash
# scripts/setup-betterstack-monitors.sh

# Set your Better Stack API token
TOKEN="your-api-token-here"

# Create Quick Health Monitor
curl --request POST \
  --url https://uptime.betterstack.com/api/v2/monitors \
  --header "Authorization: Bearer $TOKEN" \
  --header 'Content-Type: application/json' \
  --data '{
    "url": "https://eleva.care/api/healthcheck",
    "pronounceable_name": "Eleva Care - Quick Health",
    "monitor_type": "status",
    "check_frequency": 30,
    "request_timeout": 5,
    "regions": ["us", "eu", "as"],
    "call": true,
    "sms": true,
    "email": true,
    "recovery_period": 60,
    "confirmation_period": 30
  }'

# Create Deep Health Monitor
curl --request POST \
  --url https://uptime.betterstack.com/api/v2/monitors \
  --header "Authorization: Bearer $TOKEN" \
  --header 'Content-Type: application/json' \
  --data '{
    "url": "https://eleva.care/api/healthcheck?services=true",
    "pronounceable_name": "Eleva Care - Deep Health",
    "monitor_type": "status",
    "check_frequency": 300,
    "request_timeout": 10,
    "regions": ["us", "eu"],
    "email": true,
    "recovery_period": 120,
    "confirmation_period": 60
  }'
```

---

### Setting Up Heartbeats (Scheduled Tasks)

#### Step 1: Create Heartbeat in Better Stack

**Via Dashboard:**

1. Go to "Uptime" → "Heartbeats"
2. Click "Create Heartbeat"
3. Configure:

   ```
   Name: Daily Database Backup
   Period: 86400 seconds (24 hours)
   Grace Period: 1800 seconds (30 min)

   Notifications:
   ☑ Email
   ☑ SMS
   ☑ Call (critical tasks only)

   Escalation:
   Escalate to team after: 30 minutes
   ```

4. Save and copy the generated heartbeat URL

**Via API:**

```bash
curl --request POST \
  --url https://uptime.betterstack.com/api/v2/heartbeats \
  --header "Authorization: Bearer $TOKEN" \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "Daily Database Backup",
    "period": 86400,
    "grace": 1800,
    "call": true,
    "sms": true,
    "email": true
  }'
```

**Response:**

```json
{
  "data": {
    "id": "12345",
    "attributes": {
      "url": "https://uptime.betterstack.com/api/v1/heartbeat/abc123xyz789",
      "name": "Daily Database Backup",
      "period": 86400,
      "grace": 1800
    }
  }
}
```

#### Step 2: Add Heartbeat to Your Script

**Basic Success Notification:**

```bash
#!/bin/bash
# After your backup completes successfully
curl "https://uptime.betterstack.com/api/v1/heartbeat/abc123xyz789"
```

**With Failure Handling:**

```bash
#!/bin/bash
set -e

HEARTBEAT_URL="https://uptime.betterstack.com/api/v1/heartbeat/abc123xyz789"

# Capture script output
output=$(./run-backup.sh 2>&1) || {
  # On failure, report to Better Stack with output
  curl -d "$output" "${HEARTBEAT_URL}/$?"
  exit 1
}

# On success, notify Better Stack
curl "$HEARTBEAT_URL"
```

**In Node.js/TypeScript:**

```typescript
// In your scheduled task
import { notifyHeartbeat } from '@/lib/heartbeat';

// lib/heartbeat.ts
export async function notifyHeartbeat(token: string, success = true) {
  const url = `https://uptime.betterstack.com/api/v1/heartbeat/${token}`;
  const endpoint = success ? url : `${url}/fail`;

  await fetch(endpoint);
}

export async function dailyBackup() {
  try {
    await performBackup();
    await notifyHeartbeat(process.env.BETTERSTACK_BACKUP_TOKEN!);
  } catch (error) {
    await notifyHeartbeat(process.env.BETTERSTACK_BACKUP_TOKEN!, false);
    throw error;
  }
}
```

#### Step 3: Schedule with Cron or Vercel Cron

**Using Vercel Cron:**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/backup-database",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/reconcile-payments",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Cron API Endpoint:**

```typescript
// app/api/cron/backup-database/route.ts
import { notifyHeartbeat } from '@/lib/heartbeat';

export async function GET(request: Request) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Perform backup
    await backupDatabase();

    // Notify Better Stack heartbeat
    await notifyHeartbeat(process.env.BETTERSTACK_BACKUP_TOKEN!);

    return Response.json({ success: true });
  } catch (error) {
    await notifyHeartbeat(process.env.BETTERSTACK_BACKUP_TOKEN!, false);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 🎯 Recommended Setup for Eleva Care

### Monitors (Active Checks)

```yaml
Production Monitors:

  1. Quick Health Check
     Type: Monitor
     URL: https://eleva.care/api/healthcheck
     Interval: 30 seconds
     Priority: Critical

  2. Deep Service Check
     Type: Monitor
     URL: https://eleva.care/api/healthcheck?services=true
     Interval: 5 minutes
     Priority: High

  3. Stripe Health
     Type: Monitor
     URL: https://eleva.care/api/health/stripe
     Interval: 2 minutes
     Priority: Critical

  4. Clerk Auth Health
     Type: Monitor
     URL: https://eleva.care/api/health/clerk
     Interval: 2 minutes
     Priority: Critical

  5. Database Health
     Type: Monitor
     URL: https://eleva.care/api/health/neon-database
     Interval: 1 minute
     Priority: Critical
```

### Heartbeats (Passive Checks)

```yaml
Scheduled Task Heartbeats:

  1. Database Backup
     Type: Heartbeat
     Period: 24 hours (86400s)
     Grace: 30 minutes (1800s)
     Priority: Critical

  2. Payment Reconciliation
     Type: Heartbeat
     Period: 1 hour (3600s)
     Grace: 5 minutes (300s)
     Priority: High

  3. Meeting Reminders
     Type: Heartbeat
     Period: 15 minutes (900s)
     Grace: 2 minutes (120s)
     Priority: Medium

  4. Weekly Reports
     Type: Heartbeat
     Period: 7 days (604800s)
     Grace: 4 hours (14400s)
     Priority: Low
```

---

## 📋 Environment Variables

Add these to your `.env` file and Vercel:

```bash
# Better Stack Monitors (not needed - Better Stack initiates)
# No tokens required for monitors

# Better Stack Heartbeats (your service notifies Better Stack)
BETTERSTACK_BACKUP_HEARTBEAT="abc123..."
BETTERSTACK_RECONCILE_HEARTBEAT="def456..."
BETTERSTACK_REMINDERS_HEARTBEAT="ghi789..."
BETTERSTACK_REPORTS_HEARTBEAT="jkl012..."

# Better Stack API (for programmatic configuration)
BETTERSTACK_API_TOKEN="your-api-token"
```

---

## 🎨 Visual Comparison

### Monitor Flow (Active)

```
┌─────────────────┐
│  Better Stack   │
│   (Initiates)   │
└────────┬────────┘
         │
         │ [Every 30s]
         │ GET /api/healthcheck
         ↓
┌─────────────────┐
│  Eleva Care     │
│  API Endpoint   │
└────────┬────────┘
         │
         │ Returns 200 ✅
         │ or 503 ❌
         ↓
┌─────────────────┐
│  Better Stack   │
│  (Evaluates)    │
│  Alert if down  │
└─────────────────┘
```

### Heartbeat Flow (Passive)

```
┌─────────────────┐
│  Cron Job       │
│  (Initiates)    │
└────────┬────────┘
         │
         │ [Scheduled Time]
         │ Runs backup task
         ↓
┌─────────────────┐
│  Task Completes │
│  Success? ✅    │
└────────┬────────┘
         │
         │ POST /heartbeat/TOKEN
         ↓
┌─────────────────┐
│  Better Stack   │
│  (Receives)     │
│  Resets timer   │
└─────────────────┘

If no ping received:
┌─────────────────┐
│  Better Stack   │
│  Period + Grace │
│  expired? ❌    │
│  → Alert!       │
└─────────────────┘
```

---

## 🔧 Quick Decision Guide

**Use Monitors When:**

- ✅ You have an HTTP endpoint to check
- ✅ You want to know if your service is **available**
- ✅ You need geographic distributed checks
- ✅ Response time matters
- ✅ SSL certificate validation needed

**Use Heartbeats When:**

- ✅ You have a scheduled task/cron job
- ✅ You want to know if a task **executed**
- ✅ The task runs on a schedule
- ✅ You need to capture execution logs
- ✅ You're monitoring batch processes

---

## 📚 Related Documentation

- [Better Stack Integration Guide](./02-betterstack-integration.md)
- [Health Check Implementation](./01-health-check-monitoring.md)
- [Quick Reference](./betterstack-quick-reference.md)

---

## ✅ Summary

| Aspect                  | Monitors                     | Heartbeats                      |
| ----------------------- | ---------------------------- | ------------------------------- |
| **Who initiates?**      | Better Stack                 | Your service                    |
| **What's checked?**     | Service availability         | Task execution                  |
| **Best for Eleva Care** | `/api/healthcheck` endpoints | Cron jobs, backups              |
| **Alert trigger**       | Service doesn't respond      | Expected ping doesn't arrive    |
| **Setup complexity**    | Simple (URL + interval)      | Medium (integrate into scripts) |

**For Eleva Care:**

- ✅ **Use Monitors** for your health check API endpoints ← **This is what you need now**
- ✅ **Use Heartbeats** when you add scheduled tasks (backups, batch jobs, etc.)

---

**You should start with Monitors for your current `/api/healthcheck` endpoint!** 🎯
