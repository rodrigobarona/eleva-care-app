export const STRIPE_CONFIG = {
  API_VERSION: "2024-12-18.acacia" as const,
  CURRENCY: "eur",
  PAYMENT_METHODS: ["card", "sepa_debit", "multibanco"] as const,
  WEBHOOK_EVENTS: {
    ALLOWED_EVENTS: [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.paid",
      "invoice.payment_failed",
      "payment_intent.succeeded",
      "payment_intent.payment_failed",
    ] as const,
  },
} as const;
