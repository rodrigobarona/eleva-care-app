import { NextResponse } from 'next/server';

import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { createStripeConnectAccount, getConnectAccountBalance } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, country } = await request.json();
    const { accountId } = await createStripeConnectAccount(email, country);

    // Update user record with Connect account ID
    await db
      .update(UserTable)
      .set({
        stripeConnectAccountId: accountId,
        updatedAt: new Date(),
      })
      .where(eq(UserTable.clerkUserId, userId));

    return NextResponse.json({ accountId });
  } catch (error) {
    console.error('Error in Connect account creation:', error);
    return NextResponse.json({ error: 'Failed to create Connect account' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    if (!user?.stripeConnectAccountId) {
      return NextResponse.json({ error: 'No Connect account found' }, { status: 404 });
    }

    const balance = await getConnectAccountBalance(user.stripeConnectAccountId);
    return NextResponse.json({ balance });
  } catch (error) {
    console.error('Error fetching Connect account balance:', error);
    return NextResponse.json({ error: 'Failed to fetch Connect account balance' }, { status: 500 });
  }
}
