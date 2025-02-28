import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Define an interface for the status object
interface VerificationStatus {
  isVerified: boolean;
  isPending: boolean;
  verificationUrl: string | null;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 },
      );
    }

    // Fetch user from database to check if they have a Stripe identity verification
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', message: 'User record not found in database' },
        { status: 404 },
      );
    }

    // If the user has a verificationId, check its status with Stripe
    let status: VerificationStatus = {
      isVerified: false,
      isPending: false,
      verificationUrl: null,
    };

    if (user.stripeIdentityVerificationId) {
      // Import the getServerStripe helper
      const { getServerStripe } = await import('@/lib/stripe');
      const stripe = await getServerStripe();

      // Fetch the verification session
      const verificationSession = await stripe.identity.verificationSessions.retrieve(
        user.stripeIdentityVerificationId,
      );

      status = {
        isVerified: verificationSession.status === 'verified',
        isPending:
          verificationSession.status === 'processing' ||
          verificationSession.status === 'requires_input',
        verificationUrl: verificationSession.url || null,
      };
    } else {
      // No verification session exists, create a new one
      const { getServerStripe } = await import('@/lib/stripe');
      const stripe = await getServerStripe();

      // Create a new verification session
      const verificationSession = await stripe.identity.verificationSessions.create({
        type: 'document',
        metadata: {
          clerkUserId: userId,
        },
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/expert-onboarding/identity?verification_complete=true`,
      });

      // Save the verification ID to the user record
      await db
        .update(UserTable)
        .set({
          stripeIdentityVerificationId: verificationSession.id,
          updatedAt: new Date(),
        })
        .where(eq(UserTable.clerkUserId, userId));

      status = {
        isVerified: false,
        isPending: false,
        verificationUrl: verificationSession.url || null,
      };
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error checking identity verification status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to check verification status' },
      { status: 500 },
    );
  }
}
