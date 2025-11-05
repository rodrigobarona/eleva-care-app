# BetterStack Monitoring Setup

## Quick Start Guide

This guide helps you set up BetterStack monitoring for the Eleva.Care application, with special focus on critical Stripe webhook monitoring.

## Prerequisites

- BetterStack account ([sign up here](https://betterstack.com))
- Production deployment URL
- Admin access to BetterStack dashboard

## Setup Steps

### 1. Create BetterStack Account

1. Go to [betterstack.com](https://betterstack.com)
2. Sign up with your company email
3. Verify your email address
4. Complete onboarding

### 2. Get API Credentials

1. Navigate to **Settings → API Tokens**
2. Click **Create API Token**
3. Name it: `Eleva.Care Production`
4. Permissions: Select **Read Monitors**
5. Copy the token
6. Add to `.env`:
   ```bash
   BETTERSTACK_API_KEY=your_api_key_here
   ```

### 3. Create Status Page (Optional)

1. Navigate to **Status Pages**
2. Click **Create Status Page**
3. Configure:
   - Name: `Eleva.Care Status`
   - URL: `status.eleva.care` (or custom domain)
   - Public visibility: Yes
4. Copy the status page URL
5. Add to `.env`:
   ```bash
   BETTERSTACK_URL=https://status.eleva.care
   ```

### 4. Set Up Critical Monitors

#### Monitor 1: Stripe Webhook Health (CRITICAL)

**Why:** Detects webhook processing failures before customers notice

```
Name: Stripe Webhook Health
URL: https://eleva.care/api/health/stripe-webhooks
Method: GET
Check Frequency: Every 3 minutes
Request Timeout: 10 seconds

Expected Status Code: 200
Alert When:
  - Status code is not 200
  - Response time > 5000ms
  - Check fails 2 times in a row

Recovery:
  - Monitor recovers after being down
```

**Alert Channels:**

- ✅ Email (your-email@company.com)
- ✅ Slack (#alerts-production)
- ✅ SMS (for critical only)

#### Monitor 2: Application Health

```
Name: Application Health
URL: https://eleva.care/api/healthcheck?detailed=true
Method: GET
Check Frequency: Every 5 minutes
Request Timeout: 15 seconds

Expected Status Code: 200
Alert When:
  - Status code is not 200
  - Response time > 10000ms
  - Check fails 3 times in a row
```

#### Monitor 3: Stripe API Health

```
Name: Stripe Service Health
URL: https://eleva.care/api/health/stripe
Method: GET
Check Frequency: Every 5 minutes
Request Timeout: 10 seconds

Expected Status Code: 200
Alert When:
  - Status code is not 200
  - Check fails 2 times in a row
```

#### Monitor 4: Database Health

```
Name: Neon Database Health
URL: https://eleva.care/api/health/neon-database
Method: GET
Check Frequency: Every 5 minutes
Request Timeout: 10 seconds

Expected Status Code: 200
Alert When:
  - Status code is not 200
  - Check fails 2 times in a row
```

#### Monitor 5: Redis Health

```
Name: Redis Cache Health
URL: https://eleva.care/api/health/upstash-redis
Method: GET
Check Frequency: Every 5 minutes
Request Timeout: 10 seconds

Expected Status Code: 200
Alert When:
  - Status code is not 200
  - Check fails 2 times in a row
```

### 5. Configure Alert Channels

#### Email Alerts

1. Navigate to **Alerting → Email**
2. Add email addresses:
   - `engineering@eleva.care` (all alerts)
   - `oncall@eleva.care` (critical only)
3. Set quiet hours if needed

#### Slack Integration

1. Navigate to **Integrations → Slack**
2. Click **Connect Slack**
3. Authorize BetterStack app
4. Configure channels:
   - `#alerts-production` → All monitors
   - `#alerts-critical` → Critical monitors only
5. Test integration

#### SMS Alerts (Optional)

1. Navigate to **Alerting → SMS**
2. Add phone number(s) with international code
3. Verify phone number
4. Assign to **Critical** monitors only
5. Set quiet hours (e.g., 11 PM - 7 AM)

### 6. Set Up Maintenance Windows

For planned deployments:

1. Navigate to **Maintenance Windows**
2. Click **Create Maintenance Window**
3. Configure:
   - Name: `Deployment - [Date]`
   - Duration: 30 minutes
   - Affected monitors: Select all
   - Notification: 15 minutes before
4. Schedule recurring for regular deployment windows

### 7. Configure Escalation Policies

1. Navigate to **Alerting → Escalation Policies**
2. Create policy: `Critical Incidents`
   ```
   Level 1 (0 min): On-call engineer (Slack + Email)
   Level 2 (15 min): Engineering lead (Email + SMS)
   Level 3 (30 min): CTO (SMS + Phone)
   ```
3. Assign to critical monitors

### 8. Set Up Status Page Widgets (Optional)

1. Go to your status page settings
2. Add components:
   - **Website** → Application Health monitor
   - **Payments** → Stripe Webhook Health monitor
   - **Database** → Database Health monitor
   - **API** → All API health monitors
3. Publish status page

### 9. Test Everything

#### Test Webhook Monitor

```bash
# 1. Check endpoint is accessible
curl https://eleva.care/api/health/stripe-webhooks | jq

# 2. Force webhook to fail (simulate issue)
# Stop Stripe webhook processing temporarily

# 3. Wait 3-6 minutes for BetterStack check

# 4. Verify alert received on all channels

# 5. Restore webhook processing

# 6. Verify recovery notification received
```

#### Test Alert Channels

1. Navigate to **Monitors → Stripe Webhook Health**
2. Click **Pause Monitor**
3. Click **Trigger Test Alert**
4. Verify alerts received on:
   - ✅ Email
   - ✅ Slack
   - ✅ SMS (if configured)
5. Unpause monitor

### 10. Document Runbook

Create incident response runbook:

1. Access [stripe-webhook-monitoring.md](../04-development/stripe-webhook-monitoring.md)
2. Review emergency response plan
3. Share with team
4. Add to oncall documentation

## Monitoring Dashboard

### Key Metrics to Watch

1. **Uptime Percentage**
   - Target: 99.9%
   - Alert if < 99.5%

2. **Response Time**
   - Webhook health: < 1s
   - Application health: < 3s
   - Database health: < 2s

3. **Incident Response Time**
   - Acknowledge: < 5 minutes
   - Investigation start: < 15 minutes
   - Resolution: < 1 hour

### Weekly Review Checklist

- [ ] Review all incidents from past week
- [ ] Check response time trends
- [ ] Verify all monitors are enabled
- [ ] Test alert channels monthly
- [ ] Update escalation policies if team changes
- [ ] Review and adjust alert thresholds

## Troubleshooting

### Common Issues

#### 1. False Positives for Webhook Health

**Symptom:** Alerts firing but webhooks are actually working

**Solution:**

- Check if success rate threshold is too strict
- Review recent failures for patterns
- Adjust alert threshold in monitor settings
- Consider increasing "fails X times in a row" setting

#### 2. Missing Alerts

**Symptom:** Issues occurring but no alerts received

**Solution:**

```bash
# 1. Verify monitor is enabled
# Check BetterStack dashboard

# 2. Test alert channels
# Use "Trigger Test Alert" feature

# 3. Check quiet hours settings
# Ensure alerts not suppressed

# 4. Verify webhook endpoints
# Slack webhooks, email addresses, etc.
```

#### 3. Too Many Alerts

**Symptom:** Alert fatigue from excessive notifications

**Solution:**

- Increase "fails X times in a row" threshold
- Adjust check frequency
- Set up quiet hours
- Use alert grouping
- Review and reduce monitor sensitivity

### Support

For BetterStack support:

- Documentation: [betterstack.com/docs](https://betterstack.com/docs)
- Support: support@betterstack.com
- Status: [status.betterstack.com](https://status.betterstack.com)

## Cost Optimization

### Free Tier Limits

- 10 monitors
- 3-minute check frequency
- Email alerts only
- 3 team members

### Recommended Plan

**Startup Plan** ($20/month):

- 20 monitors
- 1-minute check frequency
- Slack + SMS alerts
- 10 team members
- Incident management
- Status page

### Monitor Priority

If on free tier, prioritize:

1. ✅ Stripe Webhook Health (CRITICAL)
2. ✅ Application Health
3. ✅ Database Health
4. Stripe API Health
5. Redis Health

## Next Steps

After setup:

1. ✅ Review [Stripe Webhook Monitoring](../04-development/stripe-webhook-monitoring.md)
2. ✅ Set up Novu workflows for internal alerts
3. ✅ Configure incident response procedures
4. ✅ Train team on monitoring dashboard
5. ✅ Schedule weekly monitoring reviews
6. ✅ Document escalation procedures

## Maintenance

### Monthly Tasks

- [ ] Review and test all alert channels
- [ ] Verify monitor coverage for new features
- [ ] Update escalation policies for team changes
- [ ] Review incident response times
- [ ] Optimize alert thresholds based on data

### Quarterly Tasks

- [ ] Review BetterStack plan and usage
- [ ] Evaluate new monitoring features
- [ ] Update status page components
- [ ] Train new team members
- [ ] Audit and archive old incidents

## Resources

- [BetterStack Documentation](https://betterstack.com/docs)
- [BetterStack Blog](https://betterstack.com/blog)
- [Uptime Monitoring Best Practices](https://betterstack.com/blog/uptime-monitoring-best-practices)
- [Incident Response Guide](https://betterstack.com/docs/uptime/incident-management)
