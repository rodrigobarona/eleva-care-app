# Stripe Connect Payout Settings

This document explains how payout schedules work in the Eleva Care platform with Stripe Connect integration.

## Overview

Eleva Care uses Stripe Connect to handle payments and payouts for expert services. When a client pays for a session, the payment is processed through Stripe, and after the platform fee is deducted, the remaining amount is transferred to the expert's Stripe Connect account. From there, Stripe handles the payout to the expert's bank account according to the configured payout schedule.

## Payout Delays

Stripe enforces minimum payout delays for new Connect accounts. These delays vary by country and are designed to manage risk and comply with financial regulations. The delays are measured in days from when funds are available in the Stripe account to when they are initiated for transfer to the expert's bank account.

### Country-Specific Minimum Delays

Each country has specific minimum payout delay requirements set by Stripe. Here are the minimum delay days for some key countries:

| Country         | Country Code | Minimum Delay (Days) |
| --------------- | ------------ | -------------------- |
| United States   | US           | 2                    |
| United Kingdom  | GB           | 7                    |
| Portugal        | PT           | 7                    |
| Spain           | ES           | 7                    |
| Italy           | IT           | 7                    |
| France          | FR           | 7                    |
| Germany         | DE           | 7                    |
| Canada          | CA           | 7                    |
| Australia       | AU           | 7                    |
| Other Countries | -            | 7 (default)          |

These values may change as Stripe updates its policies. The most up-to-date values are stored in the application configuration in `config/stripe.ts`.

## How Payouts Work

1. A client books and pays for a session
2. The payment is processed through Stripe
3. After the session is completed, the funds become available in the platform's Stripe account
4. Stripe automatically transfers the expert's portion (minus platform fees) to their Connect account
5. Stripe initiates a payout from the Connect account to the expert's bank account based on the payout schedule
6. The minimum delay (as specified above) applies before the funds are sent to the bank
7. Additional bank processing time (typically 1-2 business days) may apply before funds appear in the expert's account

## Payout Schedule Settings

The default payout schedule for all experts is set to **daily** with the country-specific minimum delay. This means:

1. Funds are grouped for payout once each day
2. The minimum delay period must pass before funds are eligible for payout
3. Only funds from completed sessions are included in payouts

## Future Improvements

After establishing a history with Stripe, some experts may become eligible for faster payouts. Stripe may reduce the minimum delay requirements for accounts with good track records. This is handled automatically by Stripe and doesn't require changes to our integration.

## Payout Timing Optimization

The platform optimizes expert payouts based on Stripe's payout delay requirements while ensuring experts receive their funds as quickly as possible after completing sessions. This is achieved using a "payment aging" approach:

### How Payment Aging Works

1. **Payment Receipt**: When a customer pays for a session, we record the payment timestamp.
2. **Session Completion**: After the expert completes the session, we calculate how many days have passed since the original payment.
3. **Delay Calculation**: We subtract this "payment aging" period from Stripe's required minimum delay:
   - `remainingDelay = max(1, requiredPayoutDelay - paymentAgingDays)`
4. **Optimized Payout**: The expert receives their payout after only the remaining delay (minimum 1 day).

### Example Scenarios

**Scenario 1: Same-day Booking**  
Customer books and pays for a session happening the same day.

- Payment aging: 0 days
- For a PT-based expert (7-day requirement):
  - Remaining delay = max(1, 7-0) = 7 days
  - Expert receives funds 7 days after the session

**Scenario 2: Advance Booking**  
Customer books and pays 10 days before the session occurs.

- Payment aging: 10 days
- For a PT-based expert (7-day requirement):
  - Remaining delay = max(1, 7-10) = 1 day
  - Expert receives funds the day after the session

**Scenario 3: US-based Expert with Advance Booking**  
Customer books and pays 5 days before the session occurs.

- Payment aging: 5 days
- For a US-based expert (2-day requirement):
  - Remaining delay = max(1, 2-5) = 1 day
  - Expert receives funds the day after the session

This approach ensures compliance with Stripe's requirements while optimizing for the fastest possible payouts to experts based on when the customer made the initial payment.

## Technical Implementation

### Configuration

The minimum payout delay settings are defined in `config/stripe.ts` in the `STRIPE_CONFIG.CONNECT.PAYOUT_DELAY_DAYS` object. This allows us to maintain a centralized list of country-specific requirements that can be updated as Stripe's policies change.

### Connect Account Creation

When creating a new Stripe Connect account, we automatically set the payout schedule with the appropriate minimum delay for the expert's country. This is handled in the `createStripeConnectAccount` function in `lib/stripe.ts`.

### Error Handling

If Stripe rejects a payout schedule setting (e.g., if we attempt to set a delay that's shorter than allowed), we catch this error and provide a clear explanation to the user about the minimum delay requirements for their country.

## References

- [Stripe Documentation: Setting payout schedules](https://stripe.com/docs/connect/setting-payout-schedule)
- [Stripe Documentation: Payouts](https://stripe.com/docs/payouts)
