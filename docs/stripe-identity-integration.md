# Stripe Identity Integration

This document outlines how Stripe Identity is integrated into the Eleva Care application to provide secure identity verification for experts.

## Overview

Stripe Identity allows for secure verification of user identities through document verification. In our application, this is used to verify the identity of experts, ensuring a higher level of trust and security for clients.

## Implementation Details

### Components

1. **Identity Page**: Located at `/app/(private)/account/identity`

   - Displays the current verification status
   - Allows users to initiate the verification process
   - Shows verification status and results

2. **API Routes**:

   - `/api/user/identity`: Fetches the current user's identity verification status
   - `/api/stripe/identity/start-verification`: Initiates a new verification session
   - `/api/stripe/identity/check-status`: Manually checks and updates the verification status
   - `/api/webhooks/stripe-identity`: Webhook handler for Stripe Identity events

3. **Helper Functions**: Located in `/lib/stripe/identity.ts`
   - `createIdentityVerificationSession()`: Creates a new identity verification session
   - `getIdentityVerificationStatus()`: Retrieves the status of a verification session
   - `updateVerificationStatus()`: Updates the user's verification status in the database

### Database Schema

The following fields were added to the `UserTable`:

- `stripeIdentityVerificationId`: The ID of the current verification session
- `stripeIdentityVerified`: Boolean indicating if the user is verified
- `stripeIdentityVerificationStatus`: The current status of the verification
- `stripeIdentityVerificationLastChecked`: Timestamp of the last status check

## Verification Flow

1. User navigates to the Identity page in their account settings
2. User clicks "Start Verification" to initiate the process
3. The application creates a verification session with Stripe
4. User is redirected to Stripe's hosted verification flow
5. User completes the verification by uploading documents and taking a selfie
6. User is redirected back to the application
7. Stripe processes the verification (typically takes a few minutes)
8. Stripe sends webhook events as the verification status changes
9. The application updates the user's verification status based on these events

## Webhook Events

The following Stripe Identity events are handled by the webhook:

- `identity.verification_session.created`: A new verification session was created
- `identity.verification_session.processing`: Stripe is processing the verification
- `identity.verification_session.verified`: The verification was successful
- `identity.verification_session.requires_input`: Additional information is needed

## Environment Variables

The following environment variables are required:

- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_IDENTITY_WEBHOOK_SECRET`: Secret for verifying Stripe Identity webhooks
- `NEXT_PUBLIC_APP_URL`: The URL of your application (used for return URLs)

## Testing

To test the identity verification flow:

1. Use Stripe's test mode
2. Follow the verification flow as a user
3. Use Stripe's test documents as described in their documentation
4. Monitor webhook events in the Stripe dashboard

## References

- [Stripe Identity Documentation](https://stripe.com/docs/identity)
- [Stripe Identity API Reference](https://stripe.com/docs/api/identity/verification_sessions)
- [Stripe Identity Webhook Events](https://stripe.com/docs/api/identity/webhook_events)
