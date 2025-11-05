import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema-workos';
import { getStripeConnectSetupOrLoginLink } from '@/lib/integrations/stripe';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('Starting dashboard route handler');

    const { userId } = await auth();
    console.log('Auth check completed', { userId });

    if (!userId) {
      console.log('No userId found in auth');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Stripe Connect account ID
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, userId),
    });
    console.log('User query completed', {
      found: !!user,
      hasConnectAccount: !!user?.stripeConnectAccountId,
      connectAccountId: user?.stripeConnectAccountId,
      connectDetailsSubmitted: user?.stripeConnectDetailsSubmitted,
      connectChargesEnabled: user?.stripeConnectChargesEnabled,
      connectPayoutsEnabled: user?.stripeConnectPayoutsEnabled,
    });

    if (!user?.stripeConnectAccountId) {
      return NextResponse.json({ error: 'No Stripe Connect account found' }, { status: 404 });
    }

    try {
      // Get the appropriate URL (setup or login link)
      console.log('Attempting to create Stripe link', { accountId: user.stripeConnectAccountId });
      const url = await getStripeConnectSetupOrLoginLink(user.stripeConnectAccountId);
      console.log('Successfully created Stripe link');
      return NextResponse.json({ url });
    } catch (stripeError) {
      console.error('Stripe link creation failed', {
        error: stripeError,
        accountId: user.stripeConnectAccountId,
        errorMessage: stripeError instanceof Error ? stripeError.message : 'Unknown error',
      });
      throw stripeError;
    }
  } catch (error) {
    console.error('Dashboard route handler failed', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to get Stripe dashboard URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
