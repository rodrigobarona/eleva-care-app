import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    let email: string;
    let country: string;

    try {
      const body = await request.json();
      email = body.email;
      country = body.country;

      if (!email || !country) {
        return NextResponse.json({ error: 'Email and country are required' }, { status: 400 });
      }
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Check if user already has a Connect account in our database
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    let accountId = user?.stripeConnectAccountId;
    const connectAccountParams: Stripe.AccountCreateParams = {
      type: 'express',
      email,
      country,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      settings: {
        payouts: {
          schedule: {
            interval: 'manual',
          },
        },
      },
    };

    // If user doesn't have a Connect account yet, create one
    if (!accountId) {
      const account = await stripe.accounts.create(connectAccountParams);
      accountId = account.id;

      // Save the Connect account ID to our database
      await db
        .update(UserTable)
        .set({
          stripeConnectAccountId: accountId,
          updatedAt: new Date(),
        })
        .where(eq(UserTable.clerkUserId, userId));
    }

    // Create an account link for embedded onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/billing?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/billing?success=true`,
      type: 'account_onboarding',
      collect: 'eventually_due',
    });

    // Extract the client secret from the account link URL
    // The URL is in format: https://connect.stripe.com/setup/s/ACT_xxxxxxxxxxxx
    const clientSecret = accountLink.url.split('/').pop();

    return NextResponse.json({
      accountId,
      clientSecret,
    });
  } catch (error) {
    console.error('Error creating embedded Connect session:', error);
    return NextResponse.json(
      {
        error: 'Failed to create Connect onboarding session',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
