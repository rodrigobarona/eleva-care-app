'use server'

import { stripe, PAYMENT_METHODS } from "@/lib/stripe";
import { db } from "@/drizzle/db";

export async function createStripeProduct({
  name,
  description,
  price,
  currency = 'eur',
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
    console.error('Stripe product creation failed:', error);
    return { error: 'Failed to create Stripe product' };
  }
}

export async function updateStripeProduct({
  stripeProductId,
  stripePriceId,
  name,
  description,
  price,
  currency = 'eur',
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
    console.error('Stripe product update failed:', error);
    return { error: 'Failed to update Stripe product' };
  }
}

export async function createPaymentIntent(eventId: string) {
  const event = await db.query.EventTable.findFirst({
    where: (events, { eq }) => eq(events.id, eventId),
  });

  if (!event?.stripePriceId) {
    throw new Error("Event or price not found");
  }

  return stripe.paymentIntents.create({
    amount: event.price,
    currency: event.currency,
    payment_method_types:PAYMENT_METHODS,
    metadata: {
      eventId: event.id,
    },
  });
}
