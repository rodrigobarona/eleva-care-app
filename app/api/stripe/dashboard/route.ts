import { NextResponse } from 'next/server';

import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { getStripeConnectSetupOrLoginLink } from '@/lib/stripe';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Stripe Connect account ID
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    if (!user?.stripeConnectAccountId) {
      return NextResponse.json({ error: 'No Stripe Connect account found' }, { status: 404 });
    }

    // Get the appropriate URL (setup or login link)
    const url = await getStripeConnectSetupOrLoginLink(user.stripeConnectAccountId);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error getting Stripe dashboard URL:', error);
    return NextResponse.json({ error: 'Failed to get Stripe dashboard URL' }, { status: 500 });
  }
}
