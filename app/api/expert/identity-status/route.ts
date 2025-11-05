import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema-workos';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * Direct API endpoint to check identity verification status from the database
 * GET /api/expert/identity-status
 */
export async function GET() {
  try {
    // Authenticate the user
    const authData = await auth();

    if (!authData.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user record from the database
    const dbUser = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, authData.userId),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    // Check if the user has completed Stripe identity verification
    const isVerified =
      dbUser.stripeIdentityVerificationId && dbUser.stripeIdentityVerified === true;

    // Return the verification status
    return NextResponse.json({
      verified: isVerified,
      verificationId: dbUser.stripeIdentityVerificationId || null,
      // Include additional details that might be useful
      details: {
        hasVerificationId: !!dbUser.stripeIdentityVerificationId,
        isMarkedVerified: dbUser.stripeIdentityVerified === true,
      },
    });
  } catch (error) {
    console.error('Error checking identity verification status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
