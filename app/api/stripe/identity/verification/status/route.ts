import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { getIdentityVerificationStatus } from '@/lib/stripe/identity';
import { currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * GET /api/stripe/identity/verification/status
 *
 * Gets the current user's verification status by checking both database and Stripe API
 * This is the single source of truth for verification status across the application
 *
 * @returns 200 - Verification status information
 * @returns 401 - Unauthorized if no user is authenticated
 * @returns 404 - User not found in database
 * @returns 500 - Server error during verification status check
 */
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user record from database
    const dbUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If already verified in database, return that status
    if (dbUser.stripeIdentityVerified) {
      return NextResponse.json({
        verified: true,
        status: 'verified',
        lastUpdated: dbUser.stripeIdentityVerificationLastChecked,
        source: 'database',
      });
    }

    // If user has a verification ID, check status with Stripe
    if (dbUser.stripeIdentityVerificationId) {
      try {
        // Get verification status from Stripe API
        const verificationStatus = await getIdentityVerificationStatus(
          dbUser.stripeIdentityVerificationId,
        );

        // If status has changed or verification is now complete, update database
        if (
          verificationStatus.status !== dbUser.stripeIdentityVerificationStatus ||
          (verificationStatus.status === 'verified' && !dbUser.stripeIdentityVerified)
        ) {
          await db
            .update(UserTable)
            .set({
              stripeIdentityVerified: verificationStatus.status === 'verified',
              stripeIdentityVerificationStatus: verificationStatus.status,
              stripeIdentityVerificationLastChecked: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(UserTable.id, dbUser.id));
        }

        return NextResponse.json({
          verified: verificationStatus.status === 'verified',
          status: verificationStatus.status,
          lastUpdated: verificationStatus.lastUpdated || new Date().toISOString(),
          source: 'stripe_api',
        });
      } catch (error) {
        console.error('Error checking verification with Stripe API:', error);
        // Fall back to database status if API call fails
        return NextResponse.json({
          verified: dbUser.stripeIdentityVerified || false,
          status: dbUser.stripeIdentityVerificationStatus || 'unknown',
          lastUpdated: dbUser.stripeIdentityVerificationLastChecked,
          error: 'Failed to retrieve latest status from Stripe',
          source: 'database_fallback',
        });
      }
    }

    // No verification has been started
    return NextResponse.json({
      verified: false,
      status: 'not_started',
      message: 'Identity verification not started',
      source: 'initial_state',
    });
  } catch (error) {
    console.error('Error getting identity verification status:', error);
    return NextResponse.json(
      { error: 'Failed to get identity verification status' },
      { status: 500 },
    );
  }
}
