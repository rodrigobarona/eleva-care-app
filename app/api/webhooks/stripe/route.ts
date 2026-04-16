/**
 * Main Stripe Webhook Handler
 *
 * Processes all payment-related Stripe webhook events:
 * - `checkout.session.completed` - New booking created
 * - `payment_intent.succeeded` - Payment confirmed (card or Multibanco)
 * - `payment_intent.payment_failed` - Payment failed
 * - `payment_intent.requires_action` - Multibanco voucher generated
 * - `charge.refunded` - Payment refunded
 * - `charge.dispute.created` - Chargeback initiated
 * - Connect account/payout events are intentionally delegated to `/api/webhooks/stripe-connect`
 * - `identity.*` - Identity verification updates
 *
 * @route POST /api/webhooks/stripe
 *
 * @security
 * - Verifies Stripe signature using STRIPE_WEBHOOK_SECRET
 * - Returns 400 for invalid signatures
 * - Monitors webhook health via Redis metrics
 *
 * @see {@link https://stripe.com/docs/webhooks} - Stripe Webhooks Guide
 * @see {@link ./handlers/payment} - Payment event handlers
 * @see {@link ./handlers/payout} - Payout event handlers
 */
import { ENV_CONFIG } from '@/config/env';
import { calculateApplicationFee } from '@/config/stripe';
import { db } from '@/drizzle/db';
import {
  EventTable,
  MeetingTable,
  PackPurchaseTable,
  PaymentTransferTable,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ScheduleTable used in db.query.ScheduleTable (Drizzle ORM pattern)
  ScheduleTable,
  SessionPackTable,
  SlotReservationTable,
  StripeProcessedEventTable,
  UserTable,
} from '@/drizzle/schema';
import {
  isValidPaymentStatus,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_SUCCEEDED,
  type PaymentStatus,
  STRIPE_PAYMENT_STATUS_NO_PAYMENT_REQUIRED,
  STRIPE_PAYMENT_STATUS_PAID,
  STRIPE_PAYMENT_STATUS_UNPAID,
} from '@/lib/constants/payment-statuses';
import { PAYMENT_TRANSFER_STATUS_PENDING } from '@/lib/constants/payment-transfers';
import { sendEmail } from '@/lib/integrations/novu/email';
import {
  buildNovuSubscriberFromStripe,
  getWorkflowFromStripeEvent,
  transformStripePayloadForNovu,
  triggerNovuWorkflow,
} from '@/lib/integrations/novu/utils';
import type { StripeWebhookPayload } from '@/lib/integrations/novu/utils';
import { stripe } from '@/lib/integrations/stripe';
import { resolveMarketplaceAmounts } from '@/lib/payments/marketplace-amounts';
import { webhookMonitor } from '@/lib/redis/webhook-monitor';
import { createMeeting } from '@/server/actions/meetings';
import { ensureFullUserSynchronization } from '@/server/actions/user-sync';
import { formatInTimeZone } from 'date-fns-tz';
import { enUS, es, pt, ptBR } from 'date-fns/locale';
import { and, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';

import { handleIdentityVerificationUpdated } from './handlers/identity';
import {
  handleChargeRefunded,
  handleDisputeCreated,
  handlePaymentFailed,
  handlePaymentIntentRequiresAction,
  handlePaymentSucceeded,
} from './handlers/payment';

/**
 * Zod schema for meeting metadata validation
 */
const MeetingMetadataSchema = z.object({
  id: z.string().min(1, 'Event ID is required'),
  expert: z.string().min(1, 'Expert ID is required'),
  guest: z.string().email('Invalid guest email'),
  guestName: z.string().optional(),
  start: z
    .string()
    .refine(
      (val) => !Number.isNaN(Date.parse(val)),
      'Invalid start time format - must be ISO 8601',
    ),
  dur: z.number().positive('Duration must be positive'),
  notes: z.string().optional(),
  guestPhone: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
});

/**
 * Maps locale codes to date-fns Locale objects for localized date formatting
 */
function getDateFnsLocale(localeCode?: string) {
  const localeMap: Record<string, typeof enUS> = {
    en: enUS,
    'en-US': enUS,
    pt: pt,
    'pt-PT': pt,
    'pt-BR': ptBR,
    es: es,
    'es-ES': es,
  };
  return localeMap[localeCode || 'en'] || enUS;
}

/**
 * Zod schema for payment metadata validation
 */
const PaymentMetadataSchema = z.object({
  amount: z.string().refine((val) => {
    const num = Number(val);
    return !Number.isNaN(num) && num > 0;
  }, 'Amount must be a positive number'),
  fee: z.string().refine((val) => {
    const num = Number(val);
    return !Number.isNaN(num) && num >= 0;
  }, 'Fee must be a non-negative number'),
  expert: z.string().refine((val) => {
    const num = Number(val);
    return !Number.isNaN(num) && num > 0;
  }, 'Expert amount must be a positive number'),
});

/**
 * Zod schema for transfer delay validation
 */
const TransferDelaySchema = z.object({
  aging: z.number().int().min(0, 'Aging days must be non-negative'),
  remaining: z.number().int().min(0, 'Remaining days must be non-negative').optional(),
  required: z.number().int().min(0, 'Required days must be non-negative'),
});

/**
 * Zod schema for transfer metadata validation
 */
const TransferMetadataSchema = z.object({
  status: z.string().min(1, 'Transfer status is required'),
  account: z.string().min(1, 'Connect account ID is required'),
  country: z.string().min(2, 'Country code must be at least 2 characters'),
  delay: TransferDelaySchema,
  scheduled: z
    .string()
    .refine(
      (val) => !Number.isNaN(Date.parse(val)),
      'Invalid scheduled time format - must be ISO 8601',
    ),
  appointmentEnd: z
    .string()
    .refine(
      (val) => !Number.isNaN(Date.parse(val)),
      'Invalid appointment end time format - must be ISO 8601',
    )
    .optional(),
});

// Update interfaces to match Zod schemas
type ParsedMeetingMetadata = z.infer<typeof MeetingMetadataSchema>;
type ParsedPaymentMetadata = z.infer<typeof PaymentMetadataSchema>;
type ParsedTransferMetadata = z.infer<typeof TransferMetadataSchema>;

/**
 * Extended Stripe Checkout Session type with our custom metadata structure.
 *
 * The metadata is split into chunks to:
 * - Stay under Stripe's 500-character limit
 * - Maintain logical grouping of data
 * - Support future extensibility
 */
interface StripeCheckoutSession extends Stripe.Checkout.Session {
  metadata: {
    /** JSON string of meeting details (ParsedMeetingMetadata) */
    meeting?: string;
    /** JSON string of payment details (ParsedPaymentMetadata) */
    payment?: string;
    /** JSON string of transfer configuration (ParsedTransferMetadata) */
    transfer?: string;
    /** Whether manual approval is required before payout */
    approval?: string;
    /** Session type discriminator (e.g. 'pack_purchase') */
    type?: string;
    /** Pack purchase metadata fields */
    packId?: string;
    buyerEmail?: string;
    buyerName?: string;
    buyerPhone?: string;
    sessionsCount?: string;
    expertClerkUserId?: string;
    expertName?: string;
    packName?: string;
    eventId?: string;
    eventName?: string;
    expirationDays?: string;
    locale?: string;
  };
  application_fee_amount?: number | null;
  payment_intent: string | null;
}

/**
 * Metadata structure for Stripe integration.
 *
 * The metadata is split into three logical chunks to optimize size and maintainability:
 * 1. meeting: Core session information
 * 2. payment: Financial transaction details
 * 3. transfer: Expert payout configuration
 *
 * Each chunk is stored as a JSON string in Stripe metadata, with abbreviated field names
 * to stay under Stripe's 500-character metadata limit while maintaining readability.
 */

/**
 * Meeting metadata chunk - Contains core session information.
 * Field names are intentionally abbreviated to reduce metadata size.
 *
 * Flow:
 * 1. Created in create-payment-intent
 * 2. Stored in Stripe checkout session
 * 3. Retrieved and parsed in webhook handlers
 */

/**
 * Helper function to parse metadata safely with enhanced error logging
 * @param json The JSON string to parse
 * @param fallback Default value to return if parsing fails
 * @param type Optional metadata type for better error context
 * @returns Parsed metadata or fallback value
 */
function parseMetadata<T>(json: string | undefined, fallback: T, type?: string): T {
  if (!json) {
    console.warn('Empty metadata received:', {
      type,
      fallbackUsed: fallback,
    });
    return fallback;
  }

  try {
    return JSON.parse(json) as T;
  } catch (error) {
    // Log detailed error information for debugging
    console.error('Failed to parse metadata:', {
      type,
      json: json.length > 500 ? `${json.slice(0, 500)}... (truncated)` : json,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
      fallbackUsed: fallback,
    });

    // Log warning if JSON looks malformed
    if (json.includes('\n') || json.includes('\r')) {
      console.warn('Metadata contains newlines which may indicate formatting issues');
    }
    if (!json.startsWith('{') && !json.startsWith('[')) {
      console.warn('Metadata does not start with { or [ which may indicate invalid JSON');
    }

    return fallback;
  }
}

// Helper function to safely extract guest name
function getGuestName(metadata: ParsedMeetingMetadata): string {
  // Use provided guest name if available
  if (metadata?.guestName?.trim()) {
    return metadata.guestName.trim();
  }

  // Fallback: Try to derive from email, but handle special cases
  const emailPrefix = metadata.guest.split('@')[0];
  // Replace dots and special characters with spaces, then clean up
  return emailPrefix
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Add simple GET handler
export async function GET() {
  return NextResponse.json(
    {
      message:
        'This endpoint is for Stripe webhooks. Send POST requests with valid Stripe signatures.',
    },
    { status: 200 },
  );
}

/**
 * Helper function to validate critical meeting metadata fields
 * @throws {Error} if any required field is missing or invalid
 */
function validateMeetingMetadata(
  metadata: ParsedMeetingMetadata,
  sessionId: string,
  rawMetadata?: string,
): void {
  const missingFields = [];

  if (!metadata.id) missingFields.push('id');
  if (!metadata.expert) missingFields.push('expert');
  if (!metadata.guest) missingFields.push('guest');
  if (!metadata.start) missingFields.push('start');
  if (typeof metadata.dur !== 'number' || metadata.dur <= 0) missingFields.push('duration');

  if (missingFields.length > 0) {
    console.error('Critical meeting metadata missing or invalid:', {
      sessionId,
      missingFields,
      metadata,
      rawMetadata,
    });
    throw new Error(`Critical meeting metadata is missing or invalid: ${missingFields.join(', ')}`);
  }
}

/**
 * Helper function to validate critical transfer metadata fields
 * @throws {Error} if any required field is missing or invalid
 */
function validateTransferMetadata(
  metadata: ParsedTransferMetadata,
  sessionId: string,
  rawMetadata?: string,
): void {
  const missingFields = [];

  if (!metadata.account) missingFields.push('account');
  if (!metadata.country) missingFields.push('country');
  if (!metadata.scheduled) missingFields.push('scheduled');

  // Validate delay object structure
  if (!metadata.delay || typeof metadata.delay !== 'object') {
    missingFields.push('delay configuration');
  } else {
    if (typeof metadata.delay.aging !== 'number') missingFields.push('delay.aging');
    // remaining is optional, only validate if present
    if (metadata.delay.remaining !== undefined && typeof metadata.delay.remaining !== 'number') {
      missingFields.push('delay.remaining');
    }
    if (typeof metadata.delay.required !== 'number') missingFields.push('delay.required');
  }

  if (missingFields.length > 0) {
    console.error('Critical transfer metadata missing or invalid:', {
      sessionId,
      missingFields,
      metadata,
      rawMetadata,
    });
    throw new Error(
      `Critical transfer metadata is missing or invalid: ${missingFields.join(', ')}`,
    );
  }
}

/**
 * Validates that a metadata string exists and is not empty
 * @throws {Error} if the metadata string is missing or empty
 */
function validateMetadataString(
  metadata: string | undefined,
  type: 'meeting' | 'payment' | 'transfer',
  sessionId: string,
): void {
  if (!metadata?.trim()) {
    console.error(`Missing or empty ${type} metadata in checkout session:`, {
      sessionId,
      metadata,
    });
    throw new Error(`Missing or empty ${type} metadata in session. Cannot process ${type} data.`);
  }

  try {
    JSON.parse(metadata);
  } catch (error) {
    console.error(`Invalid JSON in ${type} metadata:`, {
      sessionId,
      metadata,
      error,
    });
    throw new Error(`Invalid JSON in ${type} metadata. Cannot process ${type} data.`);
  }
}

/**
 * Helper function to validate and parse metadata with Zod schema
 */
function validateAndParseMetadata<T>(
  metadata: string | undefined,
  type: string,
  sessionId: string,
  schema: z.ZodSchema<T>,
  defaultValues: Partial<T>,
): T {
  // First validate the string
  validateMetadataString(metadata, type as 'meeting' | 'payment' | 'transfer', sessionId);

  // Parse the JSON
  const rawData = parseMetadata(metadata, defaultValues, type);

  try {
    // Validate against schema
    return schema.parse(rawData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`Invalid ${type} metadata structure:`, {
        sessionId,
        errors: error.errors,
        rawData,
      });
      throw new Error(
        `Invalid ${type} metadata structure: ${error.errors.map((e) => e.message).join(', ')}`,
      );
    }
    throw error;
  }
}

async function handlePackPurchase(session: StripeCheckoutSession) {
  const metadata = session.metadata;
  if (!metadata?.packId || !metadata?.buyerEmail || !metadata?.sessionsCount) {
    throw new Error('Missing required metadata on pack purchase session');
  }

  const packId = metadata.packId;
  const buyerEmail = metadata.buyerEmail;
  const buyerName = metadata.buyerName || '';
  const buyerPhone = metadata.buyerPhone || '';
  const sessionsCount = Number.parseInt(metadata.sessionsCount, 10);
  const expirationDays = Number.parseInt(metadata.expirationDays || '180', 10);
  const locale = metadata.locale || 'en';
  const packName = metadata.packName || 'Session Pack';
  const eventName = metadata.eventName || 'Session';
  const expertName = metadata.expertName || 'Expert';

  if (!Number.isFinite(sessionsCount) || sessionsCount < 1) {
    throw new Error(`Invalid sessionsCount in pack purchase metadata: ${metadata.sessionsCount}`);
  }
  const safeExpirationDays =
    Number.isFinite(expirationDays) && expirationDays > 0 ? expirationDays : 180;

  const [localPart, domain] = buyerEmail.split('@');
  const maskedLocal =
    localPart.length >= 3
      ? localPart.slice(0, 2) + '*'.repeat(localPart.length - 2)
      : '*'.repeat(localPart.length);
  const maskedEmail = `${maskedLocal}@${domain}`;
  console.log('📦 Processing pack purchase:', {
    packId,
    buyer: maskedEmail,
    sessionsCount,
    sessionId: session.id,
    paymentStatus: session.payment_status,
    paymentIntent: session.payment_intent,
    amountTotal: session.amount_total,
    amountSubtotal: session.amount_subtotal,
    customer: typeof session.customer === 'string' ? session.customer : 'expanded',
  });

  const existingPurchase = await db.query.PackPurchaseTable.findFirst({
    where: eq(PackPurchaseTable.stripeSessionId, session.id),
  });

  if (existingPurchase) {
    console.log('✅ Pack purchase already processed for session:', session.id);
    return { success: true, purchaseId: existingPurchase.id };
  }

  const pack = await db.query.SessionPackTable.findFirst({
    where: eq(SessionPackTable.id, packId),
  });

  if (!pack) {
    console.error('❌ Pack not found:', packId);
    throw new Error(`Session pack ${packId} not found`);
  }

  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : (session.customer as Stripe.Customer | null)?.id;

  // Use session.created (deterministic) instead of new Date() so that
  // idempotent Stripe API calls produce identical parameters across webhook retries.
  const sessionCreatedMs = session.created * 1000;
  const expiresAt = new Date(sessionCreatedMs);
  expiresAt.setDate(expiresAt.getDate() + safeExpirationDays);
  const expiresAtUnix = Math.floor(expiresAt.getTime() / 1000);

  const couponIdempotencyKey = `coupon:pack:${session.id}`;

  let coupon: Stripe.Coupon;
  try {
    coupon = await stripe.coupons.create(
      {
        percent_off: 100,
        duration: 'once',
        max_redemptions: sessionsCount,
        name: `Pack: ${packName} (x${sessionsCount})`.slice(0, 40),
        redeem_by: expiresAtUnix,
        metadata: { packId, type: 'session_pack' },
      },
      { idempotencyKey: couponIdempotencyKey },
    );
  } catch (err: unknown) {
    if (
      err instanceof Stripe.errors.StripeIdempotencyError ||
      (err instanceof Stripe.errors.StripeInvalidRequestError &&
        (err.message?.includes('idempotent') || err.code === 'idempotency_key_in_use'))
    ) {
      console.warn(
        '⚠️ Coupon idempotency conflict, retrieving existing coupon for session:',
        session.id,
      );
      const existingCoupons = await stripe.coupons.list({ limit: 10 });
      const existing = existingCoupons.data.find(
        (c) => c.metadata?.packId === packId && c.metadata?.type === 'session_pack',
      );
      if (!existing)
        throw new Error(`Idempotency conflict but no existing coupon found for pack ${packId}`);
      coupon = existing;
    } else {
      console.error('❌ Stripe coupon creation failed:', {
        step: 'coupon_create',
        packId,
        sessionId: session.id,
        apiVersion: ENV_CONFIG.STRIPE_API_VERSION,
        params: { percent_off: 100, duration: 'once', max_redemptions: sessionsCount },
        stripeError:
          err instanceof Stripe.errors.StripeError
            ? { type: err.type, code: err.code, message: err.message, param: err.param }
            : err instanceof Error
              ? err.message
              : err,
      });
      throw err;
    }
  }

  const promoCodeParams = {
    promotion: {
      type: 'coupon' as const,
      coupon: coupon.id,
    },
    max_redemptions: sessionsCount,
    expires_at: expiresAtUnix,
    metadata: { packId, type: 'session_pack' },
    customer: customerId || undefined,
  } as unknown as Stripe.PromotionCodeCreateParams;

  const promoIdempotencyKey = `promo:pack:${session.id}`;

  let promoCode: Stripe.PromotionCode;
  try {
    promoCode = await stripe.promotionCodes.create(promoCodeParams, {
      idempotencyKey: promoIdempotencyKey,
    });
  } catch (err: unknown) {
    if (
      err instanceof Stripe.errors.StripeIdempotencyError ||
      (err instanceof Stripe.errors.StripeInvalidRequestError &&
        (err.message?.includes('idempotent') || err.code === 'idempotency_key_in_use'))
    ) {
      console.warn(
        '⚠️ Promo code idempotency conflict, retrieving existing promo for session:',
        session.id,
      );
      const existingPromos = await stripe.promotionCodes.list({ coupon: coupon.id, limit: 10 });
      const existing = existingPromos.data.find(
        (p) => p.metadata?.packId === packId && p.metadata?.type === 'session_pack',
      );
      if (!existing)
        throw new Error(`Idempotency conflict but no existing promo found for coupon ${coupon.id}`);
      promoCode = existing;
    } else {
      console.error('❌ Stripe promotion code creation failed:', {
        step: 'promotion_code_create',
        packId,
        couponId: coupon.id,
        sessionId: session.id,
        apiVersion: ENV_CONFIG.STRIPE_API_VERSION,
        params: {
          coupon: coupon.id,
          max_redemptions: sessionsCount,
          hasCustomer: !!customerId,
        },
        stripeError:
          err instanceof Stripe.errors.StripeError
            ? { type: err.type, code: err.code, message: err.message, param: err.param }
            : err instanceof Error
              ? err.message
              : err,
      });
      throw err;
    }
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent as Stripe.PaymentIntent | null)?.id;
  const grossAmount = session.amount_total ?? pack.price;
  const platformFeeAmount = calculateApplicationFee(pack.price);
  const netAmount = Math.max(grossAmount - platformFeeAmount, 0);
  const currency = session.currency ?? pack.currency ?? 'eur';

  let purchase: { id: string } | undefined;
  try {
    [purchase] = await db
      .insert(PackPurchaseTable)
      .values({
        packId,
        expertClerkUserId: metadata.expertClerkUserId || pack.clerkUserId,
        buyerEmail,
        buyerName: buyerName || null,
        buyerPhone: buyerPhone || null,
        packNameSnapshot: packName,
        eventNameSnapshot: eventName,
        stripeCustomerId: customerId || null,
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId || null,
        stripeCouponId: coupon.id,
        stripePromotionCodeId: promoCode.id,
        currency,
        grossAmount,
        platformFeeAmount,
        netAmount,
        promotionCode: promoCode.code,
        maxRedemptions: sessionsCount,
        redemptionsUsed: 0,
        expiresAt,
        status: 'active',
      })
      .returning({ id: PackPurchaseTable.id });
  } catch (dbError) {
    console.error('❌ Failed to insert pack purchase record:', {
      step: 'db_insert_pack_purchase',
      packId,
      sessionId: session.id,
      promoCode: promoCode.code.slice(0, 4) + '****',
      paymentIntentId: paymentIntentId || null,
      amountTotal: session.amount_total,
      paymentStatus: session.payment_status,
      error: dbError instanceof Error ? dbError.message : dbError,
    });
    throw dbError;
  }

  console.log('✅ Pack purchase recorded:', {
    purchaseId: purchase?.id,
    promoCodePrefix: promoCode.code.slice(0, 4) + '****',
    maxRedemptions: sessionsCount,
    expiresAt: expiresAt.toISOString(),
  });

  try {
    const { default: PackPurchaseConfirmationTemplate } = await import(
      '@/emails/packs/pack-purchase-confirmation'
    );
    const { render } = await import('@react-email/render');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eleva.care';

    // Look up expert's username for the booking URL
    let bookingUrl = baseUrl;
    try {
      const expertUser = await db.query.UserTable.findFirst({
        where: eq(UserTable.clerkUserId, metadata.expertClerkUserId || pack.clerkUserId),
        columns: { clerkUserId: true },
      });
      if (expertUser) {
        const { createClerkClient } = await import('@clerk/nextjs/server');
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const clerkUser = await clerk.users.getUser(expertUser.clerkUserId);
        if (clerkUser.username) {
          bookingUrl = `${baseUrl}/${locale}/${clerkUser.username}`;
        }
      }
    } catch (lookupError) {
      console.error('Failed to look up expert username for booking URL:', lookupError);
    }

    const renderedHtml = await render(
      PackPurchaseConfirmationTemplate({
        buyerName: buyerName || buyerEmail.split('@')[0],
        buyerEmail,
        packName,
        eventName,
        expertName,
        sessionsCount,
        promotionCode: promoCode.code,
        expiresAt: expiresAt.toISOString(),
        bookingUrl,
        locale,
      }),
    );

    const emailResult = await sendEmail({
      to: buyerEmail,
      subject:
        locale === 'pt' || locale === 'pt-BR'
          ? `Seu pacote de ${sessionsCount} sessões está pronto!`
          : locale === 'es'
            ? `¡Tu paquete de ${sessionsCount} sesiones está listo!`
            : `Your ${sessionsCount}-session pack is ready!`,
      html: renderedHtml,
    });

    if (emailResult.success) {
      console.log(`📧 Pack purchase confirmation email sent to ${maskedEmail}`);
    } else {
      console.error(`📧 Failed to send pack purchase email to ${maskedEmail}:`, emailResult.error);
    }
  } catch (emailError) {
    console.error('Failed to send pack purchase email:', emailError);
  }

  return { success: true, purchaseId: purchase?.id };
}

async function handleCheckoutSession(session: StripeCheckoutSession) {
  console.log('🎯 Starting checkout session processing:', {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    paymentIntent: session.payment_intent,
    metadataKeys: session.metadata ? Object.keys(session.metadata) : [],
    metadataType: session.metadata?.type || 'booking',
  });

  try {
    // Route pack purchases to dedicated handler
    if (session.metadata?.type === 'pack_purchase') {
      return await handlePackPurchase(session);
    }

    // First check if we already have a meeting for this session
    const existingMeeting = await db.query.MeetingTable.findFirst({
      where: ({ stripeSessionId }, { eq }) => eq(stripeSessionId, session.id),
    });

    if (existingMeeting) {
      console.log('✅ Meeting already exists for session:', {
        sessionId: session.id,
        meetingId: existingMeeting.id,
        hasUrl: !!existingMeeting.meetingUrl,
      });
      return { success: true, meetingId: existingMeeting.id };
    }

    // Parse and validate metadata with Zod schemas
    const meetingData = validateAndParseMetadata(
      session.metadata?.meeting,
      'meeting',
      session.id,
      MeetingMetadataSchema,
      {
        id: '',
        expert: '',
        guest: '',
        start: '',
        dur: 0,
      },
    );

    let paymentData: ParsedPaymentMetadata | undefined;
    let transferData: ParsedTransferMetadata | undefined;

    if (session.payment_intent) {
      paymentData = validateAndParseMetadata(
        session.metadata?.payment,
        'payment',
        session.id,
        PaymentMetadataSchema,
        {
          amount: '0',
          fee: '0',
          expert: '0',
        },
      );

      transferData = validateAndParseMetadata(
        session.metadata?.transfer,
        'transfer',
        session.id,
        TransferMetadataSchema,
        {
          status: PAYMENT_TRANSFER_STATUS_PENDING,
          account: '',
          country: '',
          delay: { aging: 0, remaining: 0, required: 0 },
          scheduled: '',
        },
      );
    }

    // Validate critical meeting metadata
    validateMeetingMetadata(meetingData, session.id, session.metadata?.meeting);

    // Validate critical transfer metadata if payment intent exists
    if (session.payment_intent) {
      if (!paymentData || !transferData) {
        throw new Error('Payment and transfer metadata required when payment_intent exists');
      }
      validateTransferMetadata(transferData, session.id, session.metadata?.transfer);
    }

    // If we have a Clerk user ID, ensure synchronization
    if (meetingData.expert) {
      try {
        console.log('Ensuring user synchronization for Clerk user:', meetingData.expert);
        await ensureFullUserSynchronization(meetingData.expert);
      } catch (error) {
        console.error('Failed to synchronize user data:', error);
        // Continue processing even if synchronization fails
      }
    }

    console.log('📅 Creating meeting with payment status:', {
      status: session.payment_status,
      mappedStatus: mapPaymentStatus(session.payment_status, session.id),
      willCreateCalendar:
        !session.payment_status ||
        session.payment_status === 'paid' ||
        mapPaymentStatus(session.payment_status, session.id) === 'succeeded',
    });

    // Extract payment intent ID - can be string or expanded PaymentIntent object
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent as Stripe.PaymentIntent | null)?.id;
    const resolvedAmounts = resolveMarketplaceAmounts({
      actualGrossAmount: session.amount_total,
      configuredGrossAmount: paymentData ? Number.parseInt(paymentData.amount, 10) : null,
      actualPlatformFeeAmount: session.application_fee_amount,
      configuredPlatformFeeAmount: paymentData ? Number.parseInt(paymentData.fee, 10) : null,
      configuredExpertAmount: paymentData ? Number.parseInt(paymentData.expert, 10) : null,
    });

    const result = await createMeeting({
      eventId: meetingData.id,
      clerkUserId: meetingData.expert,
      startTime: new Date(meetingData.start),
      guestEmail: meetingData.guest,
      guestName: getGuestName(meetingData),
      guestPhone: meetingData.guestPhone,
      guestNotes: meetingData.notes,
      timezone: meetingData.timezone || 'UTC',
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId, // 🔧 FIX: Store paymentIntentId for later lookup in payment_intent.succeeded
      stripePaymentStatus: mapPaymentStatus(session.payment_status, session.id),
      stripeAmount: resolvedAmounts.grossAmount || undefined,
      stripeApplicationFeeAmount: resolvedAmounts.platformFeeAmount || undefined,
      locale: meetingData.locale || 'en',
    });

    // Handle possible errors
    if (result.error) {
      console.error('❌ Failed to create meeting:', {
        error: result.error,
        code: result.code,
        message: result.message,
      });

      // Refund when a paid checkout cannot produce a meeting.
      // Covers double-booking, temporary reservation conflicts, and invalid time slots.
      // Handle both string and expanded PaymentIntent object forms.
      const refundablePaymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent as Stripe.PaymentIntent | null)?.id;

      if (
        session.payment_status === STRIPE_PAYMENT_STATUS_PAID &&
        refundablePaymentIntentId &&
        (result.code === 'SLOT_ALREADY_BOOKED' ||
          result.code === 'SLOT_TEMPORARILY_RESERVED' ||
          result.code === 'INVALID_TIME_SLOT')
      ) {
        console.error(
          `🚨 Paid checkout failed to create meeting (code: ${result.code}), issuing refund:`,
          { sessionId: session.id, paymentIntent: refundablePaymentIntentId },
        );
        await handleDoubleBookingRefund(refundablePaymentIntentId);
      }

      return { success: false, error: result.error };
    }

    console.log('✅ Meeting created successfully:', {
      sessionId: session.id,
      meetingId: result.meeting?.id,
      hasUrl: !!result.meeting?.meetingUrl,
      paymentStatus: result.meeting?.stripePaymentStatus,
    });

    // Clean up any existing slot reservation since meeting is now confirmed.
    // This is critical: if cleanup fails, the cron job may send a false "booking cancelled" email.
    if (result.meeting && paymentIntentId) {
      try {
        const deletedReservations = await db
          .delete(SlotReservationTable)
          .where(eq(SlotReservationTable.stripePaymentIntentId, paymentIntentId))
          .returning({ id: SlotReservationTable.id });

        if (deletedReservations.length > 0) {
          console.log(
            `🧹 Cleaned up ${deletedReservations.length} slot reservation(s) after meeting confirmation`,
          );
        }
      } catch (cleanupError) {
        // Retry once before giving up — an orphaned row causes the cron to send a
        // false cancellation email (the cron now guards against this, but belt-and-suspenders).
        console.warn('⚠️ First attempt to clean up slot reservation failed, retrying:', {
          paymentIntentId,
          meetingId: result.meeting?.id,
          error: cleanupError instanceof Error ? cleanupError.message : cleanupError,
        });
        try {
          await db
            .delete(SlotReservationTable)
            .where(eq(SlotReservationTable.stripePaymentIntentId, paymentIntentId));
        } catch (retryError) {
          console.error(
            '❌ Slot reservation cleanup failed after retry (cron guard will prevent false emails):',
            {
              paymentIntentId,
              meetingId: result.meeting?.id,
              error: retryError instanceof Error ? retryError.message : retryError,
            },
          );
        }
      }
    }

    // NOTE: Slot reservations are NOT created here for confirmed payments.
    // For card payments: Meeting creation IS the final booking
    // For Multibanco: Reservations are created when payment_intent is created (during pending state)
    // Once payment is confirmed, the meeting record serves as the booking

    // Create payment transfer record if payment intent exists
    if (session.payment_intent) {
      await createPaymentTransferIfNotExists({
        session,
        meetingData,
        paymentData,
        transferData,
      });
    }

    // Track pack redemption for no-cost sessions (promo code applied)
    if (session.payment_status === STRIPE_PAYMENT_STATUS_NO_PAYMENT_REQUIRED) {
      try {
        const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['total_details.breakdown'],
        });

        const discounts = expandedSession.total_details?.breakdown?.discounts;
        if (discounts && discounts.length > 0) {
          for (const discount of discounts) {
            const discountObj = discount.discount;
            if (!discountObj?.promotion_code) continue;

            const promoCodeId =
              typeof discountObj.promotion_code === 'string'
                ? discountObj.promotion_code
                : discountObj.promotion_code.id;

            const packPurchase = await db.query.PackPurchaseTable.findFirst({
              where: eq(PackPurchaseTable.stripePromotionCodeId, promoCodeId),
            });

            if (packPurchase && packPurchase.status === 'active') {
              const updated = await db
                .update(PackPurchaseTable)
                .set({
                  redemptionsUsed: sql`${PackPurchaseTable.redemptionsUsed} + 1`,
                  status: sql`CASE WHEN ${PackPurchaseTable.redemptionsUsed} + 1 >= ${PackPurchaseTable.maxRedemptions} THEN 'fully_redeemed' ELSE 'active' END`,
                })
                .where(
                  and(
                    eq(PackPurchaseTable.id, packPurchase.id),
                    eq(PackPurchaseTable.status, 'active'),
                    sql`${PackPurchaseTable.redemptionsUsed} < ${PackPurchaseTable.maxRedemptions}`,
                  ),
                )
                .returning({ id: PackPurchaseTable.id });

              if (updated.length > 0) {
                const newRedemptionsUsed = packPurchase.redemptionsUsed + 1;
                const remaining = packPurchase.maxRedemptions - newRedemptionsUsed;
                console.log('📦 Pack redemption tracked:', {
                  purchaseId: packPurchase.id,
                  redemptionsUsed: newRedemptionsUsed,
                  remaining,
                  maxRedemptions: packPurchase.maxRedemptions,
                });

                try {
                  const guestEmail = meetingData.guest;
                  const guestLocale = meetingData.locale || 'en';
                  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eleva.care';
                  const myPacksUrl = `${baseUrl}/${guestLocale}/my-packs?email=${encodeURIComponent(guestEmail)}`;

                  const statusLine =
                    remaining > 0
                      ? `You have ${remaining} session${remaining !== 1 ? 's' : ''} remaining in your pack.`
                      : `All sessions in your pack have been used.`;

                  await sendEmail({
                    to: guestEmail,
                    subject:
                      remaining > 0
                        ? `Pack session used - ${remaining} remaining`
                        : `All pack sessions used`,
                    html: `<p>Hi,</p><p>A session from your pack has been booked successfully.</p><p><strong>${statusLine}</strong></p><p><a href="${myPacksUrl}">View your pack status</a></p><p>Thanks,<br/>Eleva Care</p>`,
                  });
                } catch (notifyError) {
                  console.error('Failed to send pack redemption notification:', notifyError);
                }
              } else {
                console.log('📦 Pack redemption skipped (already fully redeemed):', {
                  purchaseId: packPurchase.id,
                });
              }
            }
          }
        }
      } catch (redemptionError) {
        console.error('Failed to track pack redemption:', redemptionError);
      }
    }

    return { success: true, meetingId: result.meeting?.id };
  } catch (error) {
    console.error('Error processing checkout session:', error);
    throw error;
  }
}

async function handleDoubleBookingRefund(paymentIntentId: string) {
  // Check if a refund already exists
  const existing = await stripe.refunds.list({
    payment_intent: paymentIntentId,
    limit: 1,
  });

  if (existing.data.length === 0) {
    console.log('Initiating refund for double booking:', paymentIntentId);
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'duplicate',
    });
  } else {
    console.log('Refund already exists for payment intent:', paymentIntentId);
  }
}

async function createPaymentTransferIfNotExists({
  session,
  meetingData,
  paymentData,
  transferData,
}: {
  session: StripeCheckoutSession;
  meetingData: ParsedMeetingMetadata;
  paymentData?: ParsedPaymentMetadata;
  transferData?: ParsedTransferMetadata;
}) {
  if (!session.payment_intent) {
    throw new Error('Payment intent ID is required for transfer record creation');
  }

  if (!paymentData || !transferData) {
    throw new Error('Payment and transfer data are required for transfer record creation');
  }

  if (!transferData.account) {
    throw new Error('Expert Connect account ID is required for transfer record creation');
  }

  const configuredGrossAmount = Number.parseInt(paymentData.amount, 10);
  const configuredPlatformFeeAmount = Number.parseInt(paymentData.fee, 10);
  const configuredExpertAmount = Number.parseInt(paymentData.expert, 10);
  const resolvedAmounts = resolveMarketplaceAmounts({
    actualGrossAmount: session.amount_total,
    configuredGrossAmount,
    actualPlatformFeeAmount: session.application_fee_amount,
    configuredPlatformFeeAmount,
    configuredExpertAmount,
  });
  const amount = resolvedAmounts.expertAmount;
  const platformFee = resolvedAmounts.platformFeeAmount;

  if (Number.isNaN(amount) || amount <= 0) {
    console.error('Invalid expert payment amount:', {
      sessionId: session.id,
      rawAmount: paymentData.expert,
      parsedAmount: amount,
    });
    throw new Error(`Invalid expert payment amount: ${paymentData.expert}`);
  }

  if (Number.isNaN(platformFee) || platformFee < 0) {
    console.error('Invalid platform fee:', {
      sessionId: session.id,
      rawFee: paymentData.fee,
      parsedFee: platformFee,
    });
    throw new Error(`Invalid platform fee: ${paymentData.fee}`);
  }

  // Use onConflictDoNothing so concurrent inserts are safe (DB unique on checkoutSessionId).
  const inserted = await db
    .insert(PaymentTransferTable)
    .values({
      paymentIntentId: session.payment_intent,
      checkoutSessionId: session.id,
      eventId: meetingData.id,
      expertConnectAccountId: transferData.account,
      expertClerkUserId: meetingData.expert,
      amount,
      platformFee,
      currency: session.currency || 'eur',
      sessionStartTime: new Date(meetingData.start),
      scheduledTransferTime: new Date(transferData.scheduled),
      status: PAYMENT_TRANSFER_STATUS_PENDING,
      requiresApproval: false,
      guestName: meetingData.guestName || session.metadata?.buyerName || null,
      guestEmail: meetingData.guest || session.metadata?.buyerEmail || null,
      guestPhone: meetingData.guestPhone || session.metadata?.buyerPhone || null,
      serviceName: session.metadata?.eventName || null,
      created: new Date(),
      updated: new Date(),
    })
    .onConflictDoNothing({ target: PaymentTransferTable.checkoutSessionId })
    .returning({ id: PaymentTransferTable.id });

  if (inserted.length === 0) {
    console.log(`Transfer record already exists for session ${session.id} (conflict ignored)`);
  } else {
    console.log(`Created payment transfer record for session ${session.id}`, {
      amount,
      platformFee,
      currency: session.currency || 'eur',
    });
  }
}

// Map Stripe payment status to database enum with proper validation
const mapPaymentStatus = (stripeStatus: string, sessionId?: string): PaymentStatus => {
  switch (stripeStatus) {
    case STRIPE_PAYMENT_STATUS_PAID:
      return PAYMENT_STATUS_SUCCEEDED;
    case STRIPE_PAYMENT_STATUS_UNPAID:
      return PAYMENT_STATUS_PENDING;
    case STRIPE_PAYMENT_STATUS_NO_PAYMENT_REQUIRED:
      return PAYMENT_STATUS_SUCCEEDED; // Treat as succeeded since no payment is needed
    default:
      // Validate if the status is already a valid database payment status
      if (isValidPaymentStatus(stripeStatus)) {
        return stripeStatus;
      }

      // Log warning for unknown statuses and return safe default
      console.warn(
        `Unknown Stripe payment status encountered: "${stripeStatus}"${
          sessionId ? ` for session ${sessionId}` : ''
        }. ` +
          `Defaulting to "${PAYMENT_STATUS_PENDING}". Please investigate if this is a new Stripe status.`,
        {
          sessionId,
          unknownStatus: stripeStatus,
          validStatuses: [
            'paid',
            'unpaid',
            'no_payment_required',
            'pending',
            'processing',
            'succeeded',
            'failed',
            'refunded',
          ],
        },
      );
      return PAYMENT_STATUS_PENDING;
  }
};

/**
 * Trigger Novu notification workflows based on Stripe events
 * @param event - The verified Stripe webhook event
 */
async function triggerNovuNotificationFromStripeEvent(event: Stripe.Event) {
  try {
    // Check if we have a workflow mapped for this event
    const workflowId = getWorkflowFromStripeEvent(event.type);

    if (!workflowId) {
      console.log(`🔕 No Novu workflow mapped for Stripe event: ${event.type}`);
      return;
    }

    // Get customer information for most events
    let customerId: string | undefined;
    let customer: Stripe.Customer | undefined;

    // Extract customer ID from different event types
    if ('customer' in event.data.object && typeof event.data.object.customer === 'string') {
      customerId = event.data.object.customer;
    } else if (
      'charges' in event.data.object &&
      event.data.object.charges &&
      typeof event.data.object.charges === 'object' &&
      'data' in event.data.object.charges &&
      Array.isArray(event.data.object.charges.data) &&
      event.data.object.charges.data[0]?.customer
    ) {
      customerId = event.data.object.charges.data[0].customer as string;
    } else if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      customerId = session.customer as string;
    }

    // Retrieve customer data if we have a customer ID
    if (customerId) {
      try {
        customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer;
      } catch (error) {
        console.warn(`Could not retrieve customer ${customerId} for Novu notification:`, error);
      }
    }

    // If we don't have customer data, skip the notification
    if (!customer || !customerId) {
      console.log(
        `🔕 No customer data available for Stripe event: ${event.type}, skipping Novu notification`,
      );
      return;
    }

    // Build subscriber data from Stripe customer
    const subscriber = buildNovuSubscriberFromStripe(customer);

    // Extract appointment details from payment metadata (for payment events)
    let appointmentDetails:
      | {
          service: string;
          expert: string;
          // Patient-formatted (for patient emails)
          date: string;
          time: string;
          // Expert-formatted (for expert emails)
          expertDate?: string;
          expertTime?: string;
          // Common fields
          duration?: string;
          patientTimezone?: string;
          expertTimezone?: string;
          notes?: string;
        }
      | undefined;

    // Check if this is a payment event with meeting metadata
    if (
      workflowId === 'payment-universal' &&
      'metadata' in event.data.object &&
      event.data.object.metadata
    ) {
      const metadata = event.data.object.metadata as Record<string, string>;

      // Parse meeting metadata if available
      if (metadata.meeting) {
        try {
          const meetingData = JSON.parse(metadata.meeting) as {
            id?: string;
            expert?: string;
            guest?: string;
            guestName?: string;
            start?: string;
            dur?: number;
            notes?: string;
            timezone?: string;
            locale?: string;
          };

          // Resolve expert name from database
          let expertName = 'Expert';
          if (meetingData.expert) {
            try {
              const expertUser = await db
                .select({
                  firstName: UserTable.firstName,
                  lastName: UserTable.lastName,
                })
                .from(UserTable)
                .where(eq(UserTable.clerkUserId, meetingData.expert))
                .limit(1);

              if (expertUser.length > 0 && expertUser[0]) {
                const { firstName, lastName } = expertUser[0];
                expertName = [firstName, lastName].filter(Boolean).join(' ') || 'Expert';
              }
            } catch (dbError) {
              console.warn('Could not resolve expert name from database:', dbError);
            }
          }

          // Fetch expert's timezone from ScheduleTable
          let expertTimezone = 'Europe/Lisbon'; // Default fallback for experts
          if (meetingData.expert) {
            try {
              const expertSchedule = await db.query.ScheduleTable.findFirst({
                where: (fields, { eq: eqOp }) => eqOp(fields.clerkUserId, meetingData.expert!),
              });

              if (expertSchedule?.timezone) {
                expertTimezone = expertSchedule.timezone;
              }
            } catch (dbError) {
              console.warn('Could not resolve expert timezone from database:', dbError);
            }
          }

          // Resolve service name from event if available
          let serviceName = 'Consultation';
          if (meetingData.id) {
            try {
              const eventRecord = await db
                .select({ name: EventTable.name })
                .from(EventTable)
                .where(eq(EventTable.id, meetingData.id))
                .limit(1);

              if (eventRecord.length > 0 && eventRecord[0]) {
                serviceName = eventRecord[0].name || 'Consultation';
              }
            } catch (dbError) {
              console.warn('Could not resolve service name from database:', dbError);
            }
          }

          // Format date and time from ISO string with locale support
          const startDate = meetingData.start ? new Date(meetingData.start) : new Date();
          const patientTimezone = meetingData.timezone || 'UTC';
          const patientLocale = getDateFnsLocale(meetingData.locale);
          // Default expert locale to English for professional contexts
          const expertLocale = getDateFnsLocale('en');

          // Format for patient (in their local timezone with their locale)
          const patientDate = formatInTimeZone(startDate, patientTimezone, 'EEEE, MMMM d, yyyy', {
            locale: patientLocale,
          });
          const patientTime = formatInTimeZone(startDate, patientTimezone, 'h:mm a', {
            locale: patientLocale,
          });

          // Format for expert (in their local timezone)
          const expertDate = formatInTimeZone(startDate, expertTimezone, 'EEEE, MMMM d, yyyy', {
            locale: expertLocale,
          });
          const expertTime = formatInTimeZone(startDate, expertTimezone, 'h:mm a', {
            locale: expertLocale,
          });

          appointmentDetails = {
            service: serviceName,
            expert: expertName,
            // Patient-formatted (for patient emails)
            date: patientDate,
            time: `${patientTime} (${patientTimezone})`,
            // Expert-formatted (for expert emails)
            expertDate: expertDate,
            expertTime: `${expertTime} (${expertTimezone})`,
            // Common fields
            duration: meetingData.dur ? `${meetingData.dur} minutes` : '60 minutes',
            patientTimezone,
            expertTimezone,
            notes: meetingData.notes,
          };

          // Log sanitized appointment details (without PHI/PII)
          console.log('📅 Extracted appointment details from payment metadata:', {
            service: appointmentDetails.service,
            duration: appointmentDetails.duration,
            patientTimezone: appointmentDetails.patientTimezone,
            expertTimezone: appointmentDetails.expertTimezone,
            hasNotes: !!appointmentDetails.notes,
          });
        } catch (parseError) {
          console.warn('Could not parse meeting metadata:', parseError);
        }
      }
    }

    // Create raw payload from Stripe event
    const rawPayload: StripeWebhookPayload = {
      eventType: event.type,
      eventId: event.id,
      eventData: event.data.object as unknown as Record<string, unknown>,
      timestamp: Date.now(),
      source: 'stripe_webhook',
      amount: 'amount' in event.data.object ? (event.data.object.amount as number) : undefined,
      currency:
        'currency' in event.data.object ? (event.data.object.currency as string) : undefined,
      appointmentDetails,
    };

    // Transform payload to match target workflow schema
    const payload = transformStripePayloadForNovu(workflowId, rawPayload, customer);

    // Trigger the Novu workflow
    console.log(`🔔 Triggering Novu workflow '${workflowId}' for Stripe event '${event.type}'`);
    const result = await triggerNovuWorkflow(workflowId, subscriber, payload);

    if (result.success) {
      console.log(`✅ Successfully triggered Novu workflow for Stripe event: ${event.type}`);
    } else {
      console.error(`❌ Failed to trigger Novu workflow for Stripe event:`, result.error);
    }
  } catch (error) {
    console.error('Error triggering Novu notification from Stripe event:', error);
    // Don't throw - we don't want Novu failures to break webhook processing
  }
}

/**
 * Handles webhook events from Stripe for identity verification and Connect accounts
 *
 * @param request The incoming request from Stripe
 * @returns A JSON response indicating success or failure
 */
export async function POST(request: NextRequest) {
  const processingStartTime = Date.now(); // Track processing time for monitoring
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ Missing Stripe signature');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(
      '❌ Webhook signature verification failed:',
      err instanceof Error ? err.message : err,
    );
    // Record monitoring failure for signature verification issues
    await webhookMonitor
      .recordFailure(
        'stripe',
        'signature_verification',
        'unknown',
        err instanceof Error ? err.message : 'Invalid signature',
      )
      .catch((monitorErr) => console.error('Failed to record monitoring failure:', monitorErr));
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Deduplicate: skip events we have already processed successfully.
  // We CHECK first (not insert), so a failed processing attempt can be retried.
  // The row is only recorded AFTER successful processing below.
  try {
    const existing = await db.query.StripeProcessedEventTable.findFirst({
      where: eq(StripeProcessedEventTable.eventId, event.id),
    });
    if (existing) {
      console.log(`⏭️ Skipping already-processed event ${event.id} (${event.type})`);
      return NextResponse.json({ received: true, deduplicated: true });
    }
  } catch (dedupeError) {
    console.warn('⚠️ Event deduplication check failed, processing anyway:', {
      eventId: event.id,
      error: dedupeError instanceof Error ? dedupeError.message : dedupeError,
    });
  }

  // Process the event based on type
  try {
    switch (event.type) {
      case 'account.updated':
      case 'account.external_account.created':
      case 'account.external_account.updated':
      case 'account.external_account.deleted':
      case 'payout.paid':
      case 'payout.failed':
        // Ownership boundary: Stripe Connect account/payout lifecycle is handled
        // exclusively in /api/webhooks/stripe-connect to avoid duplicate effects.
        console.log('Skipping Connect-owned event on main Stripe webhook endpoint', {
          eventType: event.type,
          eventId: event.id,
        });
        break;
      case 'identity.verification_session.verified':
      case 'identity.verification_session.requires_input': {
        // Validate that the object has the expected properties of a verification session
        const obj = event.data.object;
        if (!obj || typeof obj !== 'object' || !('status' in obj) || !('id' in obj)) {
          console.error('Invalid verification session object:', obj);
          break;
        }
        const verificationSession = obj as Stripe.Identity.VerificationSession;

        // For identity verification, we need to find the user by the verification status
        // and extract any related account ID from the metadata
        await handleIdentityVerificationUpdated(verificationSession);
        break;
      }
      case 'checkout.session.completed':
        try {
          console.log('🎉 Processing checkout.session.completed event:', {
            sessionId: event.data.object.id,
            paymentStatus: (event.data.object as StripeCheckoutSession).payment_status,
            paymentIntent: (event.data.object as StripeCheckoutSession).payment_intent,
          });
          const sessionResult = await handleCheckoutSession(
            event.data.object as StripeCheckoutSession,
          );
          console.log('✅ Checkout session processing completed:', sessionResult);
        } catch (error) {
          console.error('❌ Error in checkout.session.completed handler:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            sessionId: event.data.object.id,
          });
          throw error; // Rethrow to be caught by the outer try-catch
        }
        break;
      case 'checkout.session.async_payment_succeeded':
        try {
          console.log('🎉 Processing checkout.session.async_payment_succeeded event:', {
            sessionId: event.data.object.id,
            paymentStatus: (event.data.object as StripeCheckoutSession).payment_status,
          });
          const asyncResult = await handleCheckoutSession(
            event.data.object as StripeCheckoutSession,
          );
          console.log('✅ Async payment succeeded processing completed:', asyncResult);
        } catch (error) {
          console.error('❌ Error in checkout.session.async_payment_succeeded handler:', {
            error: error instanceof Error ? error.message : error,
            sessionId: event.data.object.id,
          });
          throw error;
        }
        break;
      case 'checkout.session.async_payment_failed':
        try {
          const failedSession = event.data.object as StripeCheckoutSession;
          console.log('❌ Processing checkout.session.async_payment_failed event:', {
            sessionId: failedSession.id,
            paymentStatus: failedSession.payment_status,
          });

          // Clean up pending meeting and slot reservation for the failed async payment
          const failedPaymentIntentId =
            typeof failedSession.payment_intent === 'string'
              ? failedSession.payment_intent
              : (failedSession.payment_intent as Stripe.PaymentIntent | null)?.id;

          if (failedPaymentIntentId) {
            // Mark meeting as failed if it was created in pending state
            await db
              .update(MeetingTable)
              .set({ stripePaymentStatus: 'failed', updatedAt: new Date() })
              .where(eq(MeetingTable.stripePaymentIntentId, failedPaymentIntentId));

            // Clean up slot reservation
            await db
              .delete(SlotReservationTable)
              .where(eq(SlotReservationTable.stripePaymentIntentId, failedPaymentIntentId));

            console.log('🧹 Cleaned up pending meeting and reservation for failed async payment:', {
              paymentIntentId: failedPaymentIntentId,
            });
          }

          // Trigger the payment_failed handler for notifications if we have a PI
          if (failedPaymentIntentId) {
            try {
              const pi = await stripe.paymentIntents.retrieve(failedPaymentIntentId);
              await handlePaymentFailed(pi);
            } catch (piError) {
              console.warn('Could not retrieve PI for failed async payment notification:', piError);
            }
          }
        } catch (error) {
          console.error('❌ Error in checkout.session.async_payment_failed handler:', {
            error: error instanceof Error ? error.message : error,
            sessionId: event.data.object.id,
          });
          throw error;
        }
        break;
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.requires_action':
        await handlePaymentIntentRequiresAction(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;
      case 'payment_intent.created': {
        console.log('Payment intent created:', event.data.object.id);

        // No immediate slot reservation needed - this will be handled by webhooks based on payment method
        // For credit cards: payment_intent.succeeded → create meeting directly
        // For Multibanco: payment_intent.requires_action → create slot reservation → payment_intent.succeeded → convert to meeting
        console.log(
          '✅ Payment intent created - slot management delegated to payment method specific webhooks',
        );
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // 🔔 NEW: Trigger Novu notification workflows after processing the event
    // This is a non-blocking operation - if it fails, we still want to acknowledge the webhook
    try {
      await triggerNovuNotificationFromStripeEvent(event);
      console.log('✅ Novu notification workflow triggered successfully');
    } catch (novuError) {
      console.error('⚠️ Novu notification failed (non-blocking):', {
        error: novuError instanceof Error ? novuError.message : novuError,
        eventType: event.type,
        eventId: event.id,
      });
      // Don't throw - Novu failures shouldn't block webhook processing
    }

    // Mark event as processed AFTER successful handling so failed attempts can be retried.
    await db
      .insert(StripeProcessedEventTable)
      .values({ eventId: event.id, eventType: event.type })
      .onConflictDoNothing()
      .catch((err) => console.warn('⚠️ Failed to record processed event (non-blocking):', err));

    // 📊 Record successful webhook processing for monitoring
    const processingTime = Date.now() - processingStartTime;
    await webhookMonitor
      .recordSuccess('stripe', event.type, event.id, processingTime)
      .catch((monitorErr) => console.error('Failed to record monitoring success:', monitorErr));

    return NextResponse.json({ received: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('❌ Error processing webhook event:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      eventType: event?.type || 'unknown',
      eventId: event?.id || 'unknown',
      timestamp: new Date().toISOString(),
    });

    // 📊 Record failed webhook processing for monitoring
    await webhookMonitor
      .recordFailure('stripe', event?.type || 'unknown', event?.id || 'unknown', errorMessage)
      .catch((monitorErr) => console.error('Failed to record monitoring failure:', monitorErr));

    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 },
    );
  }
}
