import type Stripe from 'stripe';

/**
 * Extract locale from payment intent metadata and fallback sources
 *
 * Checks for locale in the following order:
 * 1. Meeting metadata JSON (paymentIntent.metadata.meeting.locale)
 * 2. Direct metadata (paymentIntent.metadata.locale)
 * 3. Default fallback ('en')
 *
 * @param paymentIntent - Stripe PaymentIntent object
 * @returns Locale string (e.g., 'en', 'pt', 'es')
 *
 * @example
 * ```typescript
 * const paymentIntent = await stripe.paymentIntents.retrieve(id);
 * const locale = extractLocaleFromPaymentIntent(paymentIntent);
 * // Use locale for internationalized notifications
 * ```
 */
export function extractLocaleFromPaymentIntent(paymentIntent: Stripe.PaymentIntent): string {
  try {
    // First, try to get locale from meeting metadata
    if (paymentIntent.metadata?.meeting) {
      const meetingData = JSON.parse(paymentIntent.metadata.meeting);
      if (meetingData.locale && typeof meetingData.locale === 'string') {
        console.log(`📍 Using locale from payment intent meeting metadata: ${meetingData.locale}`);
        return meetingData.locale;
      }
    }

    // Fallback: Check if there's a locale in the payment intent metadata directly
    if (paymentIntent.metadata?.locale) {
      console.log(
        `📍 Using locale from payment intent direct metadata: ${paymentIntent.metadata.locale}`,
      );
      return paymentIntent.metadata.locale;
    }

    // Final fallback
    console.log('📍 No locale found in payment intent metadata, using default: en');
    return 'en';
  } catch (error) {
    console.error('Error extracting locale from payment intent metadata:', error);
    return 'en';
  }
}
