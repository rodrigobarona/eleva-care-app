import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import {
  createStripeConnectAccount,
  getConnectAccountBalance,
  getStripeConnectSetupOrLoginLink,
} from '@/lib/stripe';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Check if user already has a Connect account
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    if (user?.stripeConnectAccountId) {
      // User already has a Connect account, return the setup/login link
      const url = await getStripeConnectSetupOrLoginLink(user.stripeConnectAccountId);
      return NextResponse.json({ url });
    }

    // Create a new Connect account
    const { accountId } = await createStripeConnectAccount(email, country);

    // Update user record with Connect account ID
    await db
      .update(UserTable)
      .set({
        stripeConnectAccountId: accountId,
        updatedAt: new Date(),
      })
      .where(eq(UserTable.clerkUserId, userId));

    // Get the setup link for the new account
    const url = await getStripeConnectSetupOrLoginLink(accountId);

    return NextResponse.json({ accountId, url });
  } catch (error) {
    console.error('Error in Connect account creation:', error);
    return NextResponse.json({ error: 'Failed to create Connect account' }, { status: 500 });
  }
}

export async function GET() {
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
