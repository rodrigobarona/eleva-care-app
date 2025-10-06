# Better Stack Quick Reference

## Health Check Endpoints

### Overall System Health

```bash
# Basic health check
GET https://eleva.care/api/healthcheck

# With service summary
GET https://eleva.care/api/healthcheck?services=true

# With full details
GET https://eleva.care/api/healthcheck?detailed=true
```

### Individual Services

```bash
# List all available services
GET https://eleva.care/api/health/_list

# Check specific services
GET https://eleva.care/api/health/vercel
GET https://eleva.care/api/health/neon-database
GET https://eleva.care/api/health/audit-database
GET https://eleva.care/api/health/stripe
GET https://eleva.care/api/health/clerk
GET https://eleva.care/api/health/upstash-redis
GET https://eleva.care/api/health/upstash-qstash
GET https://eleva.care/api/health/resend
GET https://eleva.care/api/health/posthog
GET https://eleva.care/api/health/novu
```

## Monitor Configuration

### Critical Services (30-60s intervals)

- **Database:** `/api/health/neon-database`
- **Authentication:** `/api/health/clerk`
- **Payments:** `/api/health/stripe`

### Standard Services (60s intervals)

- **Cache:** `/api/health/upstash-redis`
- **Job Queue:** `/api/health/upstash-qstash`
- **Email:** `/api/health/resend`
- **Notifications:** `/api/health/novu`

### Secondary Services (5min intervals)

- **Analytics:** `/api/health/posthog`
- **Overall System:** `/api/healthcheck?services=true`

## Status Codes

| Code | Status   | Action              |
| ---- | -------- | ------------------- |
| 200  | Healthy  | ✅ No action needed |
| 200  | Degraded | ⚠️ Monitor closely  |
| 503  | Down     | 🚨 Immediate alert  |

## Expected Response Times

| Service        | Expected | Alert Threshold |
| -------------- | -------- | --------------- |
| Database       | < 100ms  | > 500ms         |
| Cache          | < 50ms   | > 200ms         |
| External APIs  | < 500ms  | > 2000ms        |
| Overall Health | < 2000ms | > 5000ms        |

## Better Stack Monitor Settings

```yaml
Monitor Configuration:
  - Check Frequency: 30-60 seconds
  - Request Timeout: 30 seconds
  - Expected Status: 200
  - Failed Checks Before Alert: 2
  - Regions: Multiple (for redundancy)

Alert Settings:
  - Critical: Database, Auth, Payments
  - Important: Cache, Queue, Email
  - Secondary: Analytics, Overall
```

## Status Page Sections

```
📊 Core Platform
├── System Health
└── Database

🔐 Authentication & Security
├── Authentication (Clerk)
└── Payments (Stripe)

⚙️ Infrastructure
├── Cache (Redis)
├── Job Queue (QStash)
└── Hosting (Vercel)

📬 Communication
├── Email (Resend)
└── Notifications (Novu)

📈 Analytics
└── PostHog
```

## Quick Test Commands

```bash
# Test all services
curl -s https://eleva.care/api/health/_list | jq '.services[]'

# Check each service
for service in vercel neon-database stripe clerk upstash-redis upstash-qstash resend posthog novu; do
  echo "Testing $service..."
  curl -s "https://eleva.care/api/health/$service" | jq '.status'
done

# Full system check
curl -s "https://eleva.care/api/healthcheck?detailed=true" | jq '.services'
```

## Troubleshooting

### Service Shows Down

1. Check service endpoint directly
2. Verify API keys in environment
3. Check rate limits
4. Review service status page

### High Response Times

1. Check database queries
2. Review external API latency
3. Check network connectivity
4. Monitor resource usage

### False Positives

1. Increase check interval
2. Require multiple failed checks
3. Increase timeout threshold
4. Check Better Stack IP allowlist

## Common Fixes

```bash
# Verify environment variables
curl -s https://eleva.care/api/healthcheck | jq '.config'

# Check specific service
curl -v https://eleva.care/api/health/stripe

# Test with timeout
curl --max-time 30 https://eleva.care/api/healthcheck?services=true
```

## Maintenance Mode

When performing maintenance:

1. Schedule maintenance window in Better Stack
2. Monitors pause automatically
3. Status page updates
4. Subscribers notified

## Support Resources

- Full Guide: `/docs/03-infrastructure/monitoring/02-betterstack-integration.md`
- Health Check Monitoring: `/docs/03-infrastructure/monitoring/01-health-check-monitoring.md`
- Better Stack Docs: https://betterstack.com/docs/uptime/
