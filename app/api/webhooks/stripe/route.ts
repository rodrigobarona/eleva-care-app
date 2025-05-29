import { getMinimumPayoutDelay, STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { PaymentTransferTable } from '@/drizzle/schema';
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
  eventId: string; // Added eventId
  expertClerkUserId: string;
  expertName: string;
  guestName: string;
  guestEmail: string;
  guestNotes?: string;
  startTime: string; // ISO string
  startTimeFormatted?: string;
  duration: number; // in minutes
  timezone: string;
  price?: number; // Stored as part of meeting context
  locale?: string;
}

interface StripeCheckoutSession extends Stripe.Checkout.Session {
  metadata: {
    // Single source of truth for meeting application context
    meetingData?: string;

    // Other direct metadata fields if absolutely necessary (mostly payment/transfer related)
    expertConnectAccountId?: string; // Kept for direct access for transfer logic
    scheduledTransferTime?: string; // Kept for direct access
    requiresApproval?: string; // Kept for direct access
    // platformFee is not directly on session.metadata, it's on payment_intent.metadata or session.application_fee_amount
  };
  application_fee_amount?: number | null; // This is the platform fee
  payment_intent: string | null;
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
    if (!session.metadata?.meetingData) {
      console.error('Missing meetingData in checkout session metadata:', {
        sessionId: session.id,
        metadata: session.metadata,
      });
      throw new Error('Missing meetingData in session metadata. Cannot process meeting.');
    }

    let parsedMeetingData: ParsedMeetingMetadata;
    try {
      parsedMeetingData = JSON.parse(session.metadata.meetingData) as ParsedMeetingMetadata;
    } catch (error) {
      console.error('Failed to parse meetingData from session metadata:', {
        sessionId: session.id,
        meetingDataString: session.metadata.meetingData,
        error,
      });
      throw new Error('Invalid meetingData format in session metadata.');
    }

    // Validate essential fields from parsedMeetingData
    if (
      !parsedMeetingData.eventId ||
      !parsedMeetingData.expertClerkUserId ||
      !parsedMeetingData.startTime ||
      !parsedMeetingData.guestEmail
    ) {
      console.error('Essential fields missing from parsed meetingData:', {
        sessionId: session.id,
        parsedMeetingData,
      });
      throw new Error('Essential fields missing from parsed meetingData.');
    }

    const eventId = parsedMeetingData.eventId; // eventId is now from meetingData
    const expertClerkUserIdFromMeetingData = parsedMeetingData.expertClerkUserId;

    // If we have a Clerk user ID, ensure synchronization
    if (expertClerkUserIdFromMeetingData) {
      try {
        console.log(
          'Ensuring user synchronization for Clerk user:',
          expertClerkUserIdFromMeetingData,
        );
        await ensureFullUserSynchronization(expertClerkUserIdFromMeetingData);
      } catch (error) {
        console.error('Failed to synchronize user data:', error);
        // Continue processing even if synchronization fails
      }
    }

    const locale = parsedMeetingData.locale || 'en';

    // Map Stripe payment status to database enum
    const mapPaymentStatus = (stripeStatus: string) => {
      switch (stripeStatus) {
        case 'paid':
          return 'succeeded';
        case 'unpaid':
          return 'pending';
        case 'no_payment_required':
          return 'succeeded'; // Treat as succeeded since no payment is needed
        default:
          return stripeStatus as 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
      }
    };

    const result = await createMeeting({
      eventId: eventId,
      clerkUserId: expertClerkUserIdFromMeetingData,
      startTime: new Date(parsedMeetingData.startTime),
      guestEmail: parsedMeetingData.guestEmail,
      guestName: parsedMeetingData.guestName,
      guestNotes: parsedMeetingData.guestNotes,
      timezone: parsedMeetingData.timezone,
      stripeSessionId: session.id,
      stripePaymentStatus: mapPaymentStatus(session.payment_status),
      stripeAmount: session.amount_total ?? undefined,
      // platformFee is session.application_fee_amount
      stripeApplicationFeeAmount: session.application_fee_amount ?? undefined,
      locale: locale,
    });

    // Handle possible errors
    if (result.error) {
      console.error('Failed to create meeting:', result.error);

      // If double booking and payment is paid, initiate a refund
      if (
        result.code === 'SLOT_ALREADY_BOOKED' &&
        session.payment_status === 'paid' &&
        typeof session.payment_intent === 'string'
      ) {
        // Check if a refund already exists for this payment_intent
        const existing = await stripe.refunds.list({
          payment_intent: session.payment_intent,
          limit: 1,
        });
        if (existing.data.length === 0) {
          console.log('Initiating refund for double booking:', session.payment_intent);
          await stripe.refunds.create({
            payment_intent: session.payment_intent,
            reason: 'duplicate',
          });
        } else {
          console.log('Refund already exists for payment intent:', session.payment_intent);
        }
      }

      return { success: false, error: result.error };
    }

    console.log('Meeting created successfully:', {
      sessionId: session.id,
      meetingId: result.meeting?.id,
    });

    // Extract metadata from session for payment transfer
    // expertConnectAccountId is still directly on session.metadata as per create-payment-intent
    const expertConnectAccountId = session.metadata?.expertConnectAccountId;
    // expertClerkUserId is now reliably from parsedMeetingData.expertClerkUserId
    // sessionStartTime is now reliably from parsedMeetingData.startTime
    const sessionStartTime = new Date(parsedMeetingData.startTime);
    // platformFee is directly on the session object as application_fee_amount
    const platformFee = session.application_fee_amount ?? 0;

    if (!expertConnectAccountId) {
      // This should ideally not happen if create-payment-intent sets it.
      console.error('Critical: Missing expertConnectAccountId in checkout session metadata:', {
        sessionId: session.id,
        metadata: session.metadata,
      });
      // Fail catastrophically if expertConnectAccountId is missing, as payouts will fail.
      throw new Error('Critical: expertConnectAccountId is missing from session metadata.');
    }

    // Get country for the expert's Connect account - this logic remains the same
    let expertCountry = 'PT'; // Default fallback
    try {
      const connectAccount = await stripe.accounts.retrieve(expertConnectAccountId);
      expertCountry = connectAccount.country || 'PT';
    } catch (error) {
      console.warn(
        `Could not retrieve expert country for Connect account ${expertConnectAccountId}, using default: ${expertCountry}`,
        error,
      );
    }

    // Record payment received date (now)
    const paymentReceivedDate = new Date();
    const requiredPayoutDelay = getMinimumPayoutDelay(expertCountry);
    // Use duration from parsedMeetingData
    const sessionDurationMs = (parsedMeetingData.duration ?? 60) * 60 * 1000;

    const paymentAgingDays = Math.max(
      0,
      Math.floor(
        (sessionStartTime.getTime() - paymentReceivedDate.getTime()) / (24 * 60 * 60 * 1000),
      ),
    );
    const remainingDelayDays = Math.max(1, requiredPayoutDelay - paymentAgingDays);
    const finalScheduledTransferTime = new Date( // Renamed to avoid conflict with session.metadata.scheduledTransferTime if it exists
      sessionStartTime.getTime() + sessionDurationMs + remainingDelayDays * 24 * 60 * 60 * 1000,
    );
    finalScheduledTransferTime.setHours(4, 0, 0, 0);

    console.log('Scheduled payout with payment aging consideration (using parsed meetingData):', {
      paymentReceivedDate: paymentReceivedDate.toISOString(),
      sessionStartTime: sessionStartTime.toISOString(), // from parsedMeetingData.startTime
      expertCountry,
      requiredPayoutDelay,
      paymentAgingDays,
      remainingDelayDays,
      scheduledTransferTime: finalScheduledTransferTime.toISOString(),
    });

    // Check if a payment transfer record already exists for this session
    const existingTransfer = await db.query.PaymentTransferTable.findFirst({
      where: eq(PaymentTransferTable.checkoutSessionId, session.id),
    });

    if (existingTransfer) {
      console.log(`Transfer record already exists for session ${session.id}`);
    } else {
      await db.insert(PaymentTransferTable).values({
        paymentIntentId: session.payment_intent || '',
        checkoutSessionId: session.id,
        eventId: eventId, // from parsedMeetingData.eventId
        expertConnectAccountId: expertConnectAccountId, // from session.metadata
        expertClerkUserId: expertClerkUserIdFromMeetingData, // from parsedMeetingData.expertClerkUserId
        amount: (session.amount_total || 0) - platformFee, // platformFee is session.application_fee_amount
        platformFee: platformFee, // platformFee is session.application_fee_amount
        currency: session.currency || 'eur',
        sessionStartTime: sessionStartTime, // from parsedMeetingData.startTime
        scheduledTransferTime: finalScheduledTransferTime, // Calculated value
        status: 'PENDING',
        // requiresApproval still directly from session.metadata as it's not meeting context
        requiresApproval: session.metadata?.requiresApproval === 'true',
        created: new Date(),
        updated: new Date(),
      });
      console.log(`Created payment transfer record for session ${session.id}`);
    }

    return { success: true, meetingId: result.meeting?.id };
  } catch (error) {
    console.error(`Error processing checkout session ${session.id}:`, error);
    throw error; // Rethrow to be handled by the main route handler
  }
}

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
