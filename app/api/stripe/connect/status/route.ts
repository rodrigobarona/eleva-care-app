import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 },
      );
    }

    // Fetch user from database to check if they have a Stripe Connect account
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', message: 'User record not found in database' },
        { status: 404 },
      );
    }

    // Import the getServerStripe helper
    const { getServerStripe } = await import('@/lib/stripe');
    const stripe = await getServerStripe();

    // If the user doesn't have a Stripe Connect account, create one
    if (!user.stripeConnectAccountId) {
      // Create a new Stripe Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          clerkUserId: userId,
        },
      });

      // Save the Stripe Connect account ID to the user record
      await db
        .update(UserTable)
        .set({
          stripeConnectAccountId: account.id,
          updatedAt: new Date(),
        })
        .where(eq(UserTable.clerkUserId, userId));

      // Create an account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/expert-onboarding/billing?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/expert-onboarding/billing?onboarding_complete=true`,
        type: 'account_onboarding',
      });

      return NextResponse.json({
        isConnected: true,
        isComplete: false,
        accountLink: accountLink.url,
        pendingRequirements: ['Complete onboarding process'],
      });
    }

    // If the user has a Stripe Connect account, check its status
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

    // Check if the account is complete and ready to accept payments
    const isComplete =
      account.charges_enabled && account.payouts_enabled && account.details_submitted;

    // If the account needs more information, create a new account link
    let accountLink = null;
    let pendingRequirements: string[] = [];

    if (!isComplete) {
      // Create an account link for onboarding
      const link = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/expert-onboarding/billing?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/expert-onboarding/billing?onboarding_complete=true`,
        type: 'account_onboarding',
      });

      accountLink = link.url;

      // Get pending requirements
      if (account.requirements?.currently_due?.length) {
        pendingRequirements = account.requirements.currently_due.map((requirement) => {
          // Convert snake_case to readable format
          return requirement
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        });
      }
    }

    return NextResponse.json({
      isConnected: true,
      isComplete,
      accountLink,
      pendingRequirements,
    });
  } catch (error) {
    console.error('Error fetching Stripe Connect account status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch Stripe account status' },
      { status: 500 },
    );
  }
}
