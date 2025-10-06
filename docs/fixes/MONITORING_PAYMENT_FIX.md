# 🔍 Monitoring Guide: Payment Calendar & Email Fix

## Quick Start - What to Monitor

### ✅ Success Indicators

Look for these log entries after a successful payment:

```bash
# 1. Payment webhook received
🎉 Processing checkout.session.completed event

# 2. Calendar event created
🚀 Creating Google Calendar event...
✅ Calendar event created successfully

# 3. Emails sent
✅ Expert notification email sent successfully
✅ Client notification email sent successfully

# 4. Novu notification (optional)
✅ Novu notification workflow triggered successfully
```

### ❌ Error Indicators

Watch for these patterns:

```bash
# Calendar creation failures
❌ Failed to create calendar event
❌ Error creating meeting

# Email failures
❌ Failed to send expert notification email
❌ Failed to send client notification email

# Novu failures (NON-BLOCKING - won't affect payment)
⚠️ Novu notification failed (non-blocking)

# Critical webhook failures
❌ Error in checkout.session.completed handler
```

---

## 📊 Production Monitoring Commands

### Real-Time Log Monitoring

```bash
# Monitor all payment-related logs
tail -f /var/log/app.log | grep -E "🎉|📅|✅|❌|⚠️"

# Monitor only errors
tail -f /var/log/app.log | grep -E "❌|⚠️"

# Monitor successful email sends
tail -f /var/log/app.log | grep "✅.*email sent successfully"

# Monitor calendar events
tail -f /var/log/app.log | grep "Calendar event created"
```

### Vercel Logs (If using Vercel)

```bash
# Real-time logs
vercel logs --follow

# Filter for payment events
vercel logs --follow | grep "checkout.session.completed"

# Filter for errors
vercel logs --follow | grep -i "error"
```

---

## 🧪 Test Scenarios

### Test 1: Card Payment (Immediate Confirmation)

**Steps:**

1. Complete a test payment using a card
2. Monitor logs for the expected sequence
3. Verify calendar event created
4. Check both expert and client inboxes

**Expected Results:**

- ✅ Webhook processed in < 5 seconds
- ✅ Calendar event with Google Meet link
- ✅ 2 confirmation emails sent
- ✅ Meeting record in database

### Test 2: Multibanco Payment (Deferred Confirmation)

**Steps:**

1. Initiate Multibanco payment
2. Check slot reservation created
3. Simulate payment completion
4. Monitor deferred calendar creation

**Expected Results:**

- ✅ Slot reservation created with 7-day expiry
- ✅ After payment: Calendar event created
- ✅ 2 confirmation emails sent
- ✅ Slot reservation cleaned up

---

## 📈 Key Metrics to Track

### Performance Metrics

| Metric                  | Target | Alert Threshold |
| ----------------------- | ------ | --------------- |
| Webhook Processing Time | < 5s   | > 10s           |
| Calendar Creation Time  | < 3s   | > 5s            |
| Email Delivery Time     | < 2s   | > 5s            |
| Success Rate            | > 99%  | < 95%           |

### Error Rate Monitoring

```sql
-- Query to check error rates (if using database logging)
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_payments,
  SUM(CASE WHEN meeting_url IS NULL THEN 1 ELSE 0 END) as missing_calendar,
  SUM(CASE WHEN email_sent = false THEN 1 ELSE 0 END) as missing_emails
FROM meetings
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

---

## 🚨 Alert Conditions

### Critical Alerts (Immediate Action)

1. **No calendar events created in last hour**

   ```
   Alert: Zero calendar events created for successful payments
   Impact: High - customers not receiving meeting links
   Action: Check Google OAuth tokens, verify calendar service
   ```

2. **Email delivery failures > 5%**

   ```
   Alert: High email delivery failure rate
   Impact: High - customers not receiving confirmations
   Action: Check email service API key, verify Resend status
   ```

3. **Webhook processing failures > 1%**
   ```
   Alert: Webhooks failing to process
   Impact: Critical - payments succeeding but bookings not created
   Action: Check webhook logs, verify Stripe webhook secret
   ```

### Warning Alerts (Monitor)

1. **Novu notifications failing**

   ```
   Alert: Novu workflows failing
   Impact: Low - main flow continues working
   Action: Check Novu API key and workflow configuration
   ```

2. **Slow webhook processing (> 10s)**
   ```
   Alert: Webhooks processing slowly
   Impact: Medium - may timeout before completion
   Action: Check database queries, optimize if needed
   ```

---

## 🔧 Quick Fix Actions

### If Calendar Events Not Created

1. **Check OAuth Tokens:**

   ```typescript
   // In logs, look for:
   'No OAuth token found';
   'Error obtaining OAuth client';
   ```

   **Fix:** Expert needs to reconnect Google Calendar

2. **Verify Calendar Service:**
   ```bash
   # Test calendar service directly
   curl -X POST https://your-app.com/api/test-calendar
   ```

### If Emails Not Sent

1. **Check Email Service:**

   ```bash
   # Verify Resend API key
   curl https://api.resend.com/emails \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -H "Content-Type: application/json"
   ```

2. **Check Email Templates:**
   - Verify templates compile without errors
   - Test with sample data

### If Novu Failing (Non-Critical)

1. **Verify API Key:**

   ```bash
   # Check Novu connection
   curl https://api.novu.co/v1/environments \
     -H "Authorization: ApiKey $NOVU_API_KEY"
   ```

2. **Check Workflow Configuration:**
   - Verify workflows exist in Novu dashboard
   - Check payload schema matches

---

## 📞 Escalation Path

### Level 1: Application Logs

- Check application logs for error messages
- Verify all services are running
- Check API key configurations

### Level 2: Service Status

- Check Stripe dashboard for webhook delivery
- Check Google Cloud Console for API quota
- Check Resend dashboard for email delivery
- Check Novu dashboard for notification status

### Level 3: Code Investigation

- Review recent code changes
- Check for database migration issues
- Verify environment variables

### Level 4: External Support

- Contact Stripe support for webhook issues
- Contact Resend support for email issues
- Contact Novu support for notification issues

---

## 📋 Daily Checklist

- [ ] Check error rate in last 24 hours
- [ ] Verify calendar events created for all payments
- [ ] Confirm email delivery success rate > 99%
- [ ] Review any Novu notification failures
- [ ] Check webhook processing times
- [ ] Verify no timeout errors

---

## 🎯 Success Metrics (Week 1 Post-Deploy)

Track these metrics for the first week:

- **Calendar Event Creation Rate:** Should be 100% for successful payments
- **Email Delivery Rate:** Should be > 99%
- **Webhook Processing Time:** Should be < 5 seconds average
- **Error Rate:** Should be < 1%
- **Customer Complaints:** Should be zero regarding missing confirmations

---

**Last Updated:** October 6, 2025  
**Next Review:** October 13, 2025
