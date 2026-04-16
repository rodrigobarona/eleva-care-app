import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { isExpert } from '@/lib/auth/roles.server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(await isExpert())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const user = await db.query.UserTable.findFirst({
    where: eq(UserTable.clerkUserId, userId),
    columns: {
      stripeConnectAccountId: true,
    },
  });

  if (!user?.stripeConnectAccountId) {
    return NextResponse.json({ error: 'No Stripe Connect account found' }, { status: 404 });
  }

  try {
    const accountSession = await stripe.accountSessions.create({
      account: user.stripeConnectAccountId,
      components: {
        balances: {
          enabled: true,
          features: {
            edit_payout_schedule: false,
            external_account_collection: false,
            standard_payouts: false,
          },
        },
        payouts_list: {
          enabled: true,
        },
      },
    });

    return NextResponse.json(
      {
        clientSecret: accountSession.client_secret,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Failed to create Stripe account session:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize Stripe Connect widgets',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
