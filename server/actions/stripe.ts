"use server";

import { getServerStripe } from "@/lib/stripe";
import { STRIPE_CONFIG } from "@/config/stripe";
import { db } from "@/drizzle/db";

export async function createStripeProduct({
  name,
  description,
  price,
  currency = "eur",
  clerkUserId,
}: {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  clerkUserId: string;
}) {
  try {
    const stripe = await getServerStripe();
    const product = await stripe.products.create({
      name,
      description,
      metadata: {
        clerkUserId,
      },
    });

    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: price,
      currency,
    });

    return {
      productId: product.id,
      priceId: stripePrice.id,
    };
  } catch (error) {
    console.error("Stripe product creation failed:", error);
    return { error: "Failed to create Stripe product" };
  }
}

export async function updateStripeProduct({
  stripeProductId,
  stripePriceId,
  name,
  description,
  price,
  currency = "eur",
  clerkUserId,
}: {
  stripeProductId: string;
  stripePriceId: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  clerkUserId: string;
}) {
  try {
    const stripe = await getServerStripe();
    // Update the product
    await stripe.products.update(stripeProductId, {
      name,
      description,
      metadata: {
        clerkUserId,
      },
    });

    // Create a new price (Stripe doesn't allow updating prices)
    const newPrice = await stripe.prices.create({
      product: stripeProductId,
      unit_amount: price,
      currency,
    });

    // Deactivate the old price
    await stripe.prices.update(stripePriceId, {
      active: false,
    });

    return {
      productId: stripeProductId,
      priceId: newPrice.id,
    };
  } catch (error) {
    console.error("Stripe product update failed:", error);
    return { error: "Failed to update Stripe product" };
  }
}

export async function createPaymentIntent(eventId: string, meetingData: any) {
  try {
    const stripe = await getServerStripe();
    const event = await db.query.EventTable.findFirst({
      where: (events, { eq }) => eq(events.id, eventId),
    });

    if (!event) {
      throw new Error("Event not found");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: event.price,
      currency: event.currency || STRIPE_CONFIG.CURRENCY,
      payment_method_types: ["card"],
      payment_method_options: {
        card: {
          request_three_d_secure: "automatic",
        },
      },
      capture_method: "automatic",
      confirmation_method: "automatic",
      metadata: {
        eventId: event.id,
        meetingData: JSON.stringify(meetingData),
      },
    });

    return { clientSecret: paymentIntent.client_secret };
  } catch (error) {
    console.error("Payment intent creation failed:", error);
    return { error: "Failed to create payment intent" };
  }
}
