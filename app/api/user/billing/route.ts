import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { getStripeConnectAccountStatus } from '@/lib/stripe';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Mark route as dynamic
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const { userId } = await auth();
    console.log('Auth check result:', { userId, hasId: !!userId });

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data from database
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get Stripe account status if connected
    let accountStatus = null;
    if (user.stripeConnectAccountId) {
      try {
        accountStatus = await getStripeConnectAccountStatus(user.stripeConnectAccountId);
      } catch (stripeError) {
        console.error('Error retrieving Stripe Connect account status:', stripeError);
        // Return partial response instead of failing completely
        return NextResponse.json({
          user: {
            id: user.id,
            stripeConnectAccountId: user.stripeConnectAccountId,
          },
          accountStatus: null,
          stripeError: 'Failed to retrieve account status from Stripe',
        });
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        stripeConnectAccountId: user.stripeConnectAccountId,
      },
      accountStatus,
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
