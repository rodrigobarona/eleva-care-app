import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { PaymentTransferTable } from '@/drizzle/schema';
import { createMeeting } from '@/server/actions/meetings';
import { ensureFullUserSynchronization } from '@/server/actions/user-sync';
import { headers } from 'next/headers';
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
  handlePaymentSucceeded,
} from './handlers/payment';

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';
export const maxDuration = 60;

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

// Interface for Checkout Session with metadata
interface MeetingMetadata {
  expertClerkUserId: string;
  expertName: string;
  guestName: string;
  guestEmail: string;
  guestNotes?: string;
  startTime: string;
  duration: number;
  timezone: string;
  price?: number;
}

interface StripeCheckoutSession extends Stripe.Checkout.Session {
  metadata: {
    meetingData?: string;
    eventId?: string;
    clerkUserId?: string;
    expertConnectAccountId?: string;
    expertAmount?: string;
    platformFee?: string;
    requiresApproval?: string;
    transferStatus?: string;
    sessionStartTime?: string;
    scheduledTransferTime?: string;
  };
  application_fee_amount?: number | null;
}

// Add GET handler to explain the endpoint
export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint only accepts POST requests from Stripe webhooks' },
    { status: 405 },
  );
}

async function handleCheckoutSession(session: StripeCheckoutSession) {
  console.log('Starting checkout session processing:', {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    paymentIntent: session.payment_intent,
    metadata: session.metadata,
  });

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

  if (!session.metadata?.meetingData || !session.metadata.eventId) {
    throw new Error('Missing required metadata');
  }

  // Ensure customer is properly synchronized with our database
  const clerkUserId = session.metadata.clerkUserId;

  // If we have a Clerk user ID, ensure synchronization
  if (clerkUserId) {
    try {
      console.log('Ensuring user synchronization for Clerk user:', clerkUserId);
      await ensureFullUserSynchronization(clerkUserId);
    } catch (error) {
      console.error('Failed to synchronize user data:', error);
      // Continue processing even if synchronization fails
    }
  }

  // Also sync Stripe customer data to KV for redundancy
  if (typeof session.customer === 'string') {
    try {
      console.log('Syncing customer data to KV:', session.customer);
      // KV sync functionality has been moved or is no longer available
      // Commented out to prevent errors
      // await syncStripeDataToKV(session.customer);
    } catch (error) {
      console.error('Failed to sync customer data to KV:', error);
      // Continue processing even if KV sync fails
    }
  }

  const meetingData = JSON.parse(session.metadata.meetingData) as MeetingMetadata;
  console.log('Parsed meeting data:', meetingData);

  const result = await createMeeting({
    eventId: session.metadata.eventId,
    clerkUserId: meetingData.expertClerkUserId,
    startTime: new Date(meetingData.startTime),
    guestEmail: meetingData.guestEmail,
    guestName: meetingData.guestName,
    guestNotes: meetingData.guestNotes,
    timezone: meetingData.timezone,
    stripeSessionId: session.id,
    stripePaymentStatus: session.payment_status,
    stripeAmount: session.amount_total ?? undefined,
    stripeApplicationFeeAmount: session.application_fee_amount ?? undefined,
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
      console.log('Initiating refund for double booking:', session.payment_intent);
      await stripe.refunds.create({
        payment_intent: session.payment_intent,
        reason: 'duplicate',
      });
    }

    return { success: false, error: result.error };
  }

  console.log('Meeting created successfully:', {
    sessionId: session.id,
    meetingId: result.meeting?.id,
  });

  // Record the payment for expert transfer if payment is successful
  if (
    session.payment_status === 'paid' &&
    typeof session.payment_intent === 'string' &&
    session.metadata.expertConnectAccountId
  ) {
    try {
      console.log('Recording payment for future expert transfer:', session.payment_intent);

      // Get the payment intent to verify amount
      const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);

      // Parse metadata values
      const expertAmount = session.metadata.expertAmount
        ? Number.parseInt(session.metadata.expertAmount, 10)
        : Math.round(paymentIntent.amount * 0.85);

      const platformFee = session.metadata.platformFee
        ? Number.parseInt(session.metadata.platformFee, 10)
        : Math.round(paymentIntent.amount * 0.15);

      const requiresApproval = session.metadata.requiresApproval === 'true';

      // Calculate scheduled transfer time (3 hours after session)
      const sessionStartTime = new Date(meetingData.startTime);
      const scheduledTransferTime = new Date(sessionStartTime.getTime() + 3 * 60 * 60 * 1000);

      // Check if we already have a record for this payment intent
      const existingTransfer = await db.query.PaymentTransferTable.findFirst({
        where: ({ paymentIntentId }, { eq }) => eq(paymentIntentId, paymentIntent.id),
      });

      if (existingTransfer) {
        console.log('Payment transfer record already exists:', existingTransfer.id);
      } else {
        // Insert the payment transfer record
        await db.insert(PaymentTransferTable).values({
          paymentIntentId: paymentIntent.id,
          checkoutSessionId: session.id,
          eventId: session.metadata.eventId,
          expertConnectAccountId: session.metadata.expertConnectAccountId,
          expertClerkUserId: meetingData.expertClerkUserId,
          amount: expertAmount,
          platformFee: platformFee,
          currency: session.currency || 'eur',
          sessionStartTime: sessionStartTime,
          scheduledTransferTime: scheduledTransferTime,
          status: requiresApproval ? 'PENDING_APPROVAL' : 'PENDING',
          requiresApproval: requiresApproval,
        });

        console.log('Successfully recorded payment for future transfer to expert', {
          paymentIntentId: paymentIntent.id,
          expertConnectAccountId: session.metadata.expertConnectAccountId,
          amount: expertAmount,
          scheduledTransferTime: scheduledTransferTime.toISOString(),
          requiresApproval: requiresApproval,
        });
      }
    } catch (error) {
      console.error('Error recording payment for expert transfer:', error);
      // Don't throw, so we don't trigger webhook retry - we'll handle this in monitoring
    }
  }

  return { success: true, meetingId: result.meeting?.id };
}

/**
 * Handles webhook events from Stripe for identity verification and Connect accounts
 *
 * @param request The incoming request from Stripe
 * @returns A JSON response indicating success or failure
 */
export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature');

  if (!sig) {
    console.error('Missing Stripe signature in webhook request');
    return NextResponse.json({ error: 'Webhook Error: Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook Error: ${errorMessage}`);
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;
      case 'identity.verification_session.verified':
      case 'identity.verification_session.requires_input': {
        const verificationSession = event.data.object as Stripe.Identity.VerificationSession;

        // For identity verification, we need to find the user by the verification status
        // and extract any related account ID from the metadata
        await handleIdentityVerificationUpdated(verificationSession);
        break;
      }
      case 'checkout.session.completed':
        await handleCheckoutSession(event.data.object as StripeCheckoutSession);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
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
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 },
    );
  }
}
