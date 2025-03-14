# Expert Payment Transfer System

This document provides a comprehensive overview of the delayed payment transfer system implemented for Eleva Care. The system ensures that payments to experts are properly delayed until the day after the session completion, following Stripe's best practices for connected accounts.

## System Overview

When a customer books a session with an expert:

1. The customer pays the full amount to Eleva's platform account
2. The payment information is recorded in the database with a "PENDING" status
3. The day after the session ends, a scheduled job automatically transfers the expert's portion (85%) to their Stripe Connect account
4. The platform fee (15%) remains in Eleva's account

This approach provides several advantages:
- Ensures service delivery before funds are transferred to experts
- Allows time for potential customer issues to be addressed
- Follows Stripe's recommended practice of separating payment collection from payout
- Creates a clear audit trail for financial compliance

## Implementation Components

### 1. Database Schema

The system uses a `payment_transfers` table to track all pending and completed transfers:

```sql
CREATE TABLE payment_transfers (
  id SERIAL PRIMARY KEY,
  payment_intent_id TEXT NOT NULL,
  checkout_session_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  expert_connect_account_id TEXT NOT NULL,
  expert_clerk_user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  platform_fee INTEGER NOT NULL,
  session_start_time TIMESTAMP NOT NULL,
  scheduled_transfer_time TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  transfer_id TEXT,
  stripe_error_code TEXT,
  stripe_error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  requires_approval BOOLEAN DEFAULT false,
  admin_user_id TEXT,
  admin_notes TEXT,
  created TIMESTAMP NOT NULL DEFAULT NOW(),
  updated TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 2. Payment Processing Flow

#### a. Initial Payment Capture

When a checkout session is created (`/api/create-payment-intent/route.ts`):
- The full payment amount is collected from the customer
- Payment stays in Eleva's platform account
- The payment intent does NOT include automatic transfer data
- The scheduled transfer time (session start time + 3 hours) is stored in metadata

#### b. Webhook Handler

When a checkout is completed (`/api/webhooks/stripe/route.ts`):
- Payment information is recorded in the `payment_transfers` table
- The status is set to "PENDING"
- The scheduled transfer time is stored for future processing

#### c. Scheduled Transfer Job

A CRON job (`/api/cron/process-expert-transfers/route.ts`) runs once daily at 4:00 AM to:
- Find all pending transfers that are due (current time ≥ scheduled transfer time)
- Process each transfer by calling Stripe's Transfer API
- Update the status to "COMPLETED" or handle errors
- Retry failed transfers up to a maximum number of attempts

### 3. Administrative Tools

Admin endpoints are available for managing transfers:

- `GET /api/admin/payment-transfers`: List and filter payment transfers
- `PATCH /api/admin/payment-transfers`: Update transfer details
- `POST /api/admin/payment-transfers/approve`: Manually approve a pending transfer

## Error Handling

The system includes comprehensive error handling:
- Failed transfers are retried automatically (up to 3 times)
- Detailed error information is stored in the database
- Administrative tools allow for manual intervention when needed

## Configuration

The CRON job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-expert-transfers?key=$CRON_API_KEY",
      "schedule": "0 4 * * *"
    }
  ]
}
```

## Security Considerations

- The CRON endpoint is protected with an API key
- Admin endpoints require authentication and proper role permissions
- Stripe webhook signatures are verified to prevent tampering

## Monitoring and Maintenance

To ensure the system operates smoothly:

1. Regularly monitor the `payment_transfers` table for any stuck transfers
2. Check Stripe logs for transfer errors
3. Consider implementing alerts for failed transfers that require attention
4. Periodically review retry rates and adjust timing if needed

## Future Enhancements

Potential improvements to consider:
- Expert notifications when transfers are completed
- Customer notifications when session has been completed
- More detailed transaction reporting for experts
- Integration with accounting systems for financial reporting 