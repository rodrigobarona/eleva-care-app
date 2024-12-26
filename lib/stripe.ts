import Stripe from "stripe";
import { loadStripe } from "@stripe/stripe-js";

// Constants for Stripe configuration
export const STRIPE_CONFIG = {
  PAYMENT_METHODS: ['card', 'sepa_debit', 'multibanco'] as string[],
  CURRENCY: 'eur',
  API_VERSION: '2024-12-18.acacia' as const,
} as const;

// Create a singleton instance of Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});

// Add a helper for the frontend
export const getStripePromise = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");
};

// Type for supported payment methods
export type SupportedPaymentMethod = (typeof STRIPE_CONFIG.PAYMENT_METHODS)[number];
