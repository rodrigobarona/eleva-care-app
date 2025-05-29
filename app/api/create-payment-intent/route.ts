import {
  calculateApplicationFee,
  DEFAULT_COUNTRY,
  getMinimumPayoutDelay,
  STRIPE_CONFIG,
} from '@/config/stripe';
import { db } from '@/drizzle/db';
import { EventTable, SlotReservationTable } from '@/drizzle/schema';
import { PAYMENT_TRANSFER_STATUS_PENDING } from '@/lib/constants/payment-transfers';
import { getOrCreateStripeCustomer } from '@/lib/stripe';
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
        user: {
          columns: {
            stripeConnectAccountId: true,
            firstName: true,
            lastName: true,
            country: true,
          },
        },
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

    const expertStripeAccountId = event.user.stripeConnectAccountId;

    // Prepare meeting metadata
    const meetingMetadata = {
      eventId: eventId, // Added eventId here
      expertClerkUserId: event.clerkUserId,
      expertName: `${event.user.firstName || ''} ${event.user.lastName || ''}`.trim() || 'Expert',
      guestName: meetingData.guestName,
      guestEmail: meetingData.guestEmail,
      guestNotes: meetingData.guestNotes,
      startTime: meetingData.startTime, // This is the original startTime from the client
      startTimeFormatted:
        meetingData.startTimeFormatted ||
        (meetingData.locale
          ? new Date(meetingData.startTime).toLocaleString(meetingData.locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short',
            })
          : new Date(meetingData.startTime).toISOString()),
      duration: event.durationInMinutes,
      timezone: meetingData.timezone,
      price: price,
      locale: meetingData.locale || 'en',
    };

    console.log('Prepared meeting metadata for Stripe:', meetingMetadata);

    // Get or create customer with guest name for prefilled checkout
    console.log('Attempting to get/create Stripe customer with name:', meetingData.guestName);
    const customerId = await getOrCreateStripeCustomer(
      undefined,
      meetingData.guestEmail,
      meetingData.guestName, // Pass the guest name to prefill in checkout
    );
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

    // Get the expert's country code for country-specific payout delay
    const expertCountry = event.user.country || DEFAULT_COUNTRY;
    const requiredPayoutDelay = getMinimumPayoutDelay(expertCountry);

    // Calculate transfer schedule
    const sessionStartTime = new Date(meetingData.startTime);
    // Add session duration (or default to 1 hour) + configured delay
    const sessionDurationMs = meetingData.duration
      ? meetingData.duration * 60 * 1000
      : 60 * 60 * 1000;

    // Calculate how many days between payment (now) and session
    const currentDate = new Date();
    const paymentAgingDays = Math.max(
      0,
      Math.floor((sessionStartTime.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000)),
    );

    // Calculate the remaining required delay after session
    // Ensure at least 1 day after session, but respect remaining Stripe requirements
    const remainingDelayDays = Math.max(1, requiredPayoutDelay - paymentAgingDays);

    // Set transfer date based on session date plus remaining delay
    const transferDate = new Date(
      sessionStartTime.getTime() + sessionDurationMs + remainingDelayDays * 24 * 60 * 60 * 1000,
    );

    // Set to 4 AM on the scheduled day (matching CRON job time)
    transferDate.setHours(4, 0, 0, 0);

    console.log('Scheduled transfer with payment aging consideration:', {
      currentDate: currentDate.toISOString(),
      sessionStartTime: sessionStartTime.toISOString(),
      expertCountry,
      requiredPayoutDelay,
      paymentAgingDays,
      remainingDelayDays,
      transferDate: transferDate.toISOString(),
    });

    // Calculate payment expiration and determine payment methods based on timing
    const meetingDate = new Date(meetingData.startTime);
    const currentTime = new Date();
    const hoursUntilMeeting = (meetingDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

    // Determine payment methods and expiration time based on meeting timing
    let paymentMethodTypes: string[];
    let paymentExpiresAt: Date;
    let reservationExpiresAt: Date | null = null;

    if (hoursUntilMeeting <= 48) {
      // Meeting is within 48 hours - CREDIT CARD ONLY for instant confirmation
      paymentMethodTypes = ['card'];

      // Payment must complete within 30 minutes
      paymentExpiresAt = new Date(currentTime.getTime() + 30 * 60 * 1000);

      console.log(
        `⚡ Quick booking: Meeting in ${hoursUntilMeeting.toFixed(1)}h - Card only, 30min to pay`,
      );
    } else {
      // Meeting is > 48 hours away - Allow both Card and Multibanco
      paymentMethodTypes = ['card', 'multibanco'];

      // Payment can take up to 4 hours to complete
      paymentExpiresAt = new Date(currentTime.getTime() + 4 * 60 * 60 * 1000);

      // Reserve slot for 4 hours (same as payment expiration)
      reservationExpiresAt = paymentExpiresAt;

      console.log(
        `🕒 Advance booking: Meeting in ${hoursUntilMeeting.toFixed(1)}h - Card + Multibanco, 4h to pay + slot hold`,
      );
    }

    // Get base URL and locale for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eleva.care';
    const locale = meetingMetadata.locale || 'en';

    // Calculate fees
    const platformFee = applicationFeeAmount;
    const expertAccount = event.user;
    const scheduledTransferTime = transferDate;

    // Create the checkout session with conditional payment methods
    const session = await stripe.checkout.sessions.create({
      payment_method_types:
        paymentMethodTypes as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${event.name} with ${meetingMetadata.expertName}`,
              description: `${meetingMetadata.duration} minute session on ${meetingMetadata.startTimeFormatted}`,
            },
            unit_amount: meetingMetadata.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/${locale}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/${locale}/${username}/${eventSlug}`,
      customer_email: meetingMetadata.guestEmail,
      expires_at: Math.floor(paymentExpiresAt.getTime() / 1000),
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: expertStripeAccountId,
        },
        metadata: {
          meetingData: JSON.stringify(meetingMetadata),
          expertAmount: expertAmount.toString(),
          platformFee: platformFee.toString(),
          transferStatus: PAYMENT_TRANSFER_STATUS_PENDING,
          expertConnectAccountId: expertStripeAccountId,
          expertCountry: expertAccount.country || 'Unknown',
          paymentAgingDays: paymentAgingDays.toString(),
          remainingDelayDays: remainingDelayDays.toString(),
          requiredPayoutDelay: requiredPayoutDelay.toString(),
          requiresApproval: requiresApproval.toString(),
          scheduledTransferTime: scheduledTransferTime.toISOString(),
        },
      },
    });

    // Create slot reservation for delayed payment methods (if needed)
    if (reservationExpiresAt && paymentMethodTypes.includes('multibanco')) {
      try {
        await db.insert(SlotReservationTable).values({
          eventId: meetingMetadata.eventId,
          clerkUserId: meetingMetadata.expertClerkUserId,
          guestEmail: meetingMetadata.guestEmail,
          startTime: new Date(meetingMetadata.startTime),
          endTime: new Date(
            new Date(meetingMetadata.startTime).getTime() + meetingMetadata.duration * 60 * 1000,
          ),
          expiresAt: reservationExpiresAt,
          stripePaymentIntentId: null, // Will be updated when PI is created
          stripeSessionId: session.id,
        });

        console.log(
          `🔒 Slot reserved until ${reservationExpiresAt.toISOString()} for ${meetingMetadata.guestEmail}`,
        );
      } catch (error) {
        console.error('Failed to create slot reservation:', error);
        // Continue anyway - the payment flow should still work
      }
    }

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
