import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { PaymentTransferTable, UserTable } from '@/drizzle/schema';
import { syncStripeDataToKV } from '@/lib/stripe';
import { createMeeting } from '@/server/actions/meetings';
import { ensureFullUserSynchronization } from '@/server/actions/user-sync';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

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

export async function POST(request: Request) {
  try {
    // Log the request info (useful for debugging)
    console.log('Received webhook request to /api/webhooks/stripe');

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
    }

    // Get the raw body as text
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature header');
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
    let clerkUserId: string | undefined = undefined;

    // Extract customer ID based on event type
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        customerId = typeof session.customer === 'string' ? session.customer : undefined;
        clerkUserId = session.metadata?.clerkUserId;
        break;
      }

      case 'customer.created':
      case 'customer.updated':
      case 'customer.deleted': {
        const customer = event.data.object as Stripe.Customer;
        customerId = customer.id;
        clerkUserId = customer.metadata?.userId as string | undefined;
        console.log(`Handling ${event.type} event:`, {
          customerId,
          clerkUserId,
          name: customer.name,
          email: customer.email,
        });
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
        clerkUserId = paymentIntent.metadata?.clerkUserId;
        break;
      }

      default:
        // For events not explicitly handled, we don't need to sync customer data
        break;
    }

    // If we have a Clerk user ID, prioritize full synchronization
    if (clerkUserId) {
      try {
        console.log('Ensuring full user synchronization:', clerkUserId);
        await ensureFullUserSynchronization(clerkUserId);
      } catch (error) {
        console.error('Error syncing user data:', error);
        // Continue webhook processing even if sync fails
      }
    }
    // Otherwise fall back to Stripe-only sync
    else if (customerId) {
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
      // Handle identity verification events by delegating to the appropriate handler
      case 'identity.verification_session.verified':
      case 'identity.verification_session.requires_input':
      case 'identity.verification_session.processing':
      case 'identity.verification_session.created':
        // Import and call the identity handler function
        try {
          console.log('Forwarding identity event to identity handler:', event.type);
          // We can't directly import route handlers, so handle the identity event here
          // The user should have both webhooks set up in Stripe
          console.log('Identity verification event received via main webhook.', {
            type: event.type,
            sessionId: (event.data.object as Stripe.Identity.VerificationSession).id,
            metadata: (event.data.object as Stripe.Identity.VerificationSession).metadata,
          });

          // Update user if we can find them by metadata
          const verificationSession = event.data.object as Stripe.Identity.VerificationSession;
          if (verificationSession.metadata?.clerkUserId) {
            const clerkUserId = verificationSession.metadata.clerkUserId as string;
            console.log('Found clerk user ID in metadata:', clerkUserId);

            // Update the user's verification status
            try {
              const user = await db.query.UserTable.findFirst({
                where: (user) => eq(user.clerkUserId, clerkUserId),
              });

              if (user) {
                console.log('Updating user verification status:', user.id);
                await db
                  .update(UserTable)
                  .set({
                    stripeIdentityVerificationId: verificationSession.id,
                    stripeIdentityVerified: verificationSession.status === 'verified',
                    stripeIdentityVerificationStatus: verificationSession.status,
                    stripeIdentityVerificationLastChecked: new Date(),
                    updatedAt: new Date(),
                  })
                  .where(eq(UserTable.id, user.id));

                console.log('Successfully updated user verification status');
              } else {
                console.log('No user found with clerk ID:', clerkUserId);
              }
            } catch (error) {
              console.error('Error updating user verification status:', error);
            }
          }
        } catch (error) {
          console.error('Error handling identity event:', error);
          // Continue processing - we don't want to fail the webhook for this
        }
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
