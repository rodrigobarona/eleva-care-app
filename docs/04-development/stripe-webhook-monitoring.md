# Stripe Webhook Monitoring & Alerting

## Overview

This document describes the comprehensive monitoring and alerting system for Stripe webhooks. The system ensures you're immediately notified when webhook processing fails, preventing situations where issues go unnoticed until a customer reports them.

## Architecture

```
┌─────────────────┐
│  Stripe Event   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  Webhook Handler (/api/webhooks/stripe)    │
│  • Validates signature                      │
│  • Processes event                          │
│  • Records metrics (success/failure/time)   │
└────────┬─────────────────────┬──────────────┘
         │                     │
         │                     ▼
         │         ┌─────────────────────┐
         │         │  Redis Monitoring   │
         │         │  • Rolling window   │
         │         │  • Success rate     │
         │         │  • Processing time  │
         │         └──────────┬──────────┘
         │                    │
         │                    ▼
         │         ┌─────────────────────┐
         │         │  Auto Alert         │
         │         │  (if rate < 80%)    │
         │         └──────────┬──────────┘
         │                    │
         │                    ▼
         │         ┌─────────────────────┐
         │         │  Novu → Email/SMS   │
         │         └─────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  BetterStack Monitor                        │
│  GET /api/health/stripe-webhooks            │
│  • Checks success rate                      │
│  • Returns 200 (healthy) or 503 (unhealthy)│
│  • Triggers alerts if degraded              │
└─────────────────────────────────────────────┘
```

## Components

### 1. Webhook Monitoring (`lib/redis/webhook-monitor.ts`)

Tracks webhook processing in real-time using Redis:

- **Rolling Window**: Last 100 webhook events
- **Success Rate**: Percentage of successful vs failed webhooks
- **Processing Time**: Average processing time in milliseconds
- **Recent Failures**: Last 20 failures with error details

**Key Features:**

- Automatic alerting when success rate drops below 80%
- Rate limiting on alerts (max 1 alert per hour)
- Non-blocking (monitoring failures don't break webhooks)

### 2. Health Check Endpoint (`/api/health/stripe-webhooks`)

Dedicated health check endpoint for external monitoring services:

**Response Format:**

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-11-05T15:23:28.010Z",
  "metrics": {
    "totalProcessed": 150,
    "successCount": 145,
    "failureCount": 5,
    "successRate": 0.967,
    "lastSuccessTimestamp": "2025-11-05T15:20:00.000Z",
    "lastFailureTimestamp": "2025-11-05T14:30:00.000Z",
    "averageProcessingTimeMs": 234,
    "recentEvents": 100
  },
  "recentFailures": [
    {
      "eventId": "evt_123",
      "eventType": "checkout.session.completed",
      "error": "Invalid transfer metadata",
      "timestamp": "2025-11-05T14:30:00.000Z"
    }
  ],
  "config": {
    "webhookSecretConfigured": true,
    "stripeKeyConfigured": true,
    "novuConfigured": true
  },
  "alerts": [],
  "recommendations": []
}
```

**Health Status Logic:**

- **Healthy (200)**: Success rate ≥ 95%, processing time < 5s
- **Degraded (200)**: Success rate 80-95%, or processing time 5-10s
- **Unhealthy (503)**: Success rate < 80%, or no success in 1 hour with failures

### 3. Integrated Monitoring in Webhook Handler

The webhook handler automatically tracks:

- Processing time for each event
- Success/failure status
- Error messages for failures
- Event type and ID

## Setup Guide

### Step 1: BetterStack Configuration

1. **Create BetterStack Account**
   - Go to [betterstack.com](https://betterstack.com)
   - Sign up or log in

2. **Create New Monitor**

   ```
   Monitor Type: HTTP
   Name: Stripe Webhooks
   URL: https://eleva.care/api/health/stripe-webhooks
   Method: GET
   Check Frequency: Every 3 minutes
   ```

3. **Configure Alert Conditions**

   ```
   Alert when:
   - HTTP status code is not 200
   - Response time > 5000ms
   - Check fails 2 times in a row

   Alert channels:
   - Email: your-email@example.com
   - Slack: #alerts-production
   - SMS: +1-xxx-xxx-xxxx (optional)
   ```

4. **Set Recovery Notification**
   ```
   Notify when:
   - Monitor recovers after being down
   - Send to same channels as alerts
   ```

### Step 2: Environment Variables

Ensure these environment variables are configured:

```bash
# Required for webhook processing
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Required for monitoring
REDIS_URL=redis://...  # For tracking metrics

# Required for alerting (optional but recommended)
NOVU_SECRET_KEY=...
NOVU_ADMIN_SUBSCRIBER_ID=admin_user_id
```

### Step 3: Novu Workflow Setup (Optional)

Create a Novu workflow for webhook health alerts:

1. **Create Workflow**
   - Workflow ID: `webhook-health-alert`
   - Trigger identifier: `webhook-health-alert`

2. **Add Email Step**

   ```
   Subject: 🚨 Stripe Webhook Health Alert - {{provider}} Success Rate: {{successRate}}%

   Body:
   Critical webhook processing issue detected:

   Provider: {{provider}}
   Success Rate: {{successRate}}% ({{totalSuccess}} success, {{totalFailures}} failures)
   Last Failure: {{lastFailure}}

   Recent Failures:
   {{#each recentFailures}}
   - [{{timestamp}}] {{eventType}}: {{error}}
   {{/each}}

   View Details: {{healthUrl}}

   Action Required: Check server logs and Stripe webhook dashboard immediately.
   ```

3. **Configure Recipient**
   - Subscriber ID: Value from `NOVU_ADMIN_SUBSCRIBER_ID`

### Step 4: Stripe Dashboard Configuration

1. **Go to Stripe Dashboard**
   - Navigate to Developers → Webhooks

2. **Verify Webhook Endpoint**
   - Endpoint: `https://eleva.care/api/webhooks/stripe`
   - Status: Should show "Enabled"

3. **Monitor Recent Deliveries**
   - Check for failed deliveries
   - Review error messages

4. **Configure Retry Settings** (Recommended)
   ```
   Automatic retries: Enabled
   Retry attempts: 3
   Retry schedule:
     - 1st retry: 5 minutes
     - 2nd retry: 30 minutes
     - 3rd retry: 2 hours
   ```

## Monitoring Thresholds

### Critical Alerts (Unhealthy - 503)

- Success rate < 80%
- No successful webhooks in 1+ hour (with failures present)
- Missing configuration (webhook secret not set)

**Action Required:** Immediate investigation

### Warning Alerts (Degraded - 200)

- Success rate 80-95%
- Processing time > 5 seconds
- Recent failures present

**Action Required:** Monitor closely, investigate patterns

### Healthy (200)

- Success rate ≥ 95%
- Processing time < 5 seconds
- Configuration properly set

**Action Required:** None, system operating normally

## Troubleshooting

### Common Issues

#### 1. Webhook Failing with "Invalid signature"

**Symptoms:**

- HTTP 400 errors in Stripe dashboard
- "signature_verification" failures in monitoring

**Solution:**

```bash
# Verify webhook secret is correct
echo $STRIPE_WEBHOOK_SECRET

# Check Stripe Dashboard → Developers → Webhooks
# Ensure secret matches the one in environment variables

# If using multiple environments, ensure correct secret for environment
```

#### 2. Metadata Validation Errors

**Symptoms:**

- "Invalid transfer metadata structure" errors
- checkout.session.completed events failing

**Solution:**

- Check the metadata schema in `/app/api/webhooks/stripe/route.ts`
- Verify metadata creation in `/app/api/create-payment-intent/route.ts`
- Ensure all required fields are present and have correct types

#### 3. High Processing Time (> 5s)

**Symptoms:**

- Degraded status in health checks
- Slow webhook processing

**Solution:**

```bash
# Check database performance
# Optimize slow queries
# Review meeting creation logic
# Check external API calls (Google Calendar, Novu)
```

#### 4. Redis Connection Issues

**Symptoms:**

- Monitoring data not updating
- Health check fails with connection errors

**Solution:**

```bash
# Verify Redis connection
echo $REDIS_URL

# Test Redis connectivity
# Check Redis service status
# Review connection pooling configuration
```

### Debugging Commands

```bash
# View recent webhook events in Stripe CLI
stripe events list --limit 10

# Test webhook locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test webhook
stripe trigger checkout.session.completed

# Check webhook health
curl https://eleva.care/api/health/stripe-webhooks | jq

# Reset monitoring stats (if needed)
# This requires adding a reset endpoint or using Redis CLI
redis-cli DEL webhook:stripe:events
redis-cli DEL webhook:stripe:success_count
redis-cli DEL webhook:stripe:failure_count
```

## Maintenance

### Regular Checks (Weekly)

1. Review BetterStack dashboard for any incidents
2. Check success rate trends
3. Review processing time trends
4. Verify alert channels are working

### Monthly Reviews

1. Analyze failure patterns
2. Review and update alert thresholds if needed
3. Test alert delivery channels
4. Update documentation for any changes

### Emergency Response Plan

#### When Webhook Health Alert Fires:

1. **Immediate (< 5 minutes)**
   - Check BetterStack dashboard for current status
   - Access `/api/health/stripe-webhooks` for detailed metrics
   - Review Stripe Dashboard → Webhooks for recent failures

2. **Investigation (< 15 minutes)**
   - Check Vercel logs for error details
   - Review recent deployments (possible cause)
   - Check Redis connectivity
   - Verify environment variables

3. **Mitigation (< 30 minutes)**
   - If deployment issue: Rollback to previous version
   - If configuration issue: Fix environment variables
   - If external service issue: Check status pages
   - If metadata issue: Review and fix schema

4. **Communication**
   - Notify team via Slack/Discord
   - Update status page if customer-facing
   - Document incident in incident log

5. **Follow-up (< 24 hours)**
   - Conduct post-mortem
   - Update monitoring thresholds if needed
   - Add tests to prevent recurrence
   - Update runbook with learnings

## API Reference

### GET /api/health/stripe-webhooks

Health check endpoint for Stripe webhook processing.

**Response Codes:**

- `200`: Healthy or degraded (but functional)
- `503`: Unhealthy (critical issues)

**Headers:**

- `X-Webhook-Status`: Current status (healthy|degraded|unhealthy)
- `X-Success-Rate`: Success rate as decimal (0.0-1.0)

**Query Parameters:** None

**Rate Limiting:** None (health checks should not be rate limited)

## Testing

### Test Webhook Monitoring

```bash
# 1. Trigger a successful webhook
curl -X POST https://eleva.care/api/webhooks/stripe \
  -H "stripe-signature: <valid-signature>" \
  -d @test-event.json

# 2. Check health endpoint
curl https://eleva.care/api/health/stripe-webhooks | jq

# 3. Verify metrics updated
# Should show successCount incremented

# 4. Trigger a failure (invalid signature)
curl -X POST https://eleva.care/api/webhooks/stripe \
  -H "stripe-signature: invalid" \
  -d @test-event.json

# 5. Check health endpoint again
curl https://eleva.care/api/health/stripe-webhooks | jq

# 6. Verify metrics show failure
# Should show failureCount incremented
```

### Test BetterStack Integration

```bash
# 1. Manually trigger unhealthy state
# (Simulate high failure rate in Redis)

# 2. Wait for BetterStack check (3 minutes)

# 3. Verify alert received via configured channels

# 4. Reset to healthy state

# 5. Verify recovery notification received
```

## Performance Impact

The monitoring system is designed to have minimal performance impact:

- **Per-webhook overhead**: < 10ms
- **Redis operations**: Fire-and-forget (non-blocking)
- **Failed monitoring**: Does not affect webhook processing
- **Memory usage**: ~1KB per 100 events (rolling window)

## Security Considerations

1. **Webhook Secret**: Never expose in logs or error messages
2. **Health Endpoint**: No authentication required (only exposes aggregated metrics)
3. **Redis Data**: Expires after 7 days (automatic cleanup)
4. **Alert Data**: Contains error messages but no sensitive customer data

## Future Enhancements

- [ ] Add webhook event type breakdown in metrics
- [ ] Implement predictive alerting based on trends
- [ ] Add Slack integration for real-time notifications
- [ ] Create dashboard for historical webhook analytics
- [ ] Add performance regression detection
- [ ] Implement automatic recovery actions
- [ ] Add correlation with deployment events

## Resources

- [BetterStack Documentation](https://betterstack.com/docs)
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Novu Documentation](https://docs.novu.co)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)

## Support

For issues or questions:

1. Check this documentation first
2. Review recent Vercel logs
3. Check Stripe webhook dashboard
4. Contact team lead if issue persists
