import { getIdentityVerificationStatus } from '@/lib/stripe/identity';
import { ensureFullUserSynchronization } from '@/server/actions/user-sync';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Mark route as dynamic

export async function GET() {
  let clerkUserId: string | null = null;

  try {
    const { userId } = await auth();
    clerkUserId = userId;
    console.log('Auth check result:', { userId, hasId: !!userId });

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use our synchronization service to ensure all systems are in sync
    const user = await ensureFullUserSynchronization(userId);

    if (!user) {
      console.error('Failed to synchronize user:', { clerkUserId: userId });
      return NextResponse.json({ error: 'User synchronization failed' }, { status: 500 });
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
