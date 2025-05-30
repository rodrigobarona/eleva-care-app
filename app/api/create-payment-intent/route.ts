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
import { randomUUID } from 'node:crypto';
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
      eventId,
      expertId: event.clerkUserId,
      expertName: `${event.user.firstName || ''} ${event.user.lastName || ''}`.trim() || 'Expert',
      guestName: meetingData.guestName,
      guestEmail: meetingData.guestEmail,
      start: meetingData.startTime,
      duration: event.durationInMinutes,
      tz: meetingData.timezone,
      price,
      loc: meetingData.locale || 'en',
      locale: meetingData.locale || 'en',
    };

    // Store guest notes separately in the database if needed
    // We don't include them in Stripe metadata to avoid size limits
    // The notes will be available through the meeting record

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

    if (hoursUntilMeeting <= 72) {
      // Meeting is within 72 hours - CREDIT CARD ONLY for instant confirmation
      paymentMethodTypes = ['card'];

      // Payment must complete within 30 minutes
      paymentExpiresAt = new Date(currentTime.getTime() + 30 * 60 * 1000);

      console.log(
        `⚡ Quick booking: Meeting in ${hoursUntilMeeting.toFixed(1)}h - Card only, 30min to pay`,
      );
    } else {
      // Meeting is > 72 hours away - Allow both Card and Multibanco
      paymentMethodTypes = ['card', 'multibanco'];

      // Payment can take up to 24 hours to complete (Multibanco minimum)
      paymentExpiresAt = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);

      // Reserve slot for 24 hours (same as payment expiration)
      reservationExpiresAt = paymentExpiresAt;

      console.log(
        `🕒 Advance booking: Meeting in ${hoursUntilMeeting.toFixed(1)}h - Card + Multibanco, 24h to pay + slot hold`,
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
              description: `${meetingMetadata.duration} minute session on ${new Date(
                meetingMetadata.start,
              ).toLocaleString(meetingMetadata.loc, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short',
              })}`,
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/${locale}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/${locale}/${username}/${eventSlug}`,
      customer: customerId,
      customer_creation: customerId ? undefined : 'always',
      expires_at: Math.floor(paymentExpiresAt.getTime() / 1000),
      allow_promotion_codes: true,
      // Enhanced tax handling
      automatic_tax: {
        enabled: true,
        liability: { type: 'account', account: expertStripeAccountId },
      },
      tax_id_collection: {
        enabled: true,
        required: 'if_supported',
      },
      // Billing address collection for tax calculation
      billing_address_collection: 'required',
      // Enhanced terms of service consent
      consent_collection: {
        terms_of_service: 'required',
      },
      custom_text: {
        terms_of_service_acceptance: {
          message: 'I agree to the [Terms of Service](https://eleva.care/legal/terms)',
        },
        // Add notice about Multibanco availability based on appointment timing
        ...(hoursUntilMeeting <= 72 && {
          submit: {
            message:
              '⚠️ **Payment Notice:** Multibanco payments are not available for appointments scheduled within 72 hours. Only credit/debit card payments are accepted for immediate booking confirmation.',
          },
        }),
      },
      // Enhanced customer information collection
      locale: meetingData.locale || 'en',
      customer_update: {
        name: 'auto',
        address: 'auto',
      },
      submit_type: 'book',
      // Prefill customer name if provided
      ...(meetingData.guestName && {
        customer_email: meetingData.guestEmail,
        customer_name: meetingData.guestName,
      }),
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: expertStripeAccountId,
        },
        metadata: {
          meeting: JSON.stringify({
            id: eventId,
            expert: event.clerkUserId,
            guest: meetingData.guestEmail,
            guestName: meetingData.guestName,
            start: meetingData.startTime,
            dur: event.durationInMinutes,
            notes: meetingData.guestNotes || '', // Preserve guest notes
          }),
          payment: JSON.stringify({
            amount: price.toString(),
            fee: platformFee.toString(),
            expert: expertAmount.toString(),
          }),
          transfer: JSON.stringify({
            status: PAYMENT_TRANSFER_STATUS_PENDING,
            account: expertStripeAccountId,
            country: expertAccount.country || 'Unknown',
            delay: {
              aging: paymentAgingDays,
              remaining: remainingDelayDays,
              required: requiredPayoutDelay,
            },
            scheduled: scheduledTransferTime.toISOString(),
          }),
          approval: requiresApproval.toString(),
          // Add tax and locale handling at root level of payment intent metadata
          isEuropeanCustomer: meetingData.timezone?.includes('Europe') ? 'true' : 'false',
          preferredTaxHandling: 'vat_only',
        },
        // Set Multibanco expiration to 1 day (Stripe minimum, matches our payment window)
        ...(paymentMethodTypes.includes('multibanco') && {
          payment_method_options: {
            multibanco: {
              expires_after_days: 1, // Minimum allowed by Stripe
            },
          },
        }),
      },
    });

    // Create slot reservation for delayed payment methods (if needed)
    if (reservationExpiresAt && paymentMethodTypes.includes('multibanco')) {
      // Create a slot reservation to prevent double-bookings
      await db.insert(SlotReservationTable).values({
        id: randomUUID(),
        eventId: event.id,
        clerkUserId: meetingMetadata.expertId,
        guestEmail: meetingMetadata.guestEmail,
        startTime: new Date(meetingMetadata.start),
        endTime: new Date(
          new Date(meetingMetadata.start).getTime() + meetingMetadata.duration * 60 * 1000,
        ),
        expiresAt: reservationExpiresAt,
        stripePaymentIntentId: null,
        stripeSessionId: session.id,
      });

      console.log(
        `🔒 Slot reserved until ${reservationExpiresAt.toISOString()} for ${meetingMetadata.guestEmail}`,
      );
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
