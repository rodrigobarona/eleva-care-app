# Novu Email Template Integration

## Overview

Your existing beautiful React Email templates are now fully integrated with Novu workflows! This integration combines:

- ✅ **Your existing templates**: `AppointmentConfirmation.tsx`, `MultibancoBookingPending.tsx`, `MultibancoPaymentReminder.tsx`
- ✅ **Novu orchestration**: Workflow management, scheduling, multi-channel delivery
- ✅ **Resend delivery**: Using your configured `updates@notifications.eleva.care`
- ✅ **Multi-language support**: Existing next-intl integration preserved

## New Workflows Available

### 1. Appointment Confirmation

**Workflow ID**: `appointment-confirmation`

Sends beautiful appointment confirmation emails using your existing `AppointmentConfirmation.tsx` template.

```typescript
// Trigger from your booking flow
await novu.trigger({
  workflowId: 'appointment-confirmation',
  to: { subscriberId: user.id },
  payload: {
    expertName: 'Dr. Ana Silva',
    clientName: 'João Santos',
    appointmentDate: 'Monday, January 15, 2024',
    appointmentTime: '14:30',
    timezone: 'Europe/Lisbon',
    appointmentDuration: '60 minutes',
    eventTitle: 'Mental Health Consultation',
    meetLink: 'https://meet.google.com/abc-defg-hij',
    notes: 'Client mentioned anxiety issues',
    locale: 'pt',
  },
});
```

### 2. Multibanco Booking Pending

**Workflow ID**: `multibanco-booking-pending`

Sends payment instructions using your existing `MultibancoBookingPending.tsx` template.

```typescript
// Trigger after booking creation
await novu.trigger({
  workflowId: 'multibanco-booking-pending',
  to: { subscriberId: customer.id },
  payload: {
    customerName: 'Maria Costa',
    expertName: 'Dr. Pedro Oliveira',
    serviceName: 'Nutrition Consultation',
    appointmentDate: 'Tuesday, January 16, 2024',
    appointmentTime: '10:00',
    timezone: 'Europe/Lisbon',
    duration: 45,
    multibancoEntity: '12345',
    multibancoReference: '123 456 789',
    multibancoAmount: '45.00',
    voucherExpiresAt: 'January 23, 2024 at 23:59',
    hostedVoucherUrl: 'https://eleva.care/payment/voucher/abc123',
    customerNotes: 'First consultation',
    locale: 'pt',
  },
});
```

### 3. Multibanco Payment Reminder

**Workflow ID**: `multibanco-payment-reminder`

Sends smart payment reminders using your existing `MultibancoPaymentReminder.tsx` template with urgency levels.

```typescript
// Trigger scheduled reminders
await novu.trigger({
  workflowId: 'multibanco-payment-reminder',
  to: { subscriberId: customer.id },
  payload: {
    customerName: 'Carlos Ferreira',
    expertName: 'Dr. Sofia Mendes',
    serviceName: 'Psychology Session',
    appointmentDate: 'Wednesday, January 17, 2024',
    appointmentTime: '16:30',
    timezone: 'Europe/Lisbon',
    duration: 50,
    multibancoEntity: '12345',
    multibancoReference: '987 654 321',
    multibancoAmount: '65.00',
    voucherExpiresAt: 'January 19, 2024 at 23:59',
    hostedVoucherUrl: 'https://eleva.care/payment/voucher/def456',
    reminderType: 'urgent', // 'gentle' or 'urgent'
    daysRemaining: 2,
    locale: 'pt',
  },
});
```

## Integration with Webhooks

Your Clerk and Stripe webhooks now automatically trigger Novu workflows:

### Clerk Events

- `user.created` → Triggers welcome workflow
- `user.updated` → Triggers profile update notifications
- `session.created` → Triggers login notifications

### Stripe Events

- `payment_intent.succeeded` → Triggers appointment confirmation
- `charge.refunded` → Triggers refund notifications
- `customer.subscription.created` → Triggers subscription welcome

## Testing

Run the test script to verify everything works:

```bash
# Set your environment variables
export NOVU_SECRET_KEY="your-secret-key"

# Run email template tests
node scripts/test-email-templates.js
```

Expected output:

```
🚀 Starting Email Template Integration Tests

📧 Using updates@notifications.eleva.care for email delivery
🌍 Testing with Portuguese locale (pt)

✅ Bridge Endpoint: HEALTHY
   Discovered workflows: 26
   Email template workflows found: 3

✅ Appointment Confirmation: SUCCESS
   Transaction ID: txn_abc123

✅ Multibanco Booking: SUCCESS
   Transaction ID: txn_def456

✅ Payment Reminder: SUCCESS
   Transaction ID: txn_ghi789

🎉 Email template integration tests completed!
```

## Email Delivery

All emails are sent via:

- **From**: `updates@notifications.eleva.care`
- **Provider**: Resend (configured in Novu Dashboard)
- **Templates**: Your existing beautiful React Email templates
- **Styling**: Tailwind CSS with accessibility features preserved
- **Languages**: Portuguese, English, Spanish (next-intl integration)

## Development Workflow

1. **Local Development**:

   ```bash
   npx novu@latest dev --port 3000
   ```

   Access Novu Studio at `http://localhost:2022/studio`

2. **Production Sync**:

   ```bash
   npx novu@latest sync
   ```

   Syncs workflows to Novu Cloud Dashboard

3. **Email Testing**: Use the test script to verify templates render correctly

## Novu Dashboard

Access your workflows at: https://dashboard.novu.co

- View email delivery status
- Monitor workflow execution
- Debug email rendering
- Manage subscriber preferences
- Track email analytics

## Next Steps

1. **Schedule Automated Reminders**: Set up cron jobs or QStash scheduled jobs to trigger payment reminders
2. **Add More Templates**: Create additional workflows using the same pattern
3. **Email Analytics**: Track open rates, clicks, and conversions in Novu Dashboard
4. **A/B Testing**: Test different email subject lines and content
5. **Preference Management**: Let users control notification preferences via the Novu Inbox component

## Benefits Achieved

✅ **Preserved Design**: Your beautiful email templates work unchanged  
✅ **Enterprise Features**: Workflow orchestration, scheduling, retry logic  
✅ **Multi-channel**: Email + in-app notifications + future SMS/push  
✅ **Scalability**: Handle thousands of emails per hour  
✅ **Analytics**: Track delivery, opens, clicks, conversions  
✅ **Compliance**: Built-in unsubscribe and preference management  
✅ **Reliability**: Automatic retries and failover

Your notification system is now production-ready with enterprise-grade features! 🎉
