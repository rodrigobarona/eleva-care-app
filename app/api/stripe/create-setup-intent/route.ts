import { STRIPE_CONFIG } from '@/config/stripe';
import { ensureFullUserSynchronization } from '@/server/actions/user-sync';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

export async function POST() {
  try {
    // Get authenticated user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user is fully synchronized across systems
    const user = await ensureFullUserSynchronization(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Make sure user has a Stripe customer ID
    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: 'User does not have a Stripe customer ID' },
        { status: 400 },
      );
    }

    // Create a SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: user.stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session', // Allow the payment method to be used for future payments
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    return NextResponse.json(
      {
        error: 'Failed to create setup intent',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
