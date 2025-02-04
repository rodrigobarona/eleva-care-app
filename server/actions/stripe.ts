"use server";

import { getServerStripe } from "@/lib/stripe";
import { STRIPE_CONFIG } from "@/config/stripe";
import { db } from "@/drizzle/db";
import { getOrCreateStripeCustomer, syncStripeDataToKV } from "@/lib/stripe";

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

interface MeetingData {
  startTime: string;
  guestName: string;
  guestEmail: string;
  timezone: string;
  guestNotes?: string;
}

export async function createPaymentIntent(
  eventId: string,
  meetingData: MeetingData,
  userId: string,
  email: string
) {
  try {
    const stripe = await getServerStripe();

    // Get or create customer first
    const stripeCustomerId = await getOrCreateStripeCustomer(userId, email);
    if (typeof stripeCustomerId !== "string") {
      throw new Error("Failed to get or create Stripe customer");
    }

    // Get the event and the expert's data
    const event = await db.query.EventTable.findFirst({
      where: ({ id }, { eq }) => eq(id, eventId),
      with: {
        user: true, // Include the related user (expert) data
      },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    if (!event.user?.stripeConnectAccountId) {
      throw new Error("Expert's Stripe Connect account not found");
    }

    const paymentIntent = await stripe.paymentIntents.create({
      customer: stripeCustomerId,
      amount: event.price,
      currency: event.currency || STRIPE_CONFIG.CURRENCY,
      payment_method_types: [...STRIPE_CONFIG.PAYMENT_METHODS],
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        eventId: event.id,
        meetingData: JSON.stringify(meetingData),
        userId,
        expertConnectAccountId: event.user.stripeConnectAccountId, // Add the expert's Connect account ID
      },
    });

    // Sync customer data to KV after creation
    await syncStripeDataToKV(stripeCustomerId);

    return { clientSecret: paymentIntent.client_secret };
  } catch (error) {
    console.error("Payment intent creation failed:", error);
    return { error: "Failed to create payment intent" };
  }
}
