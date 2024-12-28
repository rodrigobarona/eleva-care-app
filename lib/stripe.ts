import { loadStripe } from "@stripe/stripe-js";
import type { Stripe as StripeJS } from '@stripe/stripe-js';
import { stripe as serverStripe } from "@/lib/stripe-server";

export const stripe = serverStripe;

let stripePromise: Promise<StripeJS | null>;
export const getStripePromise = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
    );
  }
  return stripePromise;
};
