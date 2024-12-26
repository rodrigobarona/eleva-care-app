import { loadStripe } from "@stripe/stripe-js";
import { STRIPE_CONFIG } from "@/config/stripe";

// Client-side Stripe promise
export const getStripePromise = () => 
  loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

// Server-side Stripe (lazy initialization)
let _stripe: Stripe | null = null;

export const getServerStripe = async () => {
  if (!_stripe) {
    const Stripe = (await import('stripe')).default;
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
      apiVersion: STRIPE_CONFIG.API_VERSION,
    });
  }
  return _stripe;
};
