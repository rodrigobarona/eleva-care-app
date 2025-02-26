# Stripe Embedded Components

This document outlines how Stripe's embedded components are integrated into the Eleva Care application to provide a seamless payment and onboarding experience.

## Overview

Instead of redirecting users to Stripe-hosted pages, we've implemented embedded Stripe components that render directly within our application using slide-over dialogs. This approach improves the user experience by keeping users within our application while still leveraging Stripe's secure payment infrastructure.

## Implemented Embedded Components

### 1. Stripe Connect Onboarding

The Connect onboarding flow allows experts to set up their Stripe Connect accounts without leaving our platform.

**Components:**

- `SlideOverDialog`: A custom dialog component that slides in from the right side of the screen
- `StripeConnectEmbed`: Embeds the Stripe Connect onboarding flow in an iframe

**API Endpoints:**

- `/api/stripe/connect-embedded`: Creates a Connect account and returns a client secret for the embedded flow

**Usage:**

```tsx
// Open the dialog when needed
setIsEmbeddedDialogOpen(true);

// In your component render
<SlideOverDialog
  isOpen={isEmbeddedDialogOpen}
  onClose={() => setIsEmbeddedDialogOpen(false)}
  title="Connect with Stripe"
  description="Complete your Stripe onboarding to receive payments"
>
  <StripeConnectEmbed email={userEmail} country={userCountry} onComplete={handleConnectComplete} />
</SlideOverDialog>;
```

### 2. Payment Method Setup

The Payment Method setup flow allows users to add payment methods (credit cards, etc.) without leaving our platform.

**Components:**

- `SlideOverDialog`: Same dialog component used for Connect onboarding
- `StripePaymentMethodEmbed`: Embeds Stripe Elements for payment method collection

**API Endpoints:**

- `/api/stripe/create-setup-intent`: Creates a SetupIntent and returns the client secret

**Usage:**

```tsx
// Open the dialog when needed
setIsPaymentDialogOpen(true);

// In your component render
<SlideOverDialog
  isOpen={isPaymentDialogOpen}
  onClose={() => setIsPaymentDialogOpen(false)}
  title="Add Payment Method"
  description="Add a card or other payment method to your account"
>
  <StripePaymentMethodEmbed
    onSuccess={handlePaymentMethodAdded}
    onCancel={() => setIsPaymentDialogOpen(false)}
  />
</SlideOverDialog>;
```

## Implementation Details

### Communication with Stripe

The embedded components communicate with Stripe through:

1. **Direct API calls**: For creating accounts and setup intents
2. **PostMessage API**: For receiving event notifications from the embedded iframe
3. **Stripe.js and Elements**: For secure payment method collection

### Security Considerations

- All sensitive payment data is handled by Stripe Elements and never touches our servers
- The iframe domain is verified to ensure it comes from Stripe
- All communications with Stripe's API use server-side routes with the secret key

### Testing

To test the embedded flows:

1. Use Stripe's test mode
2. For Connect onboarding, use test documents as described in Stripe's documentation
3. For payment methods, use Stripe's test card numbers (e.g., 4242 4242 4242 4242)

## Styling

The embedded components are styled to match our application's design system:

- Connect iframe: Uses Stripe's default styling but is contained in our custom dialog
- Payment Elements: Customized using Stripe's appearance API to match our design tokens

## References

- [Stripe Connect Express Documentation](https://stripe.com/docs/connect/express-accounts)
- [Stripe Elements Documentation](https://stripe.com/docs/stripe-js)
- [Stripe SetupIntent Documentation](https://stripe.com/docs/payments/setup-intents)
- [Stripe iframe Security](https://stripe.com/docs/security)
