# Payment Method Restrictions & Timing Windows

This document outlines the payment method availability rules and timing windows implemented in the Eleva Care booking system.

## Overview

The platform implements intelligent payment method selection based on appointment timing to balance user convenience with payment processing requirements. This ensures optimal user experience while meeting Stripe's technical constraints and business requirements.

## Payment Method Rules

### 72-Hour Rule

The system uses a **72-hour cutoff** to determine which payment methods are available:

#### Appointments ≤ 72 Hours Away

- **Available Methods**: Credit/Debit Card only
- **Payment Window**: 30 minutes
- **Reason**: Immediate confirmation required for last-minute bookings
- **User Experience**: Instant booking confirmation

#### Appointments > 72 Hours Away

- **Available Methods**: Credit/Debit Card + Multibanco
- **Payment Window**: 24 hours
- **Reason**: Sufficient time for delayed payment processing
- **User Experience**: Flexible payment options with slot reservation

## Technical Implementation

### Payment Method Selection Logic

```typescript
// In /api/create-payment-intent/route.ts
const hoursUntilMeeting = (meetingDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

if (hoursUntilMeeting <= 72) {
  // Quick booking: Card only
  paymentMethodTypes = ['card'];
  paymentExpiresAt = new Date(currentTime.getTime() + 30 * 60 * 1000); // 30 minutes
} else {
  // Advance booking: Card + Multibanco
  paymentMethodTypes = ['card', 'multibanco'];
  paymentExpiresAt = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours
}
```

### Stripe Configuration

#### Multibanco Settings

- **Minimum Expiration**: 1 day (Stripe requirement)
- **Maximum Expiration**: 7 days (Stripe limit)
- **Implementation**: Uses Stripe's native 1-day minimum with 24-hour business logic

```typescript
payment_method_options: {
  multibanco: {
    expires_after_days: 1, // Minimum allowed by Stripe
  },
}
```

### Slot Reservation System

For advance bookings with delayed payment methods:

1. **Slot Hold**: 24-hour reservation created
2. **Payment Window**: Customer has 24 hours to complete payment
3. **Automatic Cleanup**: Expired reservations automatically removed
4. **Conflict Prevention**: Prevents double-bookings during payment process

## User Experience

### Checkout Notifications

When Multibanco is not available (≤72 hours), users see:

> ⚠️ **Payment Notice:** Multibanco payments are not available for appointments scheduled within 72 hours. Only credit/debit card payments are accepted for immediate booking confirmation.

### Appointment Management UI

Pending reservations display:

- **Countdown Timer**: Shows time remaining in hours (e.g., "5h", "2h")
- **Expiration Warning**: "Expiring Soon" notice when ≤2 hours remain
- **Clear Status**: Visual distinction between confirmed appointments and pending reservations

## Benefits

### For Users

- **Clear Communication**: Transparent payment method availability
- **Appropriate Options**: Right payment method for the timing
- **No Confusion**: Clear explanations when options are limited

### For Business

- **Reduced Risk**: Immediate confirmation for urgent bookings
- **Flexible Options**: Multiple payment methods for advance planning
- **Better Conversion**: Appropriate payment windows for each scenario

### For System

- **Stripe Compliance**: Works within Stripe's technical constraints
- **Simplified Logic**: No complex programmatic cancellations needed
- **Consistent Behavior**: Aligned timing across all systems

## Configuration

### Environment Variables

- Payment timing is configured in the application code
- No additional environment variables required

### Monitoring

- Payment method selection logged for each checkout
- Reservation expiration tracked in appointment management
- Cleanup statistics available in cron job logs

## Edge Cases & Considerations

### Timezone Handling

- All calculations use UTC timestamps
- User's local timezone for display only
- Consistent behavior across timezones

### System Maintenance

- Cleanup jobs handle expired reservations automatically
- No manual intervention required
- Detailed logging for monitoring

### Failed Payments

- Standard Stripe webhook handling
- Automatic cleanup of failed reservations
- User notifications as appropriate

## Future Enhancements

Potential improvements to consider:

- **Dynamic Timing**: Configurable cutoff periods
- **Payment Method Expansion**: Additional delayed payment methods
- **Regional Rules**: Country-specific payment method rules
- **Enhanced Notifications**: Real-time payment status updates

## Related Documentation

- [Stripe Integration](./stripe-payout-settings.md)
- [Cron Jobs](./cron-jobs.md)
- [Payment Transfers](./PAYMENT_TRANSFERS.md)
- [API Documentation](./api-documentation.md)
