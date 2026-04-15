import {
  calculateApplicationFee,
  DEFAULT_COUNTRY,
  getMinimumPayoutDelay,
  isAuthoritativePriceMatch,
  STRIPE_CONFIG,
} from '@/config/stripe';
import { db } from '@/drizzle/db';
import { EventTable, MeetingTable, SlotReservationTable } from '@/drizzle/schema';
import { PAYMENT_TRANSFER_STATUS_PENDING } from '@/lib/constants/payment-transfers';
import { getOrCreateStripeCustomer } from '@/lib/integrations/stripe';
import { FormCache, RateLimitCache } from '@/lib/redis/manager';
import { and, eq, gt, lt } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';

const checkoutRequestSchema = z.object({
  eventId: z.string().uuid(),
  clerkUserId: z.string().min(1),
  price: z.number().int().positive(),
  meetingData: z.object({
    guestEmail: z.string().email(),
    guestName: z.string().min(1),
    startTime: z.string().min(1),
    guestNotes: z.string().optional(),
    timezone: z.string().optional(),
    locale: z.string().optional(),
    duration: z.number().optional(),
    date: z.string().optional(),
    startTimeFormatted: z.string().optional(),
  }),
  username: z.string().min(1),
  eventSlug: z.string().min(1),
  requestKey: z.string().optional(),
});

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
async function checkPaymentRateLimits(userIdentifier: string, clientIP: string) {
  try {
    // Layer 1: User-based rate limiting (strictest - 15 minute window)
    // userIdentifier can be either "userId" or "guest:email"
    const userLimit = await RateLimitCache.checkRateLimit(
      `payment:${userIdentifier}`, // This will create "payment:guest:email" or "payment:userId"
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
      `payment:daily:${userIdentifier}`, // Consistent naming: "payment:daily:guest:email" or "payment:daily:userId"
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
async function recordPaymentRateLimitAttempts(userIdentifier: string, clientIP: string) {
  try {
    await Promise.all([
      RateLimitCache.recordAttempt(
        `payment:${userIdentifier}`, // Consistent with checkPaymentRateLimits
        PAYMENT_RATE_LIMITS.USER.windowSeconds,
      ),
      RateLimitCache.recordAttempt(
        `payment:daily:${userIdentifier}`, // Consistent with checkPaymentRateLimits
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
  requiredPayoutDelay,
  scheduledTransferTime,
  appointmentEndTime,
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
  requiredPayoutDelay: number;
  scheduledTransferTime: Date;
  appointmentEndTime: Date;
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
      timezone: meetingData.timezone || 'UTC',
      locale: meetingData.locale || 'en',
    }),
    payment: JSON.stringify({
      amount: price.toString(),
      fee: platformFee.toString(),
      expert: expertAmount.toString(),
      feeBasis: STRIPE_CONFIG.MARKETPLACE_SPLIT.FEE_BASIS,
    }),
    transfer: JSON.stringify({
      status: PAYMENT_TRANSFER_STATUS_PENDING,
      account: expertStripeAccountId,
      country: expertCountry || 'Unknown',
      delay: {
        aging: paymentAgingDays,
        required: requiredPayoutDelay,
      },
      scheduled: scheduledTransferTime.toISOString(),
      appointmentEnd: appointmentEndTime.toISOString(), // 🆕 Added for late payment validation
    }),
    approval: requiresApproval.toString(),
  };
}

export async function POST(request: NextRequest) {
  console.log('Starting payment intent creation process');

  let eventId = '';
  let meetingData:
    | {
        timezone?: string;
        locale?: string;
        guestEmail: string;
        guestName: string;
        startTime: string;
        guestNotes?: string;
        duration?: number;
        date?: string;
        startTimeFormatted?: string;
      }
    | undefined;

  try {
    const body = await request.json();
    const parsed = checkoutRequestSchema.safeParse(body);

    if (!parsed.success) {
      console.warn('Request validation failed:', parsed.error.flatten().fieldErrors);
      return NextResponse.json(
        {
          error: 'Invalid request',
          code: 'VALIDATION_ERROR',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const {
      eventId: extractedEventId,
      clerkUserId,
      price: clientProvidedPrice,
      meetingData: extractedMeetingData,
      username,
    } = parsed.data;

    // Approval is always server-controlled, never accepted from the client
    const requiresApproval = false;

    eventId = extractedEventId;
    meetingData = extractedMeetingData;

    // From this point meetingData is guaranteed non-undefined (Zod validated)
    const validatedMeetingData = meetingData;

    // **RATE LIMITING: Apply payment-specific rate limits using guest email instead of userId**
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIP =
      forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

    // Use guest email as identifier for rate limiting since guests aren't authenticated
    const guestIdentifier = `guest:${meetingData.guestEmail}`;
    const rateLimitResult = await checkPaymentRateLimits(guestIdentifier, clientIP);

    if (!rateLimitResult.allowed) {
      console.log(
        `Payment rate limit exceeded for guest ${meetingData.guestEmail} (IP: ${clientIP}):`,
        {
          reason: rateLimitResult.reason,
          limit: rateLimitResult.limit,
          resetTime: rateLimitResult.resetTime,
        },
      );

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

    const idempotencyKey = request.headers.get('Idempotency-Key')?.trim();

    if (!idempotencyKey) {
      return NextResponse.json({ error: 'Missing Idempotency-Key header' }, { status: 400 });
    }

    // **FORM CACHE: Additional duplicate prevention for form submissions**
    if (meetingData?.guestEmail && meetingData?.startTime) {
      const formCacheKey = FormCache.generateKey(
        eventId,
        meetingData.guestEmail,
        meetingData.startTime,
      );

      // Check if this exact form submission is already being processed
      const isAlreadyProcessing = await FormCache.isProcessing(formCacheKey);
      if (isAlreadyProcessing) {
        console.log('🚫 Form submission already in progress (FormCache) - blocking duplicate');
        return NextResponse.json({ error: 'Request already in progress' }, { status: 429 });
      }

      // Mark this submission as processing
      await FormCache.set(formCacheKey, {
        eventId,
        guestEmail: meetingData.guestEmail,
        startTime: meetingData.startTime,
        status: 'processing',
        timestamp: Date.now(),
      });

      console.log('📝 Marked form submission as processing in FormCache:', formCacheKey);
    }

    // Record rate limit attempt in the background (non-blocking)
    after(async () => {
      await recordPaymentRateLimitAttempts(guestIdentifier, clientIP);
    });

    // Extract locale for translations
    const locale = meetingData.locale || 'en';

    // Construct URLs for legal pages
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eleva.care';
    const paymentPoliciesUrl = `${baseUrl}/${locale}/legal/payment-policies`;
    const termsUrl = `${baseUrl}/${locale}/legal/terms-of-service`;

    // Parallel fetch: translations + event details (independent operations)
    console.log('Querying event details:', { eventId });
    const [t, event] = await Promise.all([
      getTranslations({ locale, namespace: 'Payments.checkout' }),
      db.query.EventTable.findFirst({
        where: eq(EventTable.id, eventId),
        with: {
          user: {
            columns: {
              stripeConnectAccountId: true,
              stripeConnectChargesEnabled: true,
              firstName: true,
              lastName: true,
              country: true,
              imageUrl: true,
            },
          },
        },
      }),
    ]);

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

    if (!event.user.stripeConnectChargesEnabled) {
      console.warn('Expert Connect account cannot accept charges:', {
        eventId,
        connectAccountId: event.user.stripeConnectAccountId,
      });
      return NextResponse.json(
        {
          error: 'This expert cannot accept payments at this time. Please try again later.',
          code: 'CONNECT_ACCOUNT_NOT_READY',
        },
        { status: 422 },
      );
    }

    if (event.clerkUserId !== clerkUserId) {
      console.warn('Event ownership mismatch on checkout creation', {
        eventId,
        eventOwner: event.clerkUserId,
        requestOwner: clerkUserId,
      });
      return NextResponse.json(
        {
          error: 'Event ownership mismatch',
          code: 'EVENT_OWNERSHIP_MISMATCH',
        },
        { status: 403 },
      );
    }

    const authoritativePrice = event.price;
    if (authoritativePrice <= 0) {
      return NextResponse.json(
        {
          error: 'This event is not configured for paid checkout',
          code: 'EVENT_NOT_PAYABLE',
        },
        { status: 400 },
      );
    }

    if (
      typeof clientProvidedPrice !== 'number' ||
      !Number.isInteger(clientProvidedPrice) ||
      clientProvidedPrice <= 0
    ) {
      return NextResponse.json(
        {
          error: 'Invalid price amount',
          code: 'INVALID_PRICE',
        },
        { status: 400 },
      );
    }

    if (!isAuthoritativePriceMatch(clientProvidedPrice, authoritativePrice)) {
      console.warn('Client price mismatch detected', {
        eventId,
        clientProvidedPrice,
        authoritativePrice,
      });
      return NextResponse.json(
        {
          error: 'Price mismatch. Please refresh and try again.',
          code: 'PRICE_MISMATCH',
        },
        { status: 409 },
      );
    }

    const price = authoritativePrice;
    const expertStripeAccountId = event.user.stripeConnectAccountId;

    const checkoutCurrency = event.currency || STRIPE_CONFIG.CURRENCY;

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

    const appointmentStartTime = new Date(meetingData.startTime);
    const appointmentEndTime = new Date(
      appointmentStartTime.getTime() + event.durationInMinutes * 60 * 1000,
    );
    const reservationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min reservation window

    // Fetch Stripe customer in parallel with slot reservation (independent)
    console.log('Attempting to get/create Stripe customer with name:', meetingData.guestName);
    const customerIdPromise = getOrCreateStripeCustomer(
      undefined,
      meetingData.guestEmail,
      meetingData.guestName,
    );

    // Atomic slot reservation: use a transaction to prevent two guests from
    // both obtaining checkout sessions for the same time slot (TOCTOU fix).
    const slotResult = await db.transaction(async (tx) => {
      // 1. Clean up expired reservations for this slot
      await tx
        .delete(SlotReservationTable)
        .where(
          and(
            eq(SlotReservationTable.eventId, eventId),
            eq(SlotReservationTable.startTime, appointmentStartTime),
            lt(SlotReservationTable.expiresAt, new Date()),
          ),
        );

      // 2. Check for a confirmed meeting (succeeded payment)
      const conflictingMeeting = await tx.query.MeetingTable.findFirst({
        where: and(
          eq(MeetingTable.eventId, eventId),
          eq(MeetingTable.startTime, appointmentStartTime),
          eq(MeetingTable.stripePaymentStatus, 'succeeded'),
        ),
      });

      if (conflictingMeeting) {
        return { type: 'SLOT_ALREADY_BOOKED' as const, conflictingMeeting };
      }

      // 3. Check for active reservations by ANY guest for this slot
      const activeReservation = await tx.query.SlotReservationTable.findFirst({
        where: and(
          eq(SlotReservationTable.eventId, eventId),
          eq(SlotReservationTable.startTime, appointmentStartTime),
          gt(SlotReservationTable.expiresAt, new Date()),
        ),
      });

      if (activeReservation) {
        // Same guest can reuse their existing reservation
        if (activeReservation.guestEmail === validatedMeetingData.guestEmail) {
          return { type: 'REUSE_RESERVATION' as const, reservation: activeReservation };
        }
        // Different guest -- slot is held
        return { type: 'SLOT_TEMPORARILY_RESERVED' as const, reservation: activeReservation };
      }

      // 4. No conflicts -- atomically insert a reservation within the transaction.
      // The DB unique on (eventId, startTime) is the final safety net: if a concurrent
      // transaction also inserts for this slot, only one succeeds.
      try {
        const [newReservation] = await tx
          .insert(SlotReservationTable)
          .values({
            eventId,
            clerkUserId,
            guestEmail: validatedMeetingData.guestEmail,
            startTime: appointmentStartTime,
            endTime: appointmentEndTime,
            expiresAt: reservationExpiry,
          })
          .returning();

        return { type: 'RESERVED' as const, reservation: newReservation };
      } catch (insertError) {
        if (insertError instanceof Error && insertError.message.includes('duplicate key')) {
          return { type: 'SLOT_TEMPORARILY_RESERVED' as const, reservation: null };
        }
        throw insertError;
      }
    });

    // Handle slot result before proceeding to Stripe
    if (slotResult.type === 'SLOT_ALREADY_BOOKED') {
      console.error('Time slot already booked with confirmed payment:', {
        eventId,
        startTime: appointmentStartTime,
        requestingUser: meetingData.guestEmail,
      });
      return NextResponse.json(
        {
          error: 'This time slot has been booked by another user. Please choose a different time.',
          code: 'SLOT_ALREADY_BOOKED',
        },
        { status: 409 },
      );
    }

    if (slotResult.type === 'SLOT_TEMPORARILY_RESERVED') {
      console.warn('Slot already reserved by another user:', {
        requestingUser: meetingData.guestEmail,
        reservedBy: slotResult.reservation?.guestEmail ?? '(concurrent insert)',
        expiresAt: slotResult.reservation?.expiresAt ?? '(unknown)',
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

    // For REUSE_RESERVATION, check if the existing Stripe session is still valid
    if (slotResult.type === 'REUSE_RESERVATION' && slotResult.reservation.stripeSessionId) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(
          slotResult.reservation.stripeSessionId,
        );

        if (existingSession.status === 'open' && existingSession.payment_status === 'unpaid') {
          console.log('Reusing existing valid session:', existingSession.id);
          return NextResponse.json({ url: existingSession.url });
        }

        // Session expired/completed, clean up reservation so we create a new one
        await db
          .delete(SlotReservationTable)
          .where(eq(SlotReservationTable.id, slotResult.reservation.id));
      } catch {
        await db
          .delete(SlotReservationTable)
          .where(eq(SlotReservationTable.id, slotResult.reservation.id));
      }
    }

    const customerId = await customerIdPromise;
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

    // Calculate appointment end time for transfer scheduling
    const transferAppointmentEndTime = new Date(sessionStartTime.getTime() + sessionDurationMs);

    // Calculate how many days between payment (now) and session
    const currentDate = new Date();
    const paymentAgingDays = Math.max(
      0,
      Math.floor((sessionStartTime.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000)),
    );

    // 🆕 CRITICAL FIX: Transfer must ALWAYS be at least 24h after appointment ends
    // This is a customer complaint window requirement (like Airbnb's first-night hold)
    // Separate from the 7-day payment aging requirement
    const minimumTransferDate = new Date(
      transferAppointmentEndTime.getTime() + 24 * 60 * 60 * 1000,
    );

    // Calculate earliest possible transfer date based on payment aging
    // For immediate payments (Credit Card), this is 7 days from now
    // For delayed payments (Multibanco), this is 7 days from when payment actually succeeds
    const paymentAgeBasedTransferDate = new Date(
      currentDate.getTime() + requiredPayoutDelay * 24 * 60 * 60 * 1000,
    );

    // Use the LATER of the two dates to ensure BOTH conditions are met:
    // 1. Payment must be aged enough (7 days from payment date)
    // 2. Appointment must have ended + 24h complaint window
    const earliestAllowedTransferDate = new Date(
      Math.max(minimumTransferDate.getTime(), paymentAgeBasedTransferDate.getTime()),
    );

    // Schedule on the next 4 AM CRON slot that is still >= earliestAllowedTransferDate
    const transferDate = new Date(earliestAllowedTransferDate);
    transferDate.setHours(4, 0, 0, 0);
    if (transferDate.getTime() < earliestAllowedTransferDate.getTime()) {
      transferDate.setDate(transferDate.getDate() + 1);
    }

    console.log('📅 Scheduled transfer with dual-requirement compliance:', {
      currentDate: currentDate.toISOString(),
      sessionStartTime: sessionStartTime.toISOString(),
      appointmentEndTime: transferAppointmentEndTime.toISOString(),
      expertCountry,
      requiredPayoutDelay,
      paymentAgingDays,
      minimumTransferDate: minimumTransferDate.toISOString(),
      paymentAgeBasedTransferDate: paymentAgeBasedTransferDate.toISOString(),
      earliestAllowedTransferDate: earliestAllowedTransferDate.toISOString(),
      transferDate: transferDate.toISOString(),
      daysFromPayment: Math.floor(
        (transferDate.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000),
      ),
      hoursAfterAppointmentEnd: Math.floor(
        (transferDate.getTime() - transferAppointmentEndTime.getTime()) / (60 * 60 * 1000),
      ),
    });

    // Calculate payment expiration and determine payment methods based on timing
    const meetingDate = new Date(meetingData.startTime);
    const currentTime = new Date();
    const hoursUntilMeeting = (meetingDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
    const daysUntilMeeting = hoursUntilMeeting / 24;

    /*
     * EXPIRATION LOGIC:
     * - <= 8 days: 1 hour checkout expiry (short-notice booking)
     * - > 8 days: 24 hour checkout expiry (advance booking, Multibanco voucher has 7-day life)
     * - Slot Reservation: Created by webhook, expires in 7 days (our business logic)
     *
     * Payment methods are determined automatically by Stripe based on Dashboard settings,
     * currency (EUR), customer location, and device. No manual payment_method_types needed.
     */
    const checkoutExpiresAt =
      daysUntilMeeting <= 8
        ? new Date(currentTime.getTime() + 60 * 60 * 1000) // 1 hour
        : new Date(currentTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    console.log(
      `${daysUntilMeeting <= 8 ? '⚡ Immediate' : '🕒 Advance'} booking: Meeting in ${daysUntilMeeting.toFixed(1)} days, checkout expires in ${daysUntilMeeting <= 8 ? '1h' : '24h'}`,
    );

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
      requiredPayoutDelay,
      scheduledTransferTime,
      appointmentEndTime: transferAppointmentEndTime,
      requiresApproval,
      meetingData,
    });

    const session = await stripe.checkout.sessions.create(
      {
        line_items: [
          {
            price_data: {
              currency: checkoutCurrency,
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
                ...(event.user.imageUrl?.startsWith('https://') && {
                  images: [
                    `${event.user.imageUrl}${event.user.imageUrl.includes('?') ? '&' : '?'}width=512&height=512&fit=crop`,
                  ],
                }),
              },
              unit_amount: price,
            },
            quantity: 1,
          },
        ],
        custom_fields: [
          {
            key: 'nif',
            label: { type: 'custom', custom: t('nifLabel') },
            type: 'numeric',
            optional: true,
            numeric: { minimum_length: 9, maximum_length: 9 },
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/${locale}/${username}/${event.slug}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/${locale}/${username}/${event.slug}`,
        customer: customerId,
        customer_creation: customerId ? undefined : 'always',
        expires_at: Math.floor(checkoutExpiresAt.getTime() / 1000),
        // Keep split deterministic: 85/15 is calculated on authoritative listing amount.
        allow_promotion_codes: STRIPE_CONFIG.MARKETPLACE_SPLIT.ALLOW_PROMOTION_CODES,
        automatic_tax: {
          enabled: true,
          liability: { type: 'self' },
        },
        invoice_creation: {
          enabled: true,
          invoice_data: {
            issuer: { type: 'self' },
          },
        },
        tax_id_collection: { enabled: true, required: 'never' },
        billing_address_collection: 'auto',
        consent_collection: {
          terms_of_service: 'required',
        },
        ...(daysUntilMeeting > 8 && {
          custom_text: {
            submit: {
              message: t('multibancoNotice', { paymentPoliciesUrl }),
            },
            terms_of_service_acceptance: {
              message: t('termsOfService', { termsUrl, paymentPoliciesUrl }),
            },
          },
        }),
        ...(daysUntilMeeting <= 8 && {
          custom_text: {
            terms_of_service_acceptance: {
              message: t('termsOfService', { termsUrl, paymentPoliciesUrl }),
            },
          },
        }),
        locale: (() => {
          const userLocale = meetingData.locale || 'en';
          // Map our locales to valid Stripe locales
          const localeMap: Record<string, Stripe.Checkout.SessionCreateParams.Locale> = {
            en: 'en',
            'pt-BR': 'pt-BR',
            es: 'es',
            fr: 'fr',
            de: 'de',
            it: 'it',
            pt: 'pt-BR', // Map pt to pt-BR for Stripe
          };
          return localeMap[userLocale] || 'en';
        })(),
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
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );

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

    // Link the slot reservation to the Stripe session for tracking
    if (slotResult.type === 'RESERVED' || slotResult.type === 'REUSE_RESERVATION') {
      try {
        await db
          .update(SlotReservationTable)
          .set({
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent?.toString() || null,
          })
          .where(eq(SlotReservationTable.id, slotResult.reservation.id));
      } catch (reservationUpdateError) {
        console.error('Failed to link reservation to session:', reservationUpdateError);
      }
    }

    // Mark form submission as completed before responding to avoid race conditions on retries
    if (meetingData?.guestEmail && meetingData?.startTime) {
      const formCacheKey = FormCache.generateKey(
        eventId,
        meetingData.guestEmail,
        meetingData.startTime,
      );
      await FormCache.markCompleted(formCacheKey);
      console.log('✅ Marked form submission as completed in FormCache:', formCacheKey);
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

    // **FORM CACHE: Mark submission as failed**
    if (eventId && meetingData?.guestEmail && meetingData?.startTime) {
      try {
        const formCacheKey = FormCache.generateKey(
          eventId,
          meetingData.guestEmail,
          meetingData.startTime,
        );
        await FormCache.markFailed(formCacheKey);
        console.log('❌ Marked form submission as failed in FormCache:', formCacheKey);
      } catch (cacheError) {
        console.error('Failed to mark FormCache as failed:', cacheError);
      }
    }

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
