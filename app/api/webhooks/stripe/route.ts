import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { createMeeting } from '@/server/actions/meetings';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Stripe } from 'stripe';
import StripeSDK from 'stripe';

// Add route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'auto';
export const maxDuration = 60;

const stripe = new StripeSDK(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});

// Make sure to use the correct webhook secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
}

// Maximum number of retries for database operations
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

interface MeetingMetadata {
  timezone: string;
  startTime: string;
  guestEmail: string;
  guestName: string;
  guestNotes?: string;
  expertClerkUserId: string;
}

interface StripeCheckoutSession extends Stripe.Checkout.Session {
  application_fee_amount: number | null;
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

  console.log('Meeting creation result:', {
    success: !result.error,
    error: result.error,
    code: result.code,
    meetingId: result.meeting?.id,
    metadata: meetingData,
    timestamp: new Date().toISOString(),
  });

  if (result.error) {
    if (result.code === 'SLOT_ALREADY_BOOKED' && session.payment_status === 'paid') {
      // Initiate refund if payment was successful
      try {
        if (typeof session.payment_intent === 'string') {
          const refund = await stripe.refunds.create({
            payment_intent: session.payment_intent,
            reason: 'duplicate',
          });
          console.log('Initiated refund for double booking:', {
            sessionId: session.id,
            refundId: refund.id,
          });
        }
      } catch (refundError) {
        console.error('Error initiating refund:', refundError);
      }
    }

    throw new Error(`Meeting creation failed: ${result.code}`);
  }

  // Schedule payout if payment is successful
  if (session.payment_status === 'paid') {
    await scheduleConnectPayout(session, meetingData);
  }

  return { success: true, meetingId: result.meeting?.id };
}

async function scheduleConnectPayout(session: StripeCheckoutSession, meetingData: MeetingMetadata) {
  if (!session.payment_intent || typeof session.payment_intent !== 'string') {
    throw new Error('Missing payment intent');
  }

  // Get the payment intent to access transfer data
  const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
  const connectAccountId = paymentIntent.transfer_data?.destination;

  if (!connectAccountId || typeof connectAccountId !== 'string') {
    throw new Error('Missing or invalid Connect account ID');
  }

  // Calculate payout schedule (4 hours after meeting)
  const meetingStartTime = new Date(meetingData.startTime);
  const payoutScheduleTime = new Date(meetingStartTime.getTime() + 4 * 60 * 60 * 1000);

  // First create a transfer to move funds to the connected account
  const transfer = await stripe.transfers.create({
    amount: session.amount_total ?? 0,
    currency: STRIPE_CONFIG.CURRENCY,
    destination: connectAccountId,
    source_transaction: session.payment_intent,
    metadata: {
      meetingId: session.metadata?.eventId ?? null,
      expertClerkUserId: meetingData.expertClerkUserId,
      customerName: meetingData.guestName,
      customerEmail: meetingData.guestEmail,
      meetingStartTime: meetingData.startTime,
      meetingTimezone: meetingData.timezone,
      payoutScheduledFor: payoutScheduleTime.toISOString(),
    },
  });

  // Then schedule a delayed payout
  const payout = await stripe.payouts.create(
    {
      amount: session.amount_total ?? 0,
      currency: STRIPE_CONFIG.CURRENCY,
      metadata: {
        transfer_id: transfer.id,
        meetingId: session.metadata?.eventId ?? null,
        expertClerkUserId: meetingData.expertClerkUserId,
        customerName: meetingData.guestName,
        customerEmail: meetingData.guestEmail,
        meetingStartTime: meetingData.startTime,
        meetingTimezone: meetingData.timezone,
        payoutScheduledFor: payoutScheduleTime.toISOString(),
      },
      statement_descriptor: `Payout for meeting with ${meetingData.guestName}`,
    },
    {
      stripeAccount: connectAccountId,
    },
  );

  console.log('Scheduled payout for meeting:', {
    transferId: transfer.id,
    payoutId: payout.id,
    eventId: session.metadata?.eventId,
    expertId: meetingData.expertClerkUserId,
    customerName: meetingData.guestName,
    amount: session.amount_total,
    currency: STRIPE_CONFIG.CURRENCY,
    payoutScheduleTime: payoutScheduleTime.toISOString(),
  });

  return { transfer, payout };
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    console.log('Received webhook event:', {
      type: event.type,
      id: event.id,
      timestamp: new Date().toISOString(),
    });

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as StripeCheckoutSession;

      console.log('Processing completed checkout session:', {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        metadata: session.metadata,
      });

      let lastError: Error | unknown;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const result = await handleCheckoutSession(session);
          return NextResponse.json(result);
        } catch (error) {
          lastError = error;
          console.error('Error processing checkout session:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            attempt,
            sessionId: session.id,
            timestamp: new Date().toISOString(),
          });

          if (attempt < MAX_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          }
        }
      }

      console.error('Error processing webhook:', {
        eventType: event.type,
        error: lastError instanceof Error ? lastError.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ error: 'Failed to process checkout session' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 });
  }
}
