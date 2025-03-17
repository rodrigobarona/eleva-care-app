import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { getIdentityVerificationStatus } from '@/lib/stripe/identity';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Add GET handler to quickly return 405 Method Not Allowed
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

// Handle POST requests from Stripe webhooks
export async function POST(request: Request) {
  let eventType = 'unknown';
  let eventId = 'unknown';

  try {
    if (!process.env.STRIPE_IDENTITY_WEBHOOK_SECRET) {
      console.error('Missing STRIPE_IDENTITY_WEBHOOK_SECRET environment variable');
      throw new Error('Missing STRIPE_IDENTITY_WEBHOOK_SECRET environment variable');
    }

    // Get the raw body as text
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
    });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_IDENTITY_WEBHOOK_SECRET,
      );

      eventType = event.type;
      eventId = event.id;
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Received Stripe Identity webhook event:', {
      type: event.type,
      id: event.id,
      timestamp: new Date().toISOString(),
    });

    // Handle identity verification events
    if (event.type.startsWith('identity.verification_session')) {
      await handleVerificationSessionEvent(event);
    }

    return NextResponse.json({ received: true, status: 'success' });
  } catch (error) {
    console.error('Error processing webhook:', {
      error,
      eventType,
      eventId,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: 'Internal server error processing webhook' },
      { status: 500 },
    );
  }
}

async function handleVerificationSessionEvent(event: Stripe.Event) {
  try {
    const session = event.data.object as Stripe.Identity.VerificationSession;
    const verificationId = session.id;

    console.log('Processing verification session event:', {
      sessionId: verificationId,
      status: session.status,
      eventType: event.type,
      metadata: session.metadata,
    });

    // Try to find user by verification ID first
    let user = await db.query.UserTable.findFirst({
      where: eq(UserTable.stripeIdentityVerificationId, verificationId),
    });

    // If no user found by verification ID, check metadata for clerkUserId
    if (!user && session.metadata && session.metadata.clerkUserId) {
      const clerkUserId = session.metadata.clerkUserId as string;
      console.log('Looking up user by Clerk ID from metadata:', clerkUserId);

      user = await db.query.UserTable.findFirst({
        where: eq(UserTable.clerkUserId, clerkUserId),
      });

      // If we found a user, update their verification ID
      if (user) {
        await db
          .update(UserTable)
          .set({
            stripeIdentityVerificationId: verificationId,
            updatedAt: new Date(),
          })
          .where(eq(UserTable.id, user.id));
      }
    }

    if (!user) {
      console.error('No user found for verification session:', {
        verificationId,
        metadata: session.metadata,
      });
      return;
    }

    // Get detailed status
    const verificationStatus = await getIdentityVerificationStatus(verificationId);

    // Update user verification status in database
    await db
      .update(UserTable)
      .set({
        stripeIdentityVerified: verificationStatus.status === 'verified',
        stripeIdentityVerificationStatus: verificationStatus.status,
        stripeIdentityVerificationLastChecked: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(UserTable.id, user.id));

    console.log('Updated user verification status:', {
      userId: user.id,
      clerkUserId: user.clerkUserId,
      status: verificationStatus.status,
    });
  } catch (error) {
    console.error('Error handling verification session event:', error);
    throw error;
  }
}
