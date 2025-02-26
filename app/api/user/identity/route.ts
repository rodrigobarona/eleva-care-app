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
  let clerkUserId: string | null = null;

  try {
    const { userId } = await auth();
    clerkUserId = userId;
    console.log('Auth check result:', { userId, hasId: !!userId });

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data from database
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    if (!user) {
      console.error('User not found in database:', { clerkUserId: userId });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get Identity verification status if available
    let verificationStatus = null;
    if (user.stripeIdentityVerificationId) {
      try {
        verificationStatus = await getIdentityVerificationStatus(user.stripeIdentityVerificationId);
        console.log('Retrieved verification status:', {
          verificationId: user.stripeIdentityVerificationId,
          status: verificationStatus.status,
        });
      } catch (stripeError) {
        console.error('Error retrieving Stripe Identity verification status:', stripeError);
        // Return unverified status if we encounter an error
        verificationStatus = {
          status: 'error',
          lastUpdated: new Date().toISOString(),
          error: 'Failed to retrieve verification status from Stripe',
        };
      }
    } else {
      // If no verification ID exists, return unverified status
      verificationStatus = {
        status: 'unverified',
        lastUpdated: null,
      };
      console.log('No verification ID found for user:', user.id);
    }

    return NextResponse.json({
      user: {
        id: user.id,
        stripeIdentityVerificationId: user.stripeIdentityVerificationId,
        verified: user.stripeIdentityVerified,
      },
      verificationStatus,
    });
  } catch (error) {
    console.error('Error in user identity API:', {
      error,
      clerkUserId,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
