import { calculateApplicationFee, STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { EventTable } from '@/drizzle/schema';
import { getBaseUrl, getOrCreateStripeCustomer, withRetry } from '@/lib/stripe';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

export async function POST(request: Request) {
  console.log('Starting payment intent creation process');

  try {
    // Parse request body
    const body = await request.json();
    console.log('Request body received:', {
      eventId: body.eventId,
      hasPrice: !!body.price,
      hasMeetingData: !!body.meetingData,
      username: body.username,
      eventSlug: body.eventSlug,
      requiresApproval: !!body.requiresApproval,
    });

    const { eventId, price, meetingData, username, eventSlug, requiresApproval = false } = body;

    // Validate required fields
    if (!price || !meetingData?.guestEmail) {
      console.warn('Missing required fields:', {
        hasPrice: !!price,
        hasGuestEmail: !!meetingData?.guestEmail,
      });
      return NextResponse.json(
        {
          message: 'Missing required fields: price and guest email are required',
        },
        { status: 400 },
      );
    }

    if (!meetingData?.startTime) {
      console.warn('Missing startTime in meeting data');
      return NextResponse.json({ message: 'Missing required field: startTime' }, { status: 400 });
    }

    // Get expert's Connect account
    console.log('Querying event details:', { eventId });
    const event = await db.query.EventTable.findFirst({
      where: eq(EventTable.id, eventId),
      with: {
        user: true,
      },
    });

    console.log('Event query results:', {
      eventFound: !!event,
      hasUser: !!event?.user,
      hasConnectAccount: !!event?.user?.stripeConnectAccountId,
    });

    if (!event?.user?.stripeConnectAccountId) {
      console.error('Expert Connect account not found:', {
        eventId,
        clerkUserId: event?.clerkUserId,
      });
      throw new Error("Expert's Connect account not found");
    }

    // Prepare meeting metadata
    const meetingMetadata = {
      ...meetingData,
      clerkUserId: event.clerkUserId,
      expertClerkUserId: event.clerkUserId,
      isGuest: 'true',
      guestEmail: meetingData.guestEmail,
      timezone: meetingData.timezone,
      startTime: meetingData.startTime,
      isEuropeanCustomer: meetingData.timezone?.includes('Europe') ? 'true' : 'false',
      preferredTaxHandling: 'vat_only',
    };

    console.log('Prepared meeting metadata');

    // Get or create customer
    console.log('Attempting to get/create Stripe customer');
    const customerId = await getOrCreateStripeCustomer(undefined, meetingData.guestEmail);
    console.log('Customer retrieved/created:', { customerId });

    // Calculate application fee
    const applicationFeeAmount = calculateApplicationFee(price);
    const expertAmount = price - applicationFeeAmount;
    console.log('Calculated application fee:', {
      originalPrice: price,
      feeAmount: applicationFeeAmount,
      expertAmount: expertAmount,
      feePercentage: STRIPE_CONFIG.PLATFORM_FEE_PERCENTAGE,
    });

    // Calculate transfer schedule (next day after session)
    const sessionStartTime = new Date(meetingData.startTime);
    // Add session duration (or default to 1 hour) + 24 hours
    const sessionDurationMs = meetingData.duration
      ? meetingData.duration * 60 * 1000
      : 60 * 60 * 1000;
    const nextDay = new Date(sessionStartTime.getTime() + sessionDurationMs + 24 * 60 * 60 * 1000);
    // Set to 4 AM the next day (matching CRON job time)
    const transferDate = new Date(nextDay.setHours(4, 0, 0, 0));

    // Create checkout session with detailed logging
    console.log('Creating checkout session with params:', {
      customerId,
      price,
      applicationFeeAmount,
      expertAmount,
      connectAccountId: event.user.stripeConnectAccountId,
      requiresApproval: requiresApproval,
      currency: STRIPE_CONFIG.CURRENCY,
      transferScheduled: transferDate.toISOString(),
    });

    const baseUrl = getBaseUrl();

    const session = await withRetry(async () =>
      stripe.checkout.sessions.create({
        customer: customerId as string,
        payment_method_types: [...STRIPE_CONFIG.PAYMENT_METHODS],
        mode: 'payment',
        ui_mode: 'embedded',
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        automatic_tax: {
          enabled: true,
          liability: { type: 'account', account: event.user.stripeConnectAccountId },
        },
        tax_id_collection: { enabled: true, required: 'if_supported' },
        consent_collection: {
          terms_of_service: 'required',
        },
        custom_text: {
          terms_of_service_acceptance: {
            message: 'I agree to the [Terms of Service](https://eleva.care/legal/terms)',
          },
        },
        customer_creation: customerId ? undefined : 'always',
        locale: 'auto',
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
        submit_type: 'book',
        invoice_creation: {
          enabled: true,
        },
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          transfer_data: {
            destination: event.user.stripeConnectAccountId,
          },
          metadata: {
            eventId,
            meetingData: JSON.stringify(meetingMetadata),
            expertConnectAccountId: event.user.stripeConnectAccountId,
            expertClerkUserId: event.clerkUserId,
            sessionStartTime: sessionStartTime.toISOString(),
            scheduledTransferTime: transferDate.toISOString(),
            platformFee: applicationFeeAmount.toString(),
            expertAmount: expertAmount.toString(),
            requiresApproval: requiresApproval ? 'true' : 'false',
            transferStatus: 'PENDING',
          },
        },
        line_items: [
          {
            price_data: {
              currency: STRIPE_CONFIG.CURRENCY,
              product_data: {
                name: 'Consultation Booking',
                description: `Booking for ${meetingData.guestName} on ${sessionStartTime.toLocaleString()} (funds will be released to expert the day after session${requiresApproval ? ' pending approval' : ''})`,
              },
              unit_amount: Math.round(price),
            },
            quantity: 1,
          },
        ],
        metadata: {
          eventId,
          meetingData: JSON.stringify(meetingMetadata),
          expertConnectAccountId: event.user.stripeConnectAccountId,
          expertClerkUserId: event.clerkUserId,
          clerkUserId: event.clerkUserId,
          sessionStartTime: sessionStartTime.toISOString(),
          scheduledTransferTime: transferDate.toISOString(),
          platformFee: applicationFeeAmount.toString(),
          expertAmount: expertAmount.toString(),
          requiresApproval: requiresApproval ? 'true' : 'false',
          transferStatus: 'PENDING',
        },
        success_url: `${baseUrl}/${username}/${eventSlug}/success?session_id={CHECKOUT_SESSION_ID}&startTime=${encodeURIComponent(
          meetingData.startTime,
        )}`,
        cancel_url: `${baseUrl}/${username}/${eventSlug}?s=2&d=${encodeURIComponent(
          meetingData.date,
        )}&t=${encodeURIComponent(meetingData.startTime)}&n=${encodeURIComponent(
          meetingData.guestName,
        )}&e=${encodeURIComponent(
          meetingData.guestEmail,
        )}&tz=${encodeURIComponent(meetingData.timezone)}`,
      } as Stripe.Checkout.SessionCreateParams),
    );

    console.log('Checkout session created successfully:', {
      sessionId: session.id,
      url: session.url,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error('Request processing failed:', {
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack,
            }
          : 'Unknown error',
      stripeError:
        error instanceof Stripe.errors.StripeError
          ? {
              type: error.type,
              code: error.code,
              decline_code: error.decline_code,
              param: error.param,
            }
          : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: error instanceof Stripe.errors.StripeError ? error.code : 'unknown',
      },
      { status: 500 },
    );
  }
}
