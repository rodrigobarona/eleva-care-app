import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { getIdentityVerificationStatus } from '@/lib/stripe/identity';
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

    // Get Identity verification status if available
    let verificationStatus = null;
    if (user.stripeIdentityVerificationId) {
      try {
        verificationStatus = await getIdentityVerificationStatus(user.stripeIdentityVerificationId);
      } catch (stripeError) {
        console.error('Error retrieving Stripe Identity verification status:', stripeError);
        // Return partial response instead of failing completely
        return NextResponse.json({
          user: {
            id: user.id,
            stripeIdentityVerificationId: user.stripeIdentityVerificationId,
          },
          verificationStatus: null,
          stripeError: 'Failed to retrieve verification status from Stripe',
        });
      }
    } else {
      // If no verification ID exists, return unverified status
      verificationStatus = {
        status: 'unverified',
        lastUpdated: null,
      };
    }

    return NextResponse.json({
      user: {
        id: user.id,
        stripeIdentityVerificationId: user.stripeIdentityVerificationId,
      },
      verificationStatus,
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
