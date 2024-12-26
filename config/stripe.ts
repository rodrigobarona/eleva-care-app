export const STRIPE_CONFIG = {
  API_VERSION: '2024-12-18.acacia' as const,
  CURRENCY: 'eur',
  PAYMENT_METHODS: ['card', 'sepa_debit', 'multibanco'] as const,
  WEBHOOK_EVENTS: {
    PAYMENT_SUCCEEDED: 'payment_intent.succeeded',
    PAYMENT_FAILED: 'payment_intent.payment_failed',
  },
} as const; 