'use server';

import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import {
  getOrCreateStripeCustomer,
  getServerStripe,
  syncStripeDataToKV,
} from '@/lib/integrations/stripe';

/**
 * @fileoverview Server actions for managing Stripe integrations in the Eleva Care application.
 * This file handles Stripe-related operations including product management, payment processing,
 * and customer management. It provides functionality for creating and updating products,
 * handling payment intents, and managing customer data.
 *
 * Creates a new Stripe product with associated price.
 *
 * This function:
 * 1. Creates a new product in Stripe with the given details
 * 2. Creates a price for the product with the specified amount
 * 3. Associates the product with the expert via workosUserId in metadata
 *
 * @param params - Object containing product details
 * @param params.name - The name of the product
 * @param params.description - Optional description of the product
 * @param params.price - The price in smallest currency unit (e.g., cents)
 * @param params.currency - The currency code (default: "eur")
 * @param params.workosUserId - The Clerk user ID of the expert
 * @returns Object containing the created product and price IDs, or error details
 *
 * @example
 * const result = await createStripeProduct({
 *   name: "1-Hour Consultation",
 *   description: "One-hour expert consultation session",
 *   price: 10000, // 100.00 EUR
 *   workosUserId: "user_123"
 * });
 *
 * if (result.error) {
 *   console.error("Product creation failed:", result.error);
 * } else {
 *   console.log("Product created:", result.productId);
 *   console.log("Price created:", result.priceId);
 * }
 */
export async function createStripeProduct({
  name,
  description,
  price,
  currency = 'eur',
  workosUserId,
}: {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  workosUserId: string;
}) {
  try {
    // Initialize Stripe client
    const stripe = await getServerStripe();

    // Create the product first
    const product = await stripe.products.create({
      name,
      description,
      metadata: {
        workosUserId, // Store the expert's ID for reference
      },
    });

    // Create a price for the product
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

/**
 * Updates an existing Stripe product and creates a new price.
 * Note: Stripe doesn't allow updating existing prices, so we create a new one
 * and deactivate the old one.
 *
 * This function:
 * 1. Updates the product details in Stripe
 * 2. Creates a new price for the updated product
 * 3. Deactivates the old price
 *
 * @param params - Object containing update details
 * @param params.stripeProductId - The ID of the Stripe product to update
 * @param params.stripePriceId - The ID of the current price to deactivate
 * @param params.name - The new name for the product
 * @param params.description - Optional new description
 * @param params.price - The new price in smallest currency unit
 * @param params.currency - The currency code (default: "eur")
 * @param params.workosUserId - The Clerk user ID of the expert
 * @returns Object containing the product ID and new price ID, or error details
 *
 * @example
 * const result = await updateStripeProduct({
 *   stripeProductId: "prod_123",
 *   stripePriceId: "price_123",
 *   name: "Updated Consultation",
 *   price: 15000, // 150.00 EUR
 *   workosUserId: "user_123"
 * });
 */
export async function updateStripeProduct({
  stripeProductId,
  stripePriceId,
  name,
  description,
  price,
  currency = 'eur',
  workosUserId,
}: {
  stripeProductId: string;
  stripePriceId: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  workosUserId: string;
}) {
  try {
    const stripe = await getServerStripe();

    // Update the product details
    await stripe.products.update(stripeProductId, {
      name,
      description,
      metadata: {
        workosUserId,
      },
    });

    // Create a new price since Stripe doesn't allow updating prices
    const newPrice = await stripe.prices.create({
      product: stripeProductId,
      unit_amount: price,
      currency,
    });

    // Deactivate the old price to prevent future usage
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

/**
 * Interface defining the structure of meeting data for payment processing
 */
interface MeetingData {
  startTime: string;
  guestName: string;
  guestEmail: string;
  timezone: string;
  guestNotes?: string;
  locale?: string;
}

/**
 * Creates a payment intent for a meeting booking.
 *
 * This function:
 * 1. Gets or creates a Stripe customer for the user
 * 2. Retrieves the event and expert's data
 * 3. Creates a payment intent with the event price
 * 4. Syncs customer data to KV storage
 *
 * @param eventId - The ID of the event being booked
 * @param meetingData - Object containing meeting details
 * @param userId - The user's ID (optional for guest bookings)
 * @param email - The customer's email address
 * @returns Object containing the payment intent's client secret or error details
 *
 * @example
 * const result = await createPaymentIntent(
 *   "event_123",
 *   {
 *     startTime: "2024-04-01T10:00:00Z",
 *     guestName: "John Doe",
 *     guestEmail: "john@example.com",
 *     timezone: "Europe/London"
 *   },
 *   "user_123",
 *   "john@example.com"
 * );
 *
 * if (result.error) {
 *   console.error("Payment intent creation failed:", result.error);
 * } else {
 *   console.log("Client secret:", result.clientSecret);
 * }
 */
export async function createPaymentIntent(
  eventId: string,
  meetingData: MeetingData,
  userId: string,
  email: string,
) {
  try {
    const stripe = await getServerStripe();

    // Get or create customer first
    const stripeCustomerId = await getOrCreateStripeCustomer(userId, email);
    if (typeof stripeCustomerId !== 'string') {
      throw new Error('Failed to get or create Stripe customer');
    }

    // Get the event and the expert's data
    const event = await db.query.EventsTable.findFirst({
      where: ({ id }, { eq }) => eq(id, eventId),
      with: {
        user: true, // Include the related user (expert) data
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (!event.user?.stripeConnectAccountId) {
      throw new Error("Expert's Stripe Connect account not found");
    }

    // Create the payment intent with all necessary details
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
        expertConnectAccountId: event.user.stripeConnectAccountId,
      },
    });

    // Sync customer data to KV after successful creation
    await syncStripeDataToKV(stripeCustomerId);

    return { clientSecret: paymentIntent.client_secret };
  } catch (error) {
    console.error('Payment intent creation failed:', error);
    return { error: 'Failed to create payment intent' };
  }
}
