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
    // Log request details
    const body = await request.json();
    console.log('Request body received:', {
      eventId: body.eventId,
      hasPrice: !!body.price,
      hasMeetingData: !!body.meetingData,
      username: body.username,
      eventSlug: body.eventSlug,
    });

    const { eventId, price, meetingData, username, eventSlug } = body;

    // Validate required fields with detailed logging
    if (!price || !meetingData?.guestEmail) {
      console.warn('Missing required fields:', {
        hasPrice: !!price,
        hasGuestEmail: !!meetingData?.guestEmail,
        receivedPrice: price,
        receivedEmail: meetingData?.guestEmail,
      });
      return NextResponse.json(
        {
          message: 'Missing required fields: price and guest email are required',
          receivedData: { price, email: meetingData?.guestEmail },
        },
        { status: 400 },
      );
    }

    if (!meetingData?.startTime) {
      console.warn('Missing startTime in meeting data');
      return NextResponse.json({ message: 'Missing required field: startTime' }, { status: 400 });
    }

    try {
      // Log event query attempt
      console.log('Querying event details:', { eventId });

      // Get expert's Connect account ID
      const event = await db.query.EventTable.findFirst({
        where: eq(EventTable.id, eventId),
        with: {
          user: true,
        },
      });

      // Log event query results
      console.log('Event query results:', {
        eventFound: !!event,
        hasUser: !!event?.user,
        hasConnectAccount: !!event?.user?.stripeConnectAccountId,
        eventDetails: {
          id: event?.id,
          name: event?.name,
          price: event?.price,
          clerkUserId: event?.clerkUserId,
        },
      });

      if (!event?.user?.stripeConnectAccountId) {
        console.error('Expert Connect account not found:', {
          eventId,
          clerkUserId: event?.clerkUserId,
          userDetails: event?.user,
        });
        throw new Error("Expert's Connect account not found");
      }

      // Prepare meeting metadata with detailed logging
      const meetingMetadata = {
        ...meetingData,
        clerkUserId: event.clerkUserId,
        expertClerkUserId: event.clerkUserId,
        isGuest: 'true',
        guestEmail: meetingData.guestEmail,
        timezone: meetingData.timezone,
        startTime: meetingData.startTime,
      };

      console.log('Prepared meeting metadata:', {
        clerkUserId: meetingMetadata.clerkUserId,
        guestEmail: meetingMetadata.guestEmail,
        timezone: meetingMetadata.timezone,
        startTime: meetingMetadata.startTime,
      });

      // Get or create customer with logging
      console.log('Attempting to get/create Stripe customer:', {
        guestEmail: meetingData.guestEmail,
      });

      const customerId = await getOrCreateStripeCustomer(undefined, meetingData.guestEmail);

      console.log('Customer retrieved/created:', { customerId });

      // Calculate application fee
      const applicationFeeAmount = calculateApplicationFee(price);
      console.log('Calculated application fee:', {
        originalPrice: price,
        feeAmount: applicationFeeAmount,
        feePercentage: STRIPE_CONFIG.PLATFORM_FEE_PERCENTAGE,
      });

      // Calculate transfer schedule (3 hours after session)
      const sessionStartTime = new Date(meetingData.startTime);
      const transferDate = new Date(sessionStartTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours after session

      // Create checkout session with detailed logging
      console.log('Creating checkout session with params:', {
        customerId,
        price,
        applicationFeeAmount,
        connectAccountId: event.user.stripeConnectAccountId,
        currency: STRIPE_CONFIG.CURRENCY,
      });

      const baseUrl = getBaseUrl();

      const session = await withRetry(async () =>
        stripe.checkout.sessions.create({
          customer: customerId as string,
          payment_method_types: [...STRIPE_CONFIG.PAYMENT_METHODS],
          mode: 'payment',
          allow_promotion_codes: true,
          billing_address_collection: 'required',
          payment_intent_data: {
            application_fee_amount: applicationFeeAmount,
            transfer_data: {
              destination: event.user.stripeConnectAccountId,
            },
            metadata: {
              eventId,
              meetingData: JSON.stringify(meetingMetadata),
              expertConnectAccountId: event.user.stripeConnectAccountId,
              sessionStartTime: sessionStartTime.toISOString(),
              scheduledTransferTime: transferDate.toISOString(),
            },
          },
          line_items: [
            {
              price_data: {
                currency: STRIPE_CONFIG.CURRENCY,
                product_data: {
                  name: 'Consultation Booking',
                  description: `Booking for ${meetingData.guestName} on ${sessionStartTime.toLocaleString()} (funds will be released 3 hours after session)`,
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
            sessionStartTime: sessionStartTime.toISOString(),
            scheduledTransferTime: transferDate.toISOString(),
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
      console.error('Checkout session creation failed:', {
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
        customerId: error instanceof Error ? error.cause : undefined,
      });
      throw error;
    }
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
      timestamp: new Date().toISOString(),
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
