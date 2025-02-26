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

// Handle POST requests from Stripe webhooks
export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_IDENTITY_WEBHOOK_SECRET) {
      throw new Error('Missing STRIPE_IDENTITY_WEBHOOK_SECRET environment variable');
    }

    // Get the raw body as text
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
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
    });

    // Find the user with this verification ID
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.stripeIdentityVerificationId, verificationId),
    });

    if (!user) {
      console.error('No user found with verification ID:', verificationId);
      return;
    }

    // Get detailed status
    const verificationStatus = await getIdentityVerificationStatus(verificationId);

    // Update user verification status in database
    await db
      .update(UserTable)
      .set({
        stripeIdentityVerified: verificationStatus.status === 'verified',
        updatedAt: new Date(),
      })
      .where(eq(UserTable.id, user.id));

    console.log('Updated user verification status:', {
      userId: user.id,
      status: verificationStatus.status,
    });
  } catch (error) {
    console.error('Error handling verification session event:', error);
    throw error;
  }
}
