import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { createIdentityVerification, getIdentityVerificationStatus } from '@/lib/stripe/identity';
import { currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * POST /api/stripe/identity/verification
 *
 * Creates a new Stripe Identity verification session for the current user
 *
 * @returns 200 - Success with redirect URL or verification status
 * @returns 400 - Error from verification creation
 * @returns 401 - Unauthorized if no user is authenticated
 * @returns 404 - User not found in database
 * @returns 500 - Server error during verification creation
 */
export async function POST() {
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

    // Check if user already has an active verification session
    if (dbUser.stripeIdentityVerificationId) {
      console.log(
        `User ${dbUser.id} already has a verification session: ${dbUser.stripeIdentityVerificationId}`,
      );

      // Get the status of the existing verification
      try {
        const verificationStatus = await getIdentityVerificationStatus(
          dbUser.stripeIdentityVerificationId,
        );

        // If already verified, return success with the status
        if (verificationStatus.status === 'verified') {
          return NextResponse.json({
            success: true,
            status: verificationStatus.status,
            verificationId: dbUser.stripeIdentityVerificationId,
            redirectUrl: null,
            message: 'Identity already verified',
          });
        }

        // If session is in a usable state (requires_input or processing), return it
        if (['requires_input', 'processing'].includes(verificationStatus.status)) {
          console.log(
            `Returning existing verification session in status: ${verificationStatus.status}`,
          );
          // We need to retrieve the redirect URL for an existing session
          // For now, create a new session which will replace the existing one
        }

        // For other states (canceled, etc), create a new session
        console.log(
          `Existing verification session is in status ${verificationStatus.status}, creating a new one`,
        );
      } catch (error) {
        console.error(`Error checking existing verification status: ${error}`);
        // If there was an error retrieving the status, we'll create a new session
      }
    }

    // Create verification session
    const result = await createIdentityVerification(
      dbUser.id,
      user.id,
      user.emailAddresses[0]?.emailAddress || dbUser.email,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating identity verification:', error);
    return NextResponse.json({ error: 'Failed to create identity verification' }, { status: 500 });
  }
}
