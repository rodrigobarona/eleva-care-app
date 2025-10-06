# Better Stack Integration Guide

## Overview

This guide covers how to set up and configure Better Stack (formerly Better Uptime) to monitor the Eleva Care application's health and display a public status page.

## Architecture

We provide two types of health check endpoints:

### 1. Comprehensive Health Check

**Endpoint:** `/api/healthcheck`

Returns overall system health including:

- System metrics (uptime, memory, version)
- Environment configuration
- All external services status (when requested)
- Individual service health details

**Query Parameters:**

- `?detailed=true` - Include full service health details
- `?services=true` - Include service summary

**Example:**

```bash
curl https://eleva.care/api/healthcheck?detailed=true
```

**Response Format:**

```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2024-01-14T10:00:00.000Z",
  "uptime": 3600,
  "version": "0.3.1",
  "environment": "production",
  "services": {
    "overall": "healthy",
    "summary": {
      "total": 10,
      "healthy": 10,
      "degraded": 0,
      "down": 0
    },
    "details": [
      {
        "service": "stripe",
        "status": "healthy",
        "responseTime": 120,
        "message": "Stripe API connection successful (120ms)",
        "timestamp": "2024-01-14T10:00:00.000Z"
      }
      // ... more services
    ]
  }
}
```

### 2. Individual Service Health Checks

**Endpoint:** `/api/health/[service]`

Returns health status for a specific service. Perfect for granular monitoring in Better Stack.

**Available Services:**

- `vercel` - Vercel deployment status
- `neon-database` - Main Neon PostgreSQL database
- `audit-database` - Audit log database
- `stripe` - Stripe payment API
- `clerk` - Clerk authentication API
- `upstash-redis` - Redis cache
- `upstash-qstash` - QStash job queue
- `resend` - Resend email service
- `posthog` - PostHog analytics
- `novu` - Novu notification service

**List All Services:**

```bash
curl https://eleva.care/api/health/_list
```

**Check Individual Service:**

```bash
curl https://eleva.care/api/health/stripe
```

**Response Format:**

```json
{
  "service": "stripe",
  "status": "healthy" | "degraded" | "down",
  "responseTime": 120,
  "message": "Stripe API connection successful (120ms)",
  "timestamp": "2024-01-14T10:00:00.000Z",
  "details": {
    // Service-specific details
  },
  "error": "Error message if any"
}
```

## Better Stack Setup

### Step 1: Create Monitors

#### Option A: Overall System Monitor

1. Log in to Better Stack
2. Navigate to **Uptime** → **Monitors**
3. Click **Create Monitor**
4. Configure:
   - **Monitor Type:** HTTP(S)
   - **URL:** `https://eleva.care/api/healthcheck?services=true`
   - **Name:** Eleva Care - System Health
   - **Check Frequency:** 60 seconds
   - **Expected Status Codes:** `200`
   - **Request Timeout:** 30 seconds
   - **Regions:** Select multiple regions for redundancy

#### Option B: Individual Service Monitors

Create separate monitors for each critical service:

1. **Stripe Monitor:**
   - **URL:** `https://eleva.care/api/health/stripe`
   - **Name:** Eleva Care - Stripe API
   - **Expected Status:** `200`

2. **Database Monitor:**
   - **URL:** `https://eleva.care/api/health/neon-database`
   - **Name:** Eleva Care - Database
   - **Expected Status:** `200`

3. **Clerk Auth Monitor:**
   - **URL:** `https://eleva.care/api/health/clerk`
   - **Name:** Eleva Care - Authentication
   - **Expected Status:** `200`

4. **Redis Cache Monitor:**
   - **URL:** `https://eleva.care/api/health/upstash-redis`
   - **Name:** Eleva Care - Cache
   - **Expected Status:** `200`

5. **Email Service Monitor:**
   - **URL:** `https://eleva.care/api/health/resend`
   - **Name:** Eleva Care - Email
   - **Expected Status:** `200`

6. **Notification Service Monitor:**
   - **URL:** `https://eleva.care/api/health/novu`
   - **Name:** Eleva Care - Notifications
   - **Expected Status:** `200`

7. **Job Queue Monitor:**
   - **URL:** `https://eleva.care/api/health/upstash-qstash`
   - **Name:** Eleva Care - Job Queue
   - **Expected Status:** `200`

8. **Analytics Monitor:**
   - **URL:** `https://eleva.care/api/health/posthog`
   - **Name:** Eleva Care - Analytics
   - **Expected Status:** `200`

### Step 2: Create Status Page

1. Navigate to **Status Pages** → **Create Status Page**
2. Configure basic settings:
   - **Company Name:** Eleva Care
   - **URL:** `status.eleva.care` (or use Better Stack subdomain)
   - **Timezone:** Your timezone
   - **Theme:** Choose your brand colors

3. Add Resources to Status Page:
   - Click **Add Resource**
   - Select the monitors you created
   - Organize into sections:

**Recommended Sections:**

```
Core Platform
├── System Health (Overall monitor)
└── Database

Authentication & Security
├── Clerk Authentication
└── Stripe Payments

Infrastructure
├── Redis Cache
├── Job Queue
└── Vercel Hosting

Communication
├── Email Service
└── Notifications

Analytics
└── PostHog
```

### Step 3: Configure Notifications

1. Navigate to **Incident Management** → **Notification Channels**
2. Add channels:
   - Email (team emails)
   - Slack (ops channel)
   - PagerDuty (on-call rotation)
   - SMS (critical alerts only)

3. Create Escalation Policies:
   - **Critical Services** (Database, Authentication, Payments)
     - Immediate notification to on-call
     - Escalate after 5 minutes
   - **Standard Services** (Email, Analytics)
     - Notify team channel
     - Escalate after 15 minutes

### Step 4: Set Up Maintenance Windows

For planned maintenance:

1. Navigate to **Status Pages** → **Your Status Page** → **Maintenance**
2. Schedule maintenance window
3. Better Stack will automatically:
   - Pause monitors
   - Update status page
   - Notify subscribers

## HTTP Status Codes

Our health check endpoints follow these conventions:

| Status Code | Health Status | Description                                              |
| ----------- | ------------- | -------------------------------------------------------- |
| `200`       | Healthy       | Service is operational                                   |
| `200`       | Degraded      | Service is operational with warnings (still returns 200) |
| `503`       | Down          | Service is unavailable or experiencing issues            |

Better Stack monitors should be configured to alert on:

- Status code `!= 200` (critical alert)
- Response time > 5000ms (warning)
- Failed check 3 times in a row (critical alert)

## Response Time Monitoring

Each service health check includes `responseTime` in milliseconds. Better Stack automatically tracks and graphs these metrics.

**Recommended Thresholds:**

- Database: < 100ms
- External APIs: < 500ms
- Cache: < 50ms
- Overall health: < 2000ms

## Best Practices

### 1. Monitor Placement

- **Overall Health Monitor:** Use for high-level system status
- **Individual Service Monitors:** Use for granular incident detection and status page resources

### 2. Alert Configuration

- **Critical Services:** Stripe, Database, Clerk
  - Alert immediately
  - Escalate after 5 minutes
  - SMS notifications

- **Important Services:** Redis, QStash, Email
  - Alert after 2 failed checks
  - Escalate after 10 minutes
  - Email/Slack notifications

- **Secondary Services:** PostHog, Analytics
  - Alert after 3 failed checks
  - Escalate after 15 minutes
  - Email notifications only

### 3. Status Page Configuration

- **Public Status Page:** Show overall health + critical services
- **Internal Dashboard:** Show all services with detailed metrics
- **Incident History:** Keep 90 days visible
- **Maintenance Schedule:** Post 48 hours in advance

### 4. Check Frequency

- **Production:**
  - Critical services: Every 30 seconds
  - Standard services: Every 60 seconds
  - Overall health: Every 60 seconds

- **Staging:**
  - All services: Every 5 minutes

## Testing Your Setup

### Test Individual Service Health

```bash
# Check all services are listed
curl https://eleva.care/api/health/_list

# Test each service
curl https://eleva.care/api/health/stripe
curl https://eleva.care/api/health/neon-database
curl https://eleva.care/api/health/clerk
curl https://eleva.care/api/health/upstash-redis
curl https://eleva.care/api/health/resend
curl https://eleva.care/api/health/novu
```

### Test Overall Health

```bash
# Basic health check
curl https://eleva.care/api/healthcheck

# With services summary
curl https://eleva.care/api/healthcheck?services=true

# With full details
curl https://eleva.care/api/healthcheck?detailed=true
```

### Simulate Failure

To test your alerting:

1. Temporarily remove an API key (e.g., `STRIPE_SECRET_KEY`)
2. Wait for Better Stack to detect the failure
3. Verify you receive alerts
4. Restore the API key
5. Verify recovery notifications

## Troubleshooting

### Monitor Shows Down but Service Works

**Possible Causes:**

- Rate limiting (too frequent checks)
- Geographic restrictions
- Firewall blocking Better Stack IPs

**Solutions:**

- Increase check interval to 60+ seconds
- Whitelist Better Stack IP ranges
- Check response time thresholds

### False Positives

**Possible Causes:**

- Network latency
- Cold starts (serverless)
- Temporary API rate limits

**Solutions:**

- Require 2-3 failed checks before alerting
- Increase timeout to 30 seconds
- Add retry logic

### Missing Service Status

**Causes:**

- Service not configured in environment variables
- Health check function not implemented
- API credentials expired

**Solutions:**

- Verify all environment variables are set
- Check service configuration in `/lib/service-health.ts`
- Rotate API credentials if expired

## Integration with PostHog

All health checks are automatically tracked in PostHog:

**Events:**

- `health_check_success` - Successful health check
- `health_check_failed` - Failed health check

**Properties:**

- Service status
- Response times
- Error details
- Source (Better Stack, CI/CD, etc.)

## Integration with Novu

Critical health check failures trigger Novu notifications to the admin subscriber:

**Notification Triggers:**

- Overall system unhealthy
- Database connection failure
- Critical service down > 5 minutes

## Maintenance

### Monthly Tasks

- [ ] Review alert thresholds
- [ ] Check false positive rate
- [ ] Update monitor configurations
- [ ] Review incident response times
- [ ] Update status page styling

### Quarterly Tasks

- [ ] Review and update escalation policies
- [ ] Test disaster recovery procedures
- [ ] Audit notification channels
- [ ] Review historical incident data
- [ ] Update documentation

## API Reference

### GET /api/healthcheck

**Query Parameters:**

- `detailed` (boolean) - Include full service details
- `services` (boolean) - Include service summary

**Response:** HealthCheckData object

### GET /api/health/[service]

**Path Parameters:**

- `service` (string) - Service name to check

**Response:** ServiceHealthResult object

### GET /api/health/\_list

**Response:** List of available services

## Resources

- [Better Stack Documentation](https://betterstack.com/docs/uptime/)
- [Better Stack API Reference](https://betterstack.com/docs/uptime/api/)
- [Status Page Best Practices](https://betterstack.com/docs/uptime/status-pages/)
- [Incident Response Guide](https://betterstack.com/docs/uptime/incident-management/)

## Support

For issues with Better Stack integration:

1. Check the [troubleshooting section](#troubleshooting)
2. Review Better Stack logs
3. Contact Better Stack support
4. Open an issue in the Eleva Care repository
