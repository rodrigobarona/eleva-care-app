import {
  calculateApplicationFee,
  DEFAULT_COUNTRY,
  getMinimumPayoutDelay,
  STRIPE_CONFIG,
} from '@/config/stripe';
import { db } from '@/drizzle/db';
import { EventTable, MeetingTable, SlotReservationTable } from '@/drizzle/schema';
import { PAYMENT_TRANSFER_STATUS_PENDING } from '@/lib/constants/payment-transfers';
import { IdempotencyCache, RateLimitCache } from '@/lib/redis';
import { getOrCreateStripeCustomer } from '@/lib/stripe';
import { getAuth } from '@clerk/nextjs/server';
import { and, eq, gt } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

// Payment rate limiting configuration (stricter than identity verification)
const PAYMENT_RATE_LIMITS = {
  // User-based limits (very strict for financial operations)
  USER: {
    maxAttempts: 5,
    windowSeconds: 900, // 15 minutes
    description: 'per user per 15 minutes',
  },
  // IP-based limits (abuse prevention)
  IP: {
    maxAttempts: 20,
    windowSeconds: 900, // 15 minutes
    description: 'per IP per 15 minutes',
  },
  // Global system protection
  GLOBAL: {
    maxAttempts: 1000,
    windowSeconds: 60, // 1 minute
    description: 'system-wide per minute',
  },
  // Daily user limits (additional protection)
  USER_DAILY: {
    maxAttempts: 20,
    windowSeconds: 86400, // 24 hours
    description: 'per user per day',
  },
} as const;

/**
 * Enhanced payment rate limiting with multi-layer protection
 * Implements stricter limits for financial operations
 */
async function checkPaymentRateLimits(userId: string, clientIP: string) {
  try {
    // Layer 1: User-based rate limiting (strictest - 15 minute window)
    const userLimit = await RateLimitCache.checkRateLimit(
      `payment:user:${userId}`,
      PAYMENT_RATE_LIMITS.USER.maxAttempts,
      PAYMENT_RATE_LIMITS.USER.windowSeconds,
    );

    if (!userLimit.allowed) {
      return {
        allowed: false,
        reason: 'user_limit_exceeded',
        message: `Too many payment attempts. You can try again in ${Math.ceil((userLimit.resetTime - Date.now()) / 1000)} seconds.`,
        resetTime: userLimit.resetTime,
        remaining: userLimit.remaining,
        limit: `${PAYMENT_RATE_LIMITS.USER.maxAttempts} ${PAYMENT_RATE_LIMITS.USER.description}`,
      };
    }

    // Layer 2: Daily user limits (additional fraud protection)
    const userDailyLimit = await RateLimitCache.checkRateLimit(
      `payment:user-daily:${userId}`,
      PAYMENT_RATE_LIMITS.USER_DAILY.maxAttempts,
      PAYMENT_RATE_LIMITS.USER_DAILY.windowSeconds,
    );

    if (!userDailyLimit.allowed) {
      return {
        allowed: false,
        reason: 'user_daily_limit_exceeded',
        message:
          'Daily payment attempt limit reached. Please try again tomorrow or contact support if you need assistance.',
        resetTime: userDailyLimit.resetTime,
        remaining: userDailyLimit.remaining,
        limit: `${PAYMENT_RATE_LIMITS.USER_DAILY.maxAttempts} ${PAYMENT_RATE_LIMITS.USER_DAILY.description}`,
      };
    }

    // Layer 3: IP-based rate limiting (abuse prevention)
    const ipLimit = await RateLimitCache.checkRateLimit(
      `payment:ip:${clientIP}`,
      PAYMENT_RATE_LIMITS.IP.maxAttempts,
      PAYMENT_RATE_LIMITS.IP.windowSeconds,
    );

    if (!ipLimit.allowed) {
      return {
        allowed: false,
        reason: 'ip_limit_exceeded',
        message: `Too many payment attempts from this location. Please try again in ${Math.ceil((ipLimit.resetTime - Date.now()) / 1000)} seconds.`,
        resetTime: ipLimit.resetTime,
        remaining: ipLimit.remaining,
        limit: `${PAYMENT_RATE_LIMITS.IP.maxAttempts} ${PAYMENT_RATE_LIMITS.IP.description}`,
      };
    }

    // Layer 4: Global system protection
    const globalLimit = await RateLimitCache.checkRateLimit(
      'payment:global',
      PAYMENT_RATE_LIMITS.GLOBAL.maxAttempts,
      PAYMENT_RATE_LIMITS.GLOBAL.windowSeconds,
    );

    if (!globalLimit.allowed) {
      return {
        allowed: false,
        reason: 'system_limit_exceeded',
        message:
          'System is currently experiencing high payment volume. Please try again in a moment.',
        resetTime: globalLimit.resetTime,
        remaining: globalLimit.remaining,
        limit: `${PAYMENT_RATE_LIMITS.GLOBAL.maxAttempts} ${PAYMENT_RATE_LIMITS.GLOBAL.description}`,
      };
    }

    // All limits passed
    return {
      allowed: true,
      limits: {
        user: {
          remaining: userLimit.remaining,
          resetTime: userLimit.resetTime,
          totalHits: userLimit.totalHits,
        },
        userDaily: {
          remaining: userDailyLimit.remaining,
          resetTime: userDailyLimit.resetTime,
          totalHits: userDailyLimit.totalHits,
        },
        ip: {
          remaining: ipLimit.remaining,
          resetTime: ipLimit.resetTime,
          totalHits: ipLimit.totalHits,
        },
        global: {
          remaining: globalLimit.remaining,
          resetTime: globalLimit.resetTime,
          totalHits: globalLimit.totalHits,
        },
      },
    };
  } catch (error) {
    console.error('Redis payment rate limiting error:', error);

    // For payment endpoints, we're more cautious - temporarily block on Redis errors
    console.warn('Payment rate limiting failed - applying temporary restriction');
    return {
      allowed: false,
      reason: 'rate_limiting_error',
      message: 'Payment processing is temporarily unavailable. Please try again in a few moments.',
      fallback: true,
    };
  }
}

/**
 * Record payment rate limit attempts across all layers
 */
async function recordPaymentRateLimitAttempts(userId: string, clientIP: string) {
  try {
    await Promise.all([
      RateLimitCache.recordAttempt(
        `payment:user:${userId}`,
        PAYMENT_RATE_LIMITS.USER.windowSeconds,
      ),
      RateLimitCache.recordAttempt(
        `payment:user-daily:${userId}`,
        PAYMENT_RATE_LIMITS.USER_DAILY.windowSeconds,
      ),
      RateLimitCache.recordAttempt(`payment:ip:${clientIP}`, PAYMENT_RATE_LIMITS.IP.windowSeconds),
      RateLimitCache.recordAttempt('payment:global', PAYMENT_RATE_LIMITS.GLOBAL.windowSeconds),
    ]);
  } catch (error) {
    console.error('Error recording payment rate limit attempts:', error);
    // Continue execution even if recording fails
  }
}

// Helper function to create shared metadata for checkout session and payment intent
// Note: sessionId is intentionally NOT included in metadata as it's always available
// in webhook events via event.data.object.id and following Stripe best practices
function createSharedMetadata({
  eventId,
  expertClerkUserId,
  guestEmail,
  guestName,
  startTime,
  duration,
  guestNotes,
  price,
  platformFee,
  expertAmount,
  expertStripeAccountId,
  expertCountry,
  paymentAgingDays,
  remainingDelayDays,
  requiredPayoutDelay,
  scheduledTransferTime,
  requiresApproval,
  meetingData,
}: {
  eventId: string;
  expertClerkUserId: string;
  guestEmail: string;
  guestName: string;
  startTime: string;
  duration: number;
  guestNotes?: string;
  price: number;
  platformFee: number;
  expertAmount: number;
  expertStripeAccountId: string;
  expertCountry: string;
  paymentAgingDays: number;
  remainingDelayDays: number;
  requiredPayoutDelay: number;
  scheduledTransferTime: Date;
  requiresApproval: boolean;
  meetingData: {
    timezone?: string;
    locale?: string;
    guestEmail: string;
    guestName: string;
    startTime: string;
    guestNotes?: string;
  };
}) {
  return {
    meeting: JSON.stringify({
      id: eventId,
      expert: expertClerkUserId,
      guest: guestEmail,
      guestName: guestName,
      start: startTime,
      dur: duration,
      notes: guestNotes || '',
    }),
    payment: JSON.stringify({
      amount: price.toString(),
      fee: platformFee.toString(),
      expert: expertAmount.toString(),
    }),
    transfer: JSON.stringify({
      status: PAYMENT_TRANSFER_STATUS_PENDING,
      account: expertStripeAccountId,
      country: expertCountry || 'Unknown',
      delay: {
        aging: paymentAgingDays,
        remaining: remainingDelayDays,
        required: requiredPayoutDelay,
      },
      scheduled: scheduledTransferTime.toISOString(),
    }),
    approval: requiresApproval.toString(),
    // Add tax and locale handling at root level of metadata
    isEuropeanCustomer: meetingData.timezone?.includes('Europe') ? 'true' : 'false',
    preferredTaxHandling: 'vat_only',
  };
}

export async function POST(request: NextRequest) {
  console.log('Starting payment intent creation process');

  try {
    // **AUTHENTICATION: Verify user is authenticated**
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // **RATE LIMITING: Apply payment-specific rate limits**
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIP =
      forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

    const rateLimitResult = await checkPaymentRateLimits(userId, clientIP);

    if (!rateLimitResult.allowed) {
      console.log(`Payment rate limit exceeded for user ${userId} (IP: ${clientIP}):`, {
        reason: rateLimitResult.reason,
        limit: rateLimitResult.limit,
        resetTime: rateLimitResult.resetTime,
      });

      return NextResponse.json(
        {
          error: rateLimitResult.message,
          details: {
            reason: rateLimitResult.reason,
            resetTime: rateLimitResult.resetTime,
            limit: rateLimitResult.limit,
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit || 'Payment rate limit exceeded',
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime?.toString() || '0',
            'Retry-After': rateLimitResult.resetTime
              ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
              : '60',
          },
        },
      );
    }

    // **IDEMPOTENCY: Check for duplicate requests using distributed cache**
    const idempotencyKey = request.headers.get('Idempotency-Key');

    if (idempotencyKey) {
      // Check if we've seen this request before in distributed cache
      const cachedResult = await IdempotencyCache.get(idempotencyKey);
      if (cachedResult) {
        console.log(`🔄 Returning cached result for idempotency key: ${idempotencyKey}`);
        return NextResponse.json({ url: cachedResult.url });
      }
    }

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

    // **RECORD RATE LIMIT ATTEMPT: Only after validating request**
    await recordPaymentRateLimitAttempts(userId, clientIP);

    // Extract locale for translations
    const locale = meetingData.locale || 'en';

    // Get translations for the checkout messages
    const t = await getTranslations({ locale, namespace: 'Payments.checkout' });

    // Construct URLs for legal pages
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://eleva.care';
    const paymentPoliciesUrl = `${baseUrl}/${locale}/legal/payment-policies`;
    const termsUrl = `${baseUrl}/${locale}/legal/terms-of-service`;

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

    // **CRITICAL: Check for existing reservations and conflicts BEFORE creating anything**
    const appointmentStartTime = new Date(meetingData.startTime);

    // Check for existing active reservations for this exact slot
    const existingReservation = await db.query.SlotReservationTable.findFirst({
      where: and(
        eq(SlotReservationTable.eventId, eventId),
        eq(SlotReservationTable.startTime, appointmentStartTime),
        gt(SlotReservationTable.expiresAt, new Date()), // Only active reservations
      ),
    });

    if (existingReservation) {
      // Check if it's the same user (allow them to continue with existing reservation)
      if (existingReservation.guestEmail === meetingData.guestEmail) {
        console.log('User has existing active reservation, checking if we can reuse session:', {
          reservationId: existingReservation.id,
          sessionId: existingReservation.stripeSessionId,
          expiresAt: existingReservation.expiresAt,
        });

        // Try to retrieve the existing Stripe session
        if (existingReservation.stripeSessionId) {
          try {
            const existingSession = await stripe.checkout.sessions.retrieve(
              existingReservation.stripeSessionId,
            );

            // If session is still valid and unpaid, return it
            if (existingSession.status === 'open' && existingSession.payment_status === 'unpaid') {
              console.log('Reusing existing valid session:', existingSession.id);
              return NextResponse.json({
                url: existingSession.url,
              });
            } else {
              console.log('Existing session is no longer valid:', {
                status: existingSession.status,
                paymentStatus: existingSession.payment_status,
              });
              // Clean up the expired reservation
              await db
                .delete(SlotReservationTable)
                .where(eq(SlotReservationTable.id, existingReservation.id));
            }
          } catch (stripeError) {
            console.log('Failed to retrieve existing session, will create new one:', stripeError);
            // Clean up the invalid reservation
            await db
              .delete(SlotReservationTable)
              .where(eq(SlotReservationTable.id, existingReservation.id));
          }
        }
      } else {
        // Different user has this slot reserved
        console.warn('Slot already reserved by another user:', {
          requestingUser: meetingData.guestEmail,
          reservedBy: existingReservation.guestEmail,
          expiresAt: existingReservation.expiresAt,
        });
        return NextResponse.json(
          {
            error:
              'This time slot is temporarily reserved by another user. Please choose a different time or try again later.',
            code: 'SLOT_TEMPORARILY_RESERVED',
          },
          { status: 409 },
        );
      }
    }

    // Check for confirmed meetings in this slot
    const conflictingMeeting = await db.query.MeetingTable.findFirst({
      where: and(
        eq(MeetingTable.eventId, eventId),
        eq(MeetingTable.startTime, appointmentStartTime),
        eq(MeetingTable.stripePaymentStatus, 'succeeded'),
      ),
    });

    if (conflictingMeeting) {
      console.error('Time slot already booked with confirmed payment:', {
        eventId,
        startTime: appointmentStartTime,
        requestingUser: meetingData.guestEmail,
        existingBooking: {
          id: conflictingMeeting.id,
          email: conflictingMeeting.guestEmail,
        },
      });
      return NextResponse.json(
        {
          error: 'This time slot has been booked by another user. Please choose a different time.',
          code: 'SLOT_ALREADY_BOOKED',
        },
        { status: 409 },
      );
    }

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

      console.log(
        `🕒 Advance booking: Meeting in ${hoursUntilMeeting.toFixed(1)}h - Card + Multibanco, 24h to pay`,
      );
    }

    // Calculate fees
    const platformFee = applicationFeeAmount;
    const scheduledTransferTime = transferDate;

    // Create metadata object once to avoid duplication
    const sharedMetadata = createSharedMetadata({
      eventId,
      expertClerkUserId: event.clerkUserId,
      guestEmail: meetingData.guestEmail,
      guestName: meetingData.guestName,
      startTime: meetingData.startTime,
      duration: event.durationInMinutes,
      guestNotes: meetingData.guestNotes,
      price,
      platformFee,
      expertAmount,
      expertStripeAccountId,
      expertCountry,
      paymentAgingDays,
      remainingDelayDays,
      requiredPayoutDelay,
      scheduledTransferTime,
      requiresApproval,
      meetingData,
    });

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
      consent_collection: {
        terms_of_service: 'required',
      },
      // Add notice about Multibanco availability based on appointment timing
      ...(hoursUntilMeeting > 72 &&
        paymentMethodTypes.includes('multibanco') && {
          custom_text: {
            submit: {
              message: t('multibancoNotice', { paymentPoliciesUrl }),
            },
            terms_of_service_acceptance: {
              message: t('termsOfService', { termsUrl, paymentPoliciesUrl }),
            },
          },
        }),
      // For appointments within 72 hours (no Multibanco), still show terms
      ...(hoursUntilMeeting <= 72 && {
        custom_text: {
          terms_of_service_acceptance: {
            message: t('termsOfService', { termsUrl, paymentPoliciesUrl }),
          },
        },
      }),
      // Enhanced customer information collection
      locale: meetingData.locale || 'en',
      customer_update: {
        name: 'auto',
        address: 'auto',
      },
      submit_type: 'book',
      // Prefill customer information only if we don't have an existing customer
      ...(!customerId &&
        meetingData.guestName && {
          customer_email: meetingData.guestEmail,
          customer_name: meetingData.guestName,
        }),
      // ADD METADATA TO CHECKOUT SESSION (for webhook processing)
      metadata: sharedMetadata,
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: expertStripeAccountId,
        },
        metadata: {
          ...sharedMetadata,
          session_id: '', // Will be updated after session creation
        },
      },
    });

    console.log('Checkout session created successfully:', {
      sessionId: session.id,
      url: session.url,
    });

    // **IMPORTANT: Update payment intent with session ID for webhook linking**
    if (session.payment_intent) {
      try {
        await stripe.paymentIntents.update(session.payment_intent.toString(), {
          metadata: {
            session_id: session.id,
          },
        });
        console.log('✅ Payment intent updated with session ID:', {
          paymentIntentId: session.payment_intent,
          sessionId: session.id,
        });
      } catch (updateError) {
        console.error('Failed to update payment intent with session ID:', updateError);
        // Continue execution - this is not critical for the immediate flow
      }
    }

    // **CRITICAL: Create slot reservation immediately after session creation to prevent race conditions**
    // This must be done atomically to prevent double-booking between concurrent requests
    try {
      const endTime = new Date(
        appointmentStartTime.getTime() + event.durationInMinutes * 60 * 1000,
      );

      // Use database transaction to ensure atomicity of check + insert
      await db.transaction(async (tx) => {
        // Re-check for conflicts within transaction to prevent race conditions
        const conflictCheck = await tx.query.SlotReservationTable.findFirst({
          where: and(
            eq(SlotReservationTable.eventId, eventId),
            eq(SlotReservationTable.startTime, appointmentStartTime),
            gt(SlotReservationTable.expiresAt, new Date()),
          ),
        });

        // Also check for confirmed meetings within transaction
        const meetingConflictCheck = await tx.query.MeetingTable.findFirst({
          where: and(
            eq(MeetingTable.eventId, eventId),
            eq(MeetingTable.startTime, appointmentStartTime),
            eq(MeetingTable.stripePaymentStatus, 'succeeded'),
          ),
        });

        if (conflictCheck || meetingConflictCheck) {
          // If conflict detected within transaction, delete the Stripe session and fail
          try {
            await stripe.checkout.sessions.expire(session.id);
            console.log(
              'Expired Stripe session due to conflict detected in transaction:',
              session.id,
            );
          } catch (expireError) {
            console.error('Failed to expire Stripe session after conflict:', expireError);
          }

          const conflictType = conflictCheck ? 'slot reservation' : 'confirmed meeting';
          const conflictEmail = conflictCheck?.guestEmail || meetingConflictCheck?.guestEmail;

          throw new Error(
            `Race condition detected: ${conflictType} exists for this slot (conflicting user: ${conflictEmail})`,
          );
        }

        // Create slot reservation within transaction
        const slotReservation = await tx
          .insert(SlotReservationTable)
          .values({
            eventId: eventId,
            clerkUserId: event.clerkUserId,
            guestEmail: meetingData.guestEmail,
            startTime: appointmentStartTime,
            endTime: endTime,
            expiresAt: paymentExpiresAt,
            stripeSessionId: session.id,
            stripePaymentIntentId: null, // Will be updated when payment intent is created
          })
          .onConflictDoNothing({
            target: [
              SlotReservationTable.eventId,
              SlotReservationTable.startTime,
              SlotReservationTable.guestEmail,
            ],
          })
          .returning({ id: SlotReservationTable.id });

        // Check if the insert was successful (not conflicted)
        if (slotReservation.length === 0) {
          throw new Error(
            'Unique constraint violation: Another reservation exists for this slot and user combination',
          );
        }

        console.log('✅ Slot reservation created successfully in transaction:', {
          reservationId: slotReservation[0].id,
          sessionId: session.id,
          guestEmail: meetingData.guestEmail,
          startTime: appointmentStartTime.toISOString(),
          expiresAt: paymentExpiresAt.toISOString(),
        });
      });

      console.log('🔒 Slot reserved atomically - no race condition possible');
    } catch (reservationError) {
      console.error('Failed to create slot reservation:', reservationError);

      // If we can't reserve the slot, we should not allow the user to proceed
      // Expire the Stripe session since the slot cannot be reserved
      try {
        await stripe.checkout.sessions.expire(session.id);
        console.log('Expired Stripe session due to reservation failure:', session.id);
      } catch (expireError) {
        console.error('Failed to expire Stripe session after reservation failure:', expireError);
      }

      // Return appropriate error based on the reservation failure
      if (
        reservationError instanceof Error &&
        reservationError.message.includes('Race condition detected')
      ) {
        return NextResponse.json(
          {
            error:
              'This time slot was just booked by another user. Please choose a different time.',
            code: 'SLOT_RACE_CONDITION',
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to reserve the time slot. Please try again.',
          code: 'SLOT_RESERVATION_FAILED',
        },
        { status: 500 },
      );
    }

    // **IDEMPOTENCY: Cache the successful result**
    if (idempotencyKey && session.url) {
      await IdempotencyCache.set(idempotencyKey, {
        url: session.url,
      });
      console.log(`💾 Cached result for idempotency key: ${idempotencyKey}`);
    }

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
