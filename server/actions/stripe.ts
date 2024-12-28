"use server";

import { stripe } from "@/lib/stripe-server";
import { db } from "@/drizzle/db";
import type { z } from "zod";
import type { meetingFormSchema } from "@/schema/meetings";

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

type PaymentIntentResult = 
  | { clientSecret: string; error?: never }
  | { clientSecret?: never; error: string };

export async function createPaymentIntent(
  eventId: string,
  meetingData: z.infer<typeof meetingFormSchema>
): Promise<PaymentIntentResult> {
  try {
    const event = await db.query.EventTable.findFirst({
      where: ({ id }, { eq }) => eq(id, eventId),
    });

    if (!event) {
      return { error: "Event not found" };
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: event.price,
      currency: event.currency,
      metadata: {
        eventId: event.id,
        guestEmail: meetingData.guestEmail,
        guestName: meetingData.guestName,
        startTime: meetingData.startTime.toISOString(),
      },
    });

    if (!paymentIntent.client_secret) {
      return { error: "Failed to create payment intent" };
    }

    return { clientSecret: paymentIntent.client_secret };
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return { error: "Failed to create payment intent" };
  }
}
