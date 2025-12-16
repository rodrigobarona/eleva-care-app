import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Mark route as dynamic

/**
 * This endpoint forces a verification status update for a user's Stripe Connect account.
 * It should only be used by administrators to fix accounts that are stuck in an inconsistent state.
 *
 * Required query parameters:
 * - workosUserId: The Clerk user ID of the user
 * - adminKey: A secret key to prevent unauthorized access (should match INTERNAL_ADMIN_KEY env var)
 */
export async function POST(request: Request) {
  try {
    // Get the clerk user ID and admin key from the query parameters
    const url = new URL(request.url);
    const workosUserId = url.searchParams.get('workosUserId');
    const adminKey = url.searchParams.get('adminKey');

    // Validate admin key to prevent unauthorized access
    if (!adminKey || adminKey !== process.env.INTERNAL_ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    if (!workosUserId) {
      return NextResponse.json({ error: 'Missing workosUserId parameter' }, { status: 400 });
    }

    // Verify this is a valid user in our system
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, workosUserId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.stripeConnectAccountId) {
      return NextResponse.json({ error: 'User has no Stripe Connect account' }, { status: 400 });
    }

    if (!user.stripeIdentityVerificationId) {
      return NextResponse.json({ error: 'User has no Identity verification ID' }, { status: 400 });
    }

    console.log('Force-verifying Connect account for user:', {
      workosUserId,
      userId: user.id,
      email: user.email,
      connectAccountId: user.stripeConnectAccountId,
      identityVerificationId: user.stripeIdentityVerificationId,
    });

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
    });

    // Get the current account status
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

    // Update the Connect account with verification status
    await stripe.accounts.update(user.stripeConnectAccountId, {
      individual: {
        first_name: 'VERIFIED_BY_PLATFORM',
        last_name: 'VERIFIED_BY_PLATFORM',
        verification: {
          document: {
            back: undefined,
            front: undefined,
          },
        },
      },
      metadata: {
        ...account.metadata,
        identity_verified: 'true',
        identity_verified_at: new Date().toISOString(),
        identity_verification_id: user.stripeIdentityVerificationId,
        force_verified: 'true',
        force_verified_at: new Date().toISOString(),
      },
    });

    // Verify the update worked by retrieving the account again
    const updatedAccount = await stripe.accounts.retrieve(user.stripeConnectAccountId);

    // Mark the user as verified in our database
    await db
      .update(UsersTable)
      .set({
        stripeIdentityVerified: true,
        stripeIdentityVerificationStatus: 'verified',
        stripeIdentityVerificationLastChecked: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(UsersTable.id, user.id));

    return NextResponse.json({
      success: true,
      message: 'Account force-verified successfully',
      user: {
        email: user.email,
        connectAccountId: user.stripeConnectAccountId,
        identityVerificationId: user.stripeIdentityVerificationId,
        verificationStatus: updatedAccount.individual?.verification?.status,
      },
      account: {
        detailsSubmitted: updatedAccount.details_submitted,
        chargesEnabled: updatedAccount.charges_enabled,
        payoutsEnabled: updatedAccount.payouts_enabled,
      },
    });
  } catch (error) {
    console.error('Error force-verifying Connect account:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
