import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { getIdentityVerificationStatus } from '@/lib/stripe/identity';
import { currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * GET /api/stripe/identity/status
 *
 * Gets the status of the current user's Stripe Identity verification
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

    if (!dbUser.stripeIdentityVerificationId) {
      return NextResponse.json({
        verified: false,
        status: 'not_started',
        message: 'Identity verification not started',
      });
    }

    // Get verification status
    const verificationStatus = await getIdentityVerificationStatus(
      dbUser.stripeIdentityVerificationId,
    );

    // Update the database with the latest status
    await db
      .update(UserTable)
      .set({
        stripeIdentityVerified: verificationStatus.status === 'verified',
        stripeIdentityVerificationStatus: verificationStatus.status,
        stripeIdentityVerificationLastChecked: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(UserTable.id, dbUser.id));

    return NextResponse.json({
      verified: verificationStatus.status === 'verified',
      status: verificationStatus.status,
      lastUpdated: verificationStatus.lastUpdated,
    });
  } catch (error) {
    console.error('Error getting identity verification status:', error);
    return NextResponse.json(
      { error: 'Failed to get identity verification status' },
      { status: 500 },
    );
  }
}
