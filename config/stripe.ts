export const STRIPE_CONFIG = {
  // API Configuration
  API_VERSION: process.env.STRIPE_API_VERSION as '2025-01-27.acacia',
  CURRENCY: 'eur',
  PAYMENT_METHODS: ['card', 'sepa_debit', 'multibanco'] as const,

  // Platform Fee Configuration
  PLATFORM_FEE_PERCENTAGE: Number(process.env.STRIPE_PLATFORM_FEE_PERCENTAGE ?? '0.15'),

  // Webhook Configuration
  WEBHOOK_EVENTS: {
    ALLOWED_EVENTS: [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.paid',
      'invoice.payment_failed',
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
    ] as const,
  },
} as const;

// Shared helper functions for fee calculations
export function calculateApplicationFee(amount: number | null): number {
  if (!amount) return 0;
  return Math.floor(amount * STRIPE_CONFIG.PLATFORM_FEE_PERCENTAGE);
}

export function calculateExpertAmount(amount: number | null): number {
  if (!amount) return 0;
  return Math.floor(amount * (1 - STRIPE_CONFIG.PLATFORM_FEE_PERCENTAGE));
}

// Export types for webhook events
export type AllowedWebhookEvent = (typeof STRIPE_CONFIG.WEBHOOK_EVENTS.ALLOWED_EVENTS)[number];
