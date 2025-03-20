import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { PaymentTransferTable, UserTable } from '@/drizzle/schema';
import { createUserNotification } from '@/lib/notifications';
import { getServerStripe, syncStripeDataToKV } from '@/lib/stripe';
import { markStepCompleteForUser } from '@/server/actions/expert-setup';
import { createMeeting } from '@/server/actions/meetings';
import { ensureFullUserSynchronization } from '@/server/actions/user-sync';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
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

/**
 * Handles webhook events from Stripe for identity verification and Connect accounts
 *
 * @param request The incoming request from Stripe
 * @returns A JSON response indicating success or failure
 */
export async function POST(request: NextRequest) {
  const stripe = await getServerStripe();
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET as string);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook Error: ${errorMessage}`);
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  // Handle the event
  try {
    console.log('Processing webhook event:', event.type, event.id);

    switch (event.type) {
      case 'checkout.session.completed':
        // Handle checkout completion
        await handleCheckoutSession(event.data.object as StripeCheckoutSession);
        break;

      case 'identity.verification_session.verified':
        // Handle identity verification success
        await handleVerificationSessionVerified(
          event.data.object as Stripe.Identity.VerificationSession,
        );
        break;

      case 'identity.verification_session.requires_input':
        // Handle identity verification that needs more information
        await handleVerificationSessionRequiresInput(
          event.data.object as Stripe.Identity.VerificationSession,
        );
        break;

      case 'account.updated':
        // Handle Stripe Connect account updates
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook: ${error}`);
    return NextResponse.json({ error: 'Error processing webhook' }, { status: 500 });
  }
}

/**
 * Handles when a Stripe Identity verification session is verified
 * Updates the user record and marks the identity step as complete
 *
 * @param session The verification session object from Stripe
 */
async function handleVerificationSessionVerified(session: Stripe.Identity.VerificationSession) {
  console.log('Identity verification verified:', session.id);

  // Find the user associated with this verification
  const clerkUserId = session.metadata?.clerkUserId;
  if (!clerkUserId) {
    console.error('No clerk user ID found in verification metadata');
    return;
  }

  // Update user record
  const user = await db.query.UserTable.findFirst({
    where: eq(UserTable.clerkUserId, clerkUserId as string),
  });

  if (!user) {
    console.error('User not found for verification:', clerkUserId);
    return;
  }

  // Update user record
  await db
    .update(UserTable)
    .set({
      stripeIdentityVerified: true,
      stripeIdentityVerificationStatus: 'verified',
      stripeIdentityVerificationLastChecked: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(UserTable.id, user.id));

  // Mark identity step as complete in expert setup
  await markStepCompleteForUser('identity', clerkUserId as string);
}

/**
 * Handles when a Stripe Identity verification session requires additional input
 * Updates the user record with the requires_input status
 *
 * @param session The verification session object from Stripe
 */
async function handleVerificationSessionRequiresInput(
  session: Stripe.Identity.VerificationSession,
) {
  console.log('Identity verification requires input:', session.id);

  const clerkUserId = session.metadata?.clerkUserId;
  if (!clerkUserId) {
    console.error('No clerk user ID found in verification metadata');
    return;
  }

  // Get the current user record to check if this is a repeated requires_input status
  const userRecord = await db.query.UserTable.findFirst({
    where: eq(UserTable.clerkUserId, clerkUserId as string),
  });

  if (!userRecord) {
    console.error('User not found for verification requires_input:', clerkUserId);
    return;
  }

  // Track if this is a repeated requires_input status
  const isRepeatedRequiresInput = userRecord.stripeIdentityVerificationStatus === 'requires_input';

  // Get last error from the verification session if available
  let lastErrorMessage: string | undefined;
  try {
    // Cast to access potential error details
    const sessionWithError = session as unknown as {
      last_error?: { code?: string; message?: string };
    };

    lastErrorMessage = sessionWithError.last_error?.message;
    console.log('Verification error details:', {
      code: sessionWithError.last_error?.code,
      message: lastErrorMessage,
    });
  } catch (error) {
    console.error('Error extracting verification session details:', error);
  }

  // Update user record
  await db
    .update(UserTable)
    .set({
      stripeIdentityVerified: false,
      stripeIdentityVerificationStatus: 'requires_input',
      stripeIdentityVerificationLastChecked: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(UserTable.clerkUserId, clerkUserId as string));

  // If this is a repeated requires_input event or contains specific errors,
  // we should take additional action to help the user
  if (isRepeatedRequiresInput || lastErrorMessage) {
    try {
      // Create a notification in the user's dashboard
      await createUserNotification({
        userId: userRecord.id,
        type: 'VERIFICATION_HELP',
        title: 'Your identity verification needs attention',
        message: getVerificationHelpMessage(lastErrorMessage),
        actionUrl: '/account/identity',
        // Set notification to expire in 7 days
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      console.log('Created dashboard notification for user with verification issues:', {
        clerkUserId,
        userId: userRecord.id,
        isRepeatedRequiresInput,
        lastErrorMessage,
      });

      // Future enhancements:
      // 1. Send an email to the user with guidance
      // 2. Flag for customer support to reach out after multiple failed attempts
    } catch (notificationError) {
      console.error('Failed to send verification help notification:', notificationError);
    }
  }
}

/**
 * Generate a helpful message based on the error type
 */
function getVerificationHelpMessage(errorMessage?: string): string {
  // If no specific error, provide general guidance
  if (!errorMessage) {
    return "We noticed you're having trouble completing your identity verification. Please try again with the following tips:\n\n• Use a well-lit environment\n• Ensure your ID is fully visible\n• Remove any coverings or glare from your ID\n• Look directly at the camera for selfie verification";
  }

  // Check for common error types and provide specific guidance
  if (errorMessage.includes('document')) {
    return "There was an issue with your ID document. Please ensure it's not expired, is fully visible in the frame, and there's no glare or obstruction covering important information.";
  }

  if (errorMessage.includes('selfie') || errorMessage.includes('face')) {
    return "There was an issue with your selfie verification. Please ensure you're in a well-lit environment, looking directly at the camera, and that your face is fully visible without sunglasses or other coverings.";
  }

  if (errorMessage.includes('match')) {
    return "The system couldn't match your selfie to your ID photo. Please ensure both are clear, well-lit, and show your face clearly without obstructions.";
  }

  // Default guidance with the actual error included
  return `We encountered an issue with your identity verification: "${errorMessage}". Please try again and ensure you're following all instructions carefully.`;
}

/**
 * Handles when a Stripe Connect account is updated
 * Updates the user record with the latest account status
 * If the account is fully enabled, marks the payment step as complete
 *
 * @param account The account object from Stripe
 */
async function handleAccountUpdated(account: Stripe.Account) {
  console.log('Connect account updated:', account.id);

  // Find the user associated with this account
  const user = await db.query.UserTable.findFirst({
    where: eq(UserTable.stripeConnectAccountId, account.id),
  });

  if (!user) {
    console.error('User not found for Connect account:', account.id);
    return;
  }

  // Update user record
  await db
    .update(UserTable)
    .set({
      stripeConnectDetailsSubmitted: account.details_submitted,
      stripeConnectPayoutsEnabled: account.payouts_enabled,
      stripeConnectChargesEnabled: account.charges_enabled,
      updatedAt: new Date(),
    })
    .where(eq(UserTable.id, user.id));

  // If account is fully enabled, mark payment step as complete
  if (account.charges_enabled && account.payouts_enabled) {
    await markStepCompleteForUser('payment', user.clerkUserId);
  }
}
