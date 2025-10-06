# Better Stack Health Monitoring Implementation

## Summary

We've enhanced the Eleva Care health monitoring system to be fully compatible with Better Stack status page monitoring. The implementation includes comprehensive service health checks for all external dependencies and APIs.

## What's New

### 1. Service Health Check Library (`lib/service-health.ts`)

A comprehensive utility library that provides health check functions for all external services:

- **Vercel** - Deployment and hosting status
- **Neon Database** - Main PostgreSQL database connectivity
- **Audit Database** - Audit log database connectivity
- **Stripe** - Payment API connectivity
- **Clerk** - Authentication API connectivity
- **Upstash Redis** - Cache connectivity and performance
- **Upstash QStash** - Job queue connectivity
- **Resend** - Email service API
- **PostHog** - Analytics service API
- **Novu** - Notification service API

Each health check returns:

- Service status (`healthy`, `degraded`, or `down`)
- Response time in milliseconds
- Detailed error messages if applicable
- Service-specific metadata

### 2. Enhanced Main Health Check (`/api/healthcheck`)

**New Features:**

- Query parameter `?services=true` for service summary
- Query parameter `?detailed=true` for full service details
- Auto-detection of Better Stack monitoring requests
- Proper HTTP status codes (200 for healthy, 503 for unhealthy)
- Support for `degraded` state (partial outage)

**Example Requests:**

```bash
# Basic health check
curl https://eleva.care/api/healthcheck

# With service summary
curl https://eleva.care/api/healthcheck?services=true

# With full service details
curl https://eleva.care/api/healthcheck?detailed=true
```

### 3. Individual Service Health Endpoints (`/api/health/[service]`)

New dynamic route for granular service monitoring:

**List all services:**

```bash
curl https://eleva.care/api/health/_list
```

**Check individual services:**

```bash
curl https://eleva.care/api/health/stripe
curl https://eleva.care/api/health/neon-database
curl https://eleva.care/api/health/clerk
# ... etc
```

**Response Format:**

```json
{
  "service": "stripe",
  "status": "healthy",
  "responseTime": 145,
  "message": "Stripe API connection successful (145ms)",
  "timestamp": "2024-01-14T10:00:00.000Z"
}
```

## Files Created/Modified

### New Files

- `lib/service-health.ts` - Service health check utilities
- `app/api/health/[service]/route.ts` - Individual service health endpoint
- `docs/03-infrastructure/monitoring/02-betterstack-integration.md` - Full integration guide
- `docs/03-infrastructure/monitoring/betterstack-quick-reference.md` - Quick reference guide
- `docs/03-infrastructure/monitoring/BETTERSTACK-IMPLEMENTATION.md` - This file

### Modified Files

- `app/api/healthcheck/route.ts` - Enhanced with service checks
- `docs/03-infrastructure/monitoring/01-health-check-monitoring.md` - Updated with new endpoints

## Architecture

```
┌─────────────────────────────────────────────┐
│         Better Stack Monitors               │
└─────────────────┬───────────────────────────┘
                  │
    ┌─────────────┴──────────────┐
    │                            │
    ▼                            ▼
┌────────────────┐    ┌────────────────────┐
│ Main Health    │    │ Individual Service │
│ /api/healthcheck│   │ /api/health/[svc]  │
└────────┬───────┘    └────────┬───────────┘
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Service Health Lib  │
         │ lib/service-health.ts│
         └──────────┬───────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
    ┌────▼─────┐         ┌────▼─────┐
    │ Internal │         │ External │
    │ Services │         │   APIs   │
    │          │         │          │
    │ - Neon   │         │ - Stripe │
    │ - Redis  │         │ - Clerk  │
    │ - QStash │         │ - Resend │
    │ - Vercel │         │ - Novu   │
    └──────────┘         └──────────┘
```

## Integration with Existing Systems

### PostHog Analytics ✅

All health checks continue to be tracked in PostHog:

- `health_check_success` events
- `health_check_failed` events
- Service status and response time metrics

### Novu Notifications ✅

Critical health failures trigger Novu notifications:

- System unhealthy states
- Database connection failures
- Critical service outages

### QStash Monitoring ✅

Maintains compatibility with existing QStash health checks:

- Header detection (`x-qstash-request`)
- Test message handling
- Scheduled health probes

## Testing the Implementation

### 1. Test Service Health Library

```bash
# Start the dev server
pnpm dev

# Test individual services
curl http://localhost:3000/api/health/stripe
curl http://localhost:3000/api/health/neon-database
curl http://localhost:3000/api/health/clerk
curl http://localhost:3000/api/health/upstash-redis
curl http://localhost:3000/api/health/resend
curl http://localhost:3000/api/health/novu
```

### 2. Test Enhanced Main Health Check

```bash
# Basic check
curl http://localhost:3000/api/healthcheck

# With services summary
curl http://localhost:3000/api/healthcheck?services=true

# With full details
curl http://localhost:3000/api/healthcheck?detailed=true
```

### 3. Test List Endpoint

```bash
# Get all available services
curl http://localhost:3000/api/health/_list
```

### 4. Automated Test Script

Create a test script `test-health.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "🧪 Testing Health Check System"
echo "================================"

# Test main health check
echo ""
echo "1️⃣ Testing main health check..."
curl -s "$BASE_URL/api/healthcheck" | jq '.status'

# Test with services
echo ""
echo "2️⃣ Testing health check with services..."
curl -s "$BASE_URL/api/healthcheck?services=true" | jq '.services.summary'

# Test service list
echo ""
echo "3️⃣ Listing available services..."
curl -s "$BASE_URL/api/health/_list" | jq '.services'

# Test each service
echo ""
echo "4️⃣ Testing individual services..."
SERVICES=("stripe" "neon-database" "clerk" "upstash-redis" "resend" "novu")

for service in "${SERVICES[@]}"; do
  echo "   Testing $service..."
  STATUS=$(curl -s "$BASE_URL/api/health/$service" | jq -r '.status')
  RESPONSE_TIME=$(curl -s "$BASE_URL/api/health/$service" | jq -r '.responseTime')
  echo "   ✅ $service: $STATUS (${RESPONSE_TIME}ms)"
done

echo ""
echo "================================"
echo "✅ All tests completed!"
```

Run with:

```bash
chmod +x test-health.sh
./test-health.sh
```

## Setting Up Better Stack

### Quick Setup (5 minutes)

1. **Create Better Stack Account**
   - Sign up at [betterstack.com](https://betterstack.com)
   - Navigate to Uptime monitoring

2. **Create Monitors**

   **Option A: Quick Setup (Overall Health)**

   ```
   URL: https://eleva.care/api/healthcheck?services=true
   Check Frequency: 60 seconds
   Expected Status: 200
   ```

   **Option B: Granular Setup (Individual Services)**

   ```
   Stripe:    https://eleva.care/api/health/stripe
   Database:  https://eleva.care/api/health/neon-database
   Auth:      https://eleva.care/api/health/clerk
   Cache:     https://eleva.care/api/health/upstash-redis
   Email:     https://eleva.care/api/health/resend
   Notify:    https://eleva.care/api/health/novu
   ```

3. **Create Status Page**
   - Go to Status Pages → Create
   - Add the monitors you created
   - Organize into sections (Core, Infrastructure, Communication)
   - Publish!

### Detailed Setup

See the comprehensive guide: [Better Stack Integration Guide](./02-betterstack-integration.md)

## Expected Response Times

| Service        | Healthy Threshold | Alert Threshold |
| -------------- | ----------------- | --------------- |
| Database       | < 100ms           | > 500ms         |
| Redis          | < 50ms            | > 200ms         |
| Stripe API     | < 500ms           | > 2000ms        |
| Clerk API      | < 500ms           | > 2000ms        |
| Resend API     | < 500ms           | > 2000ms        |
| Novu API       | < 500ms           | > 2000ms        |
| PostHog        | < 1000ms          | > 3000ms        |
| Overall Health | < 2000ms          | > 5000ms        |

## Status Meanings

| Status     | HTTP Code | Meaning                         | Action       |
| ---------- | --------- | ------------------------------- | ------------ |
| `healthy`  | 200       | Service fully operational       | ✅ No action |
| `degraded` | 200       | Service operational with issues | ⚠️ Monitor   |
| `down`     | 503       | Service unavailable             | 🚨 Alert     |

## Troubleshooting

### Service Shows Down Locally

**Symptoms:** Individual service endpoint returns `down` status

**Possible Causes:**

1. Missing environment variable
2. API credentials expired
3. Network connectivity issue
4. Service actually down

**Solutions:**

```bash
# Check environment variables
curl http://localhost:3000/api/healthcheck | jq '.config'

# Check specific service
curl -v http://localhost:3000/api/health/stripe

# Review logs
# Check console output for error messages
```

### High Response Times

**Symptoms:** Health checks take > 2 seconds

**Possible Causes:**

1. Cold start (serverless)
2. Network latency
3. Database query performance
4. External API slowness

**Solutions:**

- Review the `responseTime` field in the response
- Check which service is slow
- Optimize that specific service

### False Positives in Production

**Symptoms:** Better Stack reports service down but it's working

**Possible Causes:**

1. Rate limiting
2. Geographic restrictions
3. Firewall rules

**Solutions:**

- Increase check frequency to 60+ seconds
- Whitelist Better Stack IP ranges
- Check service logs for rate limit errors

## Next Steps

1. ✅ Test locally (use the test script above)
2. ⬜ Deploy to staging
3. ⬜ Create Better Stack monitors
4. ⬜ Set up status page
5. ⬜ Configure alerts
6. ⬜ Test incident response
7. ⬜ Deploy to production

## Support

- **Full Guide:** [Better Stack Integration](./02-betterstack-integration.md)
- **Quick Reference:** [Quick Reference](./betterstack-quick-reference.md)
- **Health Check Docs:** [Health Check Monitoring](./01-health-check-monitoring.md)

## Maintenance

### Weekly

- [ ] Review alert frequency
- [ ] Check false positive rate
- [ ] Review response times

### Monthly

- [ ] Update alert thresholds
- [ ] Review incident history
- [ ] Test disaster recovery

### Quarterly

- [ ] Review escalation policies
- [ ] Audit notification channels
- [ ] Update documentation
