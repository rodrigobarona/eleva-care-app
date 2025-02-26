import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { syncStripeDataToKV } from '@/lib/stripe';
import { createMeeting } from '@/server/actions/meetings';
import { NextResponse } from 'next/server';
import type { Stripe } from 'stripe';
import StripeSDK from 'stripe';

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';
export const maxDuration = 60;

const stripe = new StripeSDK(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as StripeSDK.LatestApiVersion,
});

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

  // First, sync stripe customer data to KV
  if (typeof session.customer === 'string') {
    try {
      console.log('Syncing customer data to KV:', session.customer);
      await syncStripeDataToKV(session.customer);
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
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
    }

    // Get the raw body as text
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Received Stripe webhook event:', {
      type: event.type,
      id: event.id,
      timestamp: new Date().toISOString(),
    });

    // Extract customer ID from event data to sync (if applicable)
    let customerId: string | undefined = undefined;

    // Extract customer ID based on event type
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        customerId = typeof session.customer === 'string' ? session.customer : undefined;
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        customerId = typeof subscription.customer === 'string' ? subscription.customer : undefined;
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_failed':
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        customerId = typeof invoice.customer === 'string' ? invoice.customer : undefined;
        break;
      }

      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        customerId =
          typeof paymentIntent.customer === 'string' ? paymentIntent.customer : undefined;
        break;
      }

      default:
        // For events not explicitly handled, we don't need to sync customer data
        break;
    }

    // Sync customer data to KV if customer ID found
    if (customerId) {
      try {
        console.log('Syncing customer data to KV:', customerId);
        await syncStripeDataToKV(customerId).catch((error) => {
          console.error('Error syncing customer data to KV:', error);
          // We still want to process the webhook even if KV sync fails
        });
      } catch (error) {
        console.error('Error preparing to sync customer data:', error);
        // Continue webhook processing even if sync preparation fails
      }
    }

    // Handle specific business logic based on event type
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSession(event.data.object as StripeCheckoutSession);
        break;
      // Add other event handlers as needed
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 success response quickly
    return NextResponse.json({ received: true, status: 'success' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 },
    );
  }
}
