import { ENV_CONFIG } from '@/config/env';
import { db } from '@/drizzle/db';
import { PaymentTransferTable, SlotReservationTable } from '@/drizzle/schema';
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
import { createMeeting } from '@/server/actions/meetings';
import { ensureFullUserSynchronization } from '@/server/actions/user-sync';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';

import { handleAccountUpdated } from './handlers/account';
import {
  handleExternalAccountCreated,
  handleExternalAccountDeleted,
} from './handlers/external-account';
import { handleIdentityVerificationUpdated } from './handlers/identity';
import {
  handleChargeRefunded,
  handleDisputeCreated,
  handlePaymentFailed,
  handlePaymentIntentRequiresAction,
  handlePaymentSucceeded,
} from './handlers/payment';
import { handlePayoutFailed, handlePayoutPaid } from './handlers/payout';

// Initialize Stripe
const stripe = new Stripe(ENV_CONFIG.STRIPE_SECRET_KEY, {
  apiVersion: ENV_CONFIG.STRIPE_API_VERSION as Stripe.LatestApiVersion,
});

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
  locale: z.string().optional(),
  timezone: z.string().optional(),
});

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
  remaining: z.number().int().min(0, 'Remaining days must be non-negative'),
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
    if (typeof metadata.delay.remaining !== 'number') missingFields.push('delay.remaining');
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

async function handleCheckoutSession(session: StripeCheckoutSession) {
  console.log('Starting checkout session processing:', {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    paymentIntent: session.payment_intent,
  });

  try {
    // First check if we already have a meeting for this session
    const existingMeeting = await db.query.MeetingTable.findFirst({
      where: ({ stripeSessionId }, { eq }) => eq(stripeSessionId, session.id),
    });

    if (existingMeeting) {
      console.log('Meeting already exists for session:', {
        sessionId: session.id,
        meetingId: existingMeeting.id,
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

    const result = await createMeeting({
      eventId: meetingData.id,
      clerkUserId: meetingData.expert,
      startTime: new Date(meetingData.start),
      guestEmail: meetingData.guest,
      guestName: getGuestName(meetingData),
      guestNotes: meetingData.notes,
      timezone: meetingData.timezone || 'UTC', // Use provided timezone or fallback to UTC
      stripeSessionId: session.id,
      stripePaymentStatus: mapPaymentStatus(session.payment_status, session.id),
      stripeAmount: session.amount_total ?? undefined,
      stripeApplicationFeeAmount: session.application_fee_amount ?? undefined,
      locale: meetingData.locale || 'en',
    });

    // Handle possible errors
    if (result.error) {
      console.error('Failed to create meeting:', result.error);

      // Handle refund for double booking
      if (
        result.code === 'SLOT_ALREADY_BOOKED' &&
        session.payment_status === STRIPE_PAYMENT_STATUS_PAID &&
        typeof session.payment_intent === 'string'
      ) {
        await handleDoubleBookingRefund(session.payment_intent);
      }

      return { success: false, error: result.error };
    }

    console.log('Meeting created successfully:', {
      sessionId: session.id,
      meetingId: result.meeting?.id,
    });

    // Create payment transfer record if payment intent exists
    if (session.payment_intent) {
      await createPaymentTransferIfNotExists({
        session,
        meetingData,
        paymentData,
        transferData,
      });
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
  // Check for existing transfer
  const existingTransfer = await db.query.PaymentTransferTable.findFirst({
    where: eq(PaymentTransferTable.checkoutSessionId, session.id),
  });

  if (existingTransfer) {
    console.log(`Transfer record already exists for session ${session.id}`);
    return;
  }

  // Validate required fields and data
  if (!session.payment_intent) {
    throw new Error('Payment intent ID is required for transfer record creation');
  }

  if (!paymentData || !transferData) {
    throw new Error('Payment and transfer data are required for transfer record creation');
  }

  if (!transferData.account) {
    throw new Error('Expert Connect account ID is required for transfer record creation');
  }

  // Parse and validate payment amounts
  const amount = Number.parseInt(paymentData.expert, 10);
  const platformFee = Number.parseInt(paymentData.fee, 10);

  // Validate parsed amounts
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

  // Create new transfer record with validated data
  await db.insert(PaymentTransferTable).values({
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
    requiresApproval: session.metadata?.approval === 'true',
    created: new Date(),
    updated: new Date(),
  });

  console.log(`Created payment transfer record for session ${session.id}`, {
    amount,
    platformFee,
    currency: session.currency || 'eur',
  });
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
 * Handles webhook events from Stripe for identity verification and Connect accounts
 *
 * @param request The incoming request from Stripe
 * @returns A JSON response indicating success or failure
 */
export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Process the event based on type
  try {
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
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
          console.log('Processing checkout.session.completed event');
          await handleCheckoutSession(event.data.object as StripeCheckoutSession);
        } catch (error) {
          console.error('Error in checkout.session.completed handler:', error);
          throw error; // Rethrow to be caught by the outer try-catch
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
      case 'account.external_account.created':
        if ('account' in event.data.object && typeof event.data.object.account === 'string') {
          await handleExternalAccountCreated(
            event.data.object as Stripe.BankAccount | Stripe.Card,
            event.data.object.account,
          );
        }
        break;
      case 'account.external_account.deleted':
        if ('account' in event.data.object && typeof event.data.object.account === 'string') {
          await handleExternalAccountDeleted(
            event.data.object as Stripe.BankAccount | Stripe.Card,
            event.data.object.account,
          );
        }
        break;
      case 'payment_intent.created': {
        console.log('Payment intent created:', event.data.object.id);

        // Update slot reservation with payment intent ID
        // Instead of relying on sessionId in metadata, we'll link by payment intent ID
        // since the slot reservation will be linked to the session that created this payment intent
        try {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;

          // Find slot reservation by payment intent (it should have been created with this payment intent)
          // or find by the checkout session that would have created this payment intent
          const existingReservation = await db.query.SlotReservationTable.findFirst({
            where: eq(SlotReservationTable.stripePaymentIntentId, paymentIntent.id),
          });

          if (existingReservation) {
            console.log(`🔗 Slot reservation already linked to payment intent ${paymentIntent.id}`);
          } else {
            // Try to find by session ID from a different source if needed
            // For now, we'll log that no reservation was found and continue
            console.log(
              `⚠️  No slot reservation found for payment intent ${paymentIntent.id} - this may be normal for immediate bookings`,
            );
          }
        } catch (error) {
          console.error('Failed to update slot reservation with payment intent ID:', error);
          // Continue execution - this is not critical
        }
        break;
      }
      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;
      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook event:', error);
    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 },
    );
  }
}
