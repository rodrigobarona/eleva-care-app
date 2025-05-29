import { STRIPE_CONFIG } from '@/config/stripe';
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
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

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

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

// Note: Configuration is in route.config.ts to ensure Next.js properly applies settings

// Interface for meeting data stored in Stripe metadata
interface ParsedMeetingMetadata {
  id: string;
  expert: string;
  guest: string;
  start: string;
  dur: number;
  locale?: string;
}

interface ParsedPaymentMetadata {
  amount: string;
  fee: string;
  expert: string;
}

interface ParsedTransferMetadata {
  status: string;
  account: string;
  country: string;
  delay: {
    aging: number;
    remaining: number;
    required: number;
  };
  scheduled: string;
}

interface StripeCheckoutSession extends Stripe.Checkout.Session {
  metadata: {
    meeting?: string; // JSON string of ParsedMeetingMetadata
    payment?: string; // JSON string of ParsedPaymentMetadata
    transfer?: string; // JSON string of ParsedTransferMetadata
    approval?: string; // 'true' | 'false'
  };
  application_fee_amount?: number | null;
  payment_intent: string | null;
}

// Helper function to parse metadata safely
function parseMetadata<T>(json: string | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Failed to parse metadata:', error);
    return fallback;
  }
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

    // Check for required metadata
    if (!session.metadata?.meeting) {
      console.error('Missing meeting metadata in checkout session:', {
        sessionId: session.id,
        metadata: session.metadata,
      });
      throw new Error('Missing meeting metadata in session. Cannot process meeting.');
    }

    // Parse metadata chunks with proper typing
    const meetingData = parseMetadata<ParsedMeetingMetadata>(session.metadata.meeting, {
      id: '',
      expert: '',
      guest: '',
      start: '',
      dur: 0,
    });
    const paymentData = parseMetadata<ParsedPaymentMetadata>(session.metadata.payment, {
      amount: '0',
      fee: '0',
      expert: '0',
    });
    const transferData = parseMetadata<ParsedTransferMetadata>(session.metadata.transfer, {
      status: 'PENDING',
      account: '',
      country: '',
      delay: { aging: 0, remaining: 0, required: 0 },
      scheduled: new Date().toISOString(),
    });

    // Validate essential fields
    if (!meetingData.id || !meetingData.expert || !meetingData.start || !meetingData.guest) {
      console.error('Essential fields missing from meeting metadata:', {
        sessionId: session.id,
        meetingData,
      });
      throw new Error('Essential fields missing from meeting metadata.');
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
      guestName: meetingData.guest.split('@')[0], // Fallback name from email
      timezone: 'UTC', // Default to UTC, timezone handling moved to client
      stripeSessionId: session.id,
      stripePaymentStatus: mapPaymentStatus(session.payment_status, session.id),
      stripeAmount: session.amount_total ?? undefined,
      stripeApplicationFeeAmount: session.application_fee_amount ?? undefined,
      locale: meetingData.locale || 'en', // Default to English, locale handling moved to client
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

    // Create payment transfer record if it doesn't exist
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
  paymentData: ParsedPaymentMetadata;
  transferData: ParsedTransferMetadata;
}) {
  // Check for existing transfer
  const existingTransfer = await db.query.PaymentTransferTable.findFirst({
    where: eq(PaymentTransferTable.checkoutSessionId, session.id),
  });

  if (existingTransfer) {
    console.log(`Transfer record already exists for session ${session.id}`);
    return;
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

  // Create new transfer record
  await db.insert(PaymentTransferTable).values({
    paymentIntentId: session.payment_intent || '',
    checkoutSessionId: session.id,
    eventId: meetingData.id,
    expertConnectAccountId: transferData.account,
    expertClerkUserId: meetingData.expert,
    amount,
    platformFee,
    currency: session.currency || 'eur',
    sessionStartTime: new Date(meetingData.start),
    scheduledTransferTime: new Date(transferData.scheduled),
    status: PAYMENT_TRANSFER_STATUS_PENDING, // Always start with PENDING status
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
export async function POST(request: Request) {
  try {
    // Get the raw request body as text for Stripe signature verification
    // IMPORTANT: This consumes the request body stream. Any subsequent calls to request.text()
    // or request.json() will return empty results. The body must be read only once.
    const body = await request.text();

    // Get the Stripe signature from request headers directly
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      console.error('Missing Stripe signature in webhook request');
      return NextResponse.json({ error: 'Webhook Error: Missing signature' }, { status: 400 });
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not defined');
      }

      // Use the raw body string with the signature for verification
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      console.log(`Stripe webhook verified: ${event.type}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Webhook signature verification error: ${errorMessage}`);
      return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
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
          try {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const sessionId = paymentIntent.metadata?.sessionId;

            if (sessionId) {
              await db
                .update(SlotReservationTable)
                .set({
                  stripePaymentIntentId: paymentIntent.id,
                })
                .where(eq(SlotReservationTable.stripeSessionId, sessionId));
              console.log(`🔗 Linked slot reservation to payment intent ${paymentIntent.id}`);
            }
          } catch (error) {
            console.error('Failed to update slot reservation with payment intent ID:', error);
            // Continue execution - this is not critical
          }
          break;
        }
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return NextResponse.json({ received: true });
    } catch (error) {
      console.error(`Error processing webhook event ${event.type}:`, error);
      return NextResponse.json(
        { error: 'Internal server error processing webhook' },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Unexpected error in webhook handler:', error);
    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 },
    );
  }
}
