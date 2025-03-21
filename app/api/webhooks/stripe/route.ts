import { getMinimumPayoutDelay, STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { PaymentTransferTable } from '@/drizzle/schema';
import { createMeeting } from '@/server/actions/meetings';
import { ensureFullUserSynchronization } from '@/server/actions/user-sync';
import { eq } from 'drizzle-orm';
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
    expertClerkUserId?: string;
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
  payment_intent: string | null;
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

  // Extract metadata from session
  const eventId = session.metadata?.eventId || '';
  const expertConnectAccountId = session.metadata?.expertConnectAccountId || '';
  const expertClerkUserId = session.metadata?.expertClerkUserId || '';
  const sessionStartTime = session.metadata?.sessionStartTime
    ? new Date(session.metadata.sessionStartTime)
    : new Date();
  const platformFee = session.metadata?.platformFee
    ? Number.parseInt(session.metadata.platformFee, 10)
    : 0;

  if (!eventId || !expertConnectAccountId) {
    console.warn('Missing required metadata in checkout session', session.id);
    return new Response('Missing metadata', { status: 400 });
  }

  // Get country for the expert's Connect account
  let expertCountry = 'PT'; // Default fallback
  try {
    const connectAccount = await stripe.accounts.retrieve(expertConnectAccountId);
    expertCountry = connectAccount.country || 'PT';
  } catch (error) {
    console.warn(`Could not retrieve expert country, using default: ${expertCountry}`, error);
  }

  // Record payment received date (now)
  const paymentReceivedDate = new Date();

  // Get minimum payout delay required by Stripe for this country
  const requiredPayoutDelay = getMinimumPayoutDelay(expertCountry);

  // Calculate session duration (default to 1 hour if not specified)
  const sessionDurationMs = 60 * 60 * 1000; // 1 hour in milliseconds

  // Calculate how many days between payment and session
  const paymentAgingDays = Math.max(
    0,
    Math.floor(
      (sessionStartTime.getTime() - paymentReceivedDate.getTime()) / (24 * 60 * 60 * 1000),
    ),
  );

  // Calculate the remaining required delay after session
  // Ensure at least 1 day after session, but respect remaining Stripe requirements
  const remainingDelayDays = Math.max(1, requiredPayoutDelay - paymentAgingDays);

  // Set transfer date based on session date plus remaining delay
  const scheduledTransferTime = new Date(
    sessionStartTime.getTime() + sessionDurationMs + remainingDelayDays * 24 * 60 * 60 * 1000,
  );

  // Set to 4 AM on the scheduled day (matching CRON job time)
  scheduledTransferTime.setHours(4, 0, 0, 0);

  console.log('Scheduled payout with payment aging consideration:', {
    paymentReceivedDate: paymentReceivedDate.toISOString(),
    sessionStartTime: sessionStartTime.toISOString(),
    expertCountry,
    requiredPayoutDelay,
    paymentAgingDays,
    remainingDelayDays,
    scheduledTransferTime: scheduledTransferTime.toISOString(),
  });

  // Check if a payment transfer record already exists for this session
  const existingTransfer = await db.query.PaymentTransferTable.findFirst({
    where: eq(PaymentTransferTable.checkoutSessionId, session.id),
  });

  if (existingTransfer) {
    console.log(`Transfer record already exists for session ${session.id}`);
  } else {
    // Create a payment transfer record with proper null handling
    await db.insert(PaymentTransferTable).values({
      paymentIntentId: session.payment_intent || '',
      checkoutSessionId: session.id,
      eventId,
      expertConnectAccountId,
      expertClerkUserId,
      amount: (session.amount_total || 0) - platformFee,
      platformFee,
      currency: session.currency || 'eur',
      sessionStartTime,
      scheduledTransferTime,
      status: 'PENDING',
      requiresApproval: session.metadata?.requiresApproval === 'true',
      created: new Date(),
      updated: new Date(),
    });
    console.log(`Created payment transfer record for session ${session.id}`);
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
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not defined');
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
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
