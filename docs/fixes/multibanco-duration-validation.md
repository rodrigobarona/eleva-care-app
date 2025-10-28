# Multibanco Payment Duration Validation Fix

## Problem Statement

In `app/api/webhooks/stripe/handlers/payment.ts` (lines 543-578), the code was performing date arithmetic with `meetingData.dur` without validation. This could produce `NaN` values and break the Multibanco transfer schedule recalculation logic.

### Root Cause

```typescript
// Before: Unsafe date calculation
const appointmentEnd = new Date(appointmentStart.getTime() + meetingData.dur * 60 * 1000);
```

If `meetingData.dur` is `undefined`, `null`, `NaN`, or any non-numeric value, the multiplication would produce `NaN`, resulting in invalid Date objects that break downstream logic.

## Solution

### Implementation Details

Added comprehensive validation using `Number.isFinite()` before any date arithmetic:

```typescript
if (!Number.isFinite(meetingData.dur) || meetingData.dur <= 0) {
  // Abort and log warning with full context
} else {
  // Proceed with safe date calculations
}
```

### Key Improvements

1. **Robust Validation**
   - Uses `Number.isFinite()` to catch `undefined`, `null`, `NaN`, and `Infinity`
   - Checks for zero or negative duration values
   - Prevents any Date arithmetic with invalid values

2. **Comprehensive Logging**
   - Logs payment intent ID for traceability
   - Includes meeting ID and expert ID for debugging
   - Reports the invalid duration value and its type
   - Explains the reason for failure and impact
   - Provides actionable guidance for developers

3. **Graceful Degradation**
   - Aborts transfer time recalculation safely
   - Falls back to original scheduled time from metadata
   - Skips conflict checks (which also depend on duration)
   - Allows payment processing to continue normally

4. **Enhanced Error Context**

   ```typescript
   console.warn(
     '⚠️ MULTIBANCO TRANSFER RECALCULATION ABORTED: Invalid duration in payment metadata',
     {
       paymentIntentId: paymentIntent.id,
       meetingId: meetingData.id || 'unknown',
       expertId: meetingData.expert,
       appointmentStart: meetingData.start,
       invalidDuration: meetingData.dur,
       durationType: typeof meetingData.dur,
       reason: !Number.isFinite(meetingData.dur)
         ? 'Duration is not a finite number (undefined, null, NaN, or Infinity)'
         : 'Duration is zero or negative',
       impact: 'Skipping transfer time recalculation AND conflict checks...',
       action: 'Verify payment intent metadata structure...',
     },
   );
   ```

## Benefits

### Operational

- **Prevents crashes**: No more `NaN` in date calculations
- **Better monitoring**: Structured logs aid debugging and alerting
- **Graceful failures**: Continues processing even with bad metadata

### Developer Experience

- **Clear diagnostics**: Know exactly what went wrong and where
- **Actionable guidance**: Logs suggest specific remediation steps
- **Type safety**: Validates data types before use

### Business Impact

- **Payment reliability**: Multibanco payments process even with metadata issues
- **Customer experience**: No failed payments due to validation errors
- **Audit trail**: Complete context for investigating issues

## Testing Recommendations

### Unit Tests

```typescript
describe('handlePaymentSucceeded - Duration Validation', () => {
  it('should abort recalculation when dur is undefined', async () => {
    const paymentIntent = createMockPaymentIntent({
      metadata: {
        meeting: JSON.stringify({
          dur: undefined, // Invalid
          expert: 'expert_123',
          start: '2025-02-15T10:00:00Z',
        }),
      },
    });

    await handlePaymentSucceeded(paymentIntent);

    // Should log warning and continue processing
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('MULTIBANCO TRANSFER RECALCULATION ABORTED'),
      expect.any(Object),
    );
  });

  it('should proceed with recalculation when dur is valid', async () => {
    const paymentIntent = createMockPaymentIntent({
      metadata: {
        meeting: JSON.stringify({
          dur: 60, // Valid: 60 minutes
          expert: 'expert_123',
          start: '2025-02-15T10:00:00Z',
        }),
      },
    });

    await handlePaymentSucceeded(paymentIntent);

    // Should calculate transfer time successfully
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Recalculated Multibanco transfer schedule'),
      expect.any(Object),
    );
  });
});
```

### Edge Cases to Test

- `dur: undefined`
- `dur: null`
- `dur: NaN`
- `dur: Infinity`
- `dur: -Infinity`
- `dur: 0`
- `dur: -30`
- `dur: "60"` (string instead of number)

## References

### Stripe Best Practices

- [Payment Intent Metadata](https://stripe.com/docs/api/metadata) - Store structured data safely
- [Multibanco Payments](https://stripe.com/docs/payments/multibanco) - Delayed notification payment method
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices) - Handle errors gracefully

### Related Files

- `app/api/webhooks/stripe/handlers/payment.ts` - Main payment webhook handler
- `config/stripe.ts` - Stripe configuration
- `lib/stripe.ts` - Stripe utility functions

## Migration Notes

No migration required. This is a backward-compatible fix that adds validation to existing logic. The change:

- ✅ Does not modify the API contract
- ✅ Does not require database changes
- ✅ Does not affect successful payments
- ✅ Only improves error handling for edge cases

## Monitoring

Consider adding metrics for:

1. **Validation failures**: Count how often invalid duration is encountered
2. **Metadata quality**: Track metadata structure issues
3. **Fallback usage**: Monitor when recalculation is skipped

Example monitoring query (PostHog/BetterStack):

```javascript
// Track validation failures
if (!Number.isFinite(meetingData.dur)) {
  analytics.track('multibanco_invalid_duration', {
    paymentIntentId: paymentIntent.id,
    durationType: typeof meetingData.dur,
    meetingId: meetingData.id,
  });
}
```

## Conclusion

This fix implements defensive programming principles by:

1. **Validating inputs** before use
2. **Failing gracefully** with clear error messages
3. **Maintaining service continuity** even when data is malformed
4. **Providing actionable diagnostics** for debugging

The payment processing flow now handles invalid duration metadata robustly, preventing `NaN` propagation while maintaining full observability through structured logging.
