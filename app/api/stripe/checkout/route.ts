import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { getOrCreateStripeCustomer, getServerStripe } from '@/lib/stripe';
import { type NextRequest, NextResponse } from 'next/server';

interface User {
  fullName?: string;
  stripeConnectAccountId?: string;
}

/**
 * Stripe checkout API route handler
 * Creates a checkout session for booking an appointment with locale support
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const {
      eventId,
      clerkUserId,
      guestName,
      guestEmail,
      guestNotes,
      startTime,
      timezone,
      locale = 'en', // Support for multilingual emails
      successUrl,
      cancelUrl,
    } = await request.json();

    if (!eventId || !clerkUserId || !guestName || !guestEmail || !startTime || !timezone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Initialize Stripe
    const stripe = await getServerStripe();

    // Get or create Stripe customer
    const stripeCustomerId = await getOrCreateStripeCustomer(undefined, guestEmail, guestName);

    if (typeof stripeCustomerId !== 'string') {
      return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
    }

    // Get the event and the expert's data
    const event = await db.query.EventTable.findFirst({
      where: ({ id }, { eq }) => eq(id, eventId),
      with: {
        user: true, // Include the related user (expert) data
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!(event.user as User)?.stripeConnectAccountId) {
      return NextResponse.json(
        { error: "Expert's Stripe Connect account not found" },
        { status: 400 },
      );
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: [...STRIPE_CONFIG.PAYMENT_METHODS],
      line_items: [
        {
          price_data: {
            currency: event.currency || STRIPE_CONFIG.CURRENCY,
            product_data: {
              name: `${event.name} with ${(event.user as User).fullName || 'Expert'}`,
              description: `${new Date(startTime).toLocaleString(locale, {
                dateStyle: 'full',
                timeStyle: 'short',
              })} (${timezone})`,
            },
            unit_amount: event.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl as string,
      cancel_url: cancelUrl as string,
      metadata: {
        eventId,
        clerkUserId,
        startTime,
        timezone,
        guestName,
        guestEmail,
        guestNotes: guestNotes || '',
        locale, // Include locale for internationalization
      },
      payment_intent_data: {
        metadata: {
          eventId,
          clerkUserId,
          startTime,
          timezone,
          guestName,
          guestEmail,
          guestNotes: guestNotes || '',
          locale, // Include locale for internationalization
        },
        application_fee_amount: Math.round(event.price * STRIPE_CONFIG.PLATFORM_FEE_PERCENTAGE),
        transfer_data: {
          destination: (event.user as User).stripeConnectAccountId!,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
