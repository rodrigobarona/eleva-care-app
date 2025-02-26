import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

// Initialize Stripe with API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

// Update the interface to match Stripe's types more accurately
interface ExtendedVerificationSession
  extends Omit<Stripe.Identity.VerificationSession, 'last_error'> {
  last_verified_at?: number;
  last_error?: {
    created?: number;
    message?: string;
  } | null;
}

/**
 * Creates a new identity verification session for the current user
 *
 * @returns URL to the identity verification page and session ID
 */
export async function createIdentityVerificationSession() {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Get user data from database
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    if (!user) {
      throw new Error('User not found in database');
    }

    // Create a new verification session
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        userId: user.id,
        clerkUserId: userId,
        email: user.email,
      },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/identity?session_completed=true`,
    });

    // Update user record with verification session ID
    await db
      .update(UserTable)
      .set({
        stripeIdentityVerificationId: verificationSession.id,
        updatedAt: new Date(),
      })
      .where(eq(UserTable.id, user.id));

    return {
      url: verificationSession.url,
      sessionId: verificationSession.id,
    };
  } catch (error) {
    console.error('Failed to create identity verification session:', error);
    throw error;
  }
}

/**
 * Retrieves the status of an identity verification session
 *
 * @param verificationId ID of the verification session to check
 * @returns Object containing status and last updated timestamp
 */
export async function getIdentityVerificationStatus(verificationId: string) {
  try {
    const verificationSession = await stripe.identity.verificationSessions.retrieve(verificationId);
    const extendedSession = verificationSession as unknown as ExtendedVerificationSession;

    // Map Stripe status to our application status
    let status: 'unverified' | 'pending' | 'verified' | 'rejected';
    switch (extendedSession.status) {
      case 'verified':
        status = 'verified';
        break;
      case 'requires_input':
      case 'processing':
        status = 'pending';
        break;
      case 'canceled':
        status = 'unverified';
        break;
      default:
        status = 'rejected';
    }

    return {
      status,
      lastUpdated: extendedSession.last_error?.created
        ? new Date(extendedSession.last_error.created * 1000).toISOString()
        : extendedSession.last_verified_at
          ? new Date(extendedSession.last_verified_at * 1000).toISOString()
          : new Date(extendedSession.created * 1000).toISOString(),
      details: extendedSession.last_error?.message,
    };
  } catch (error) {
    console.error('Failed to retrieve identity verification status:', error);
    throw error;
  }
}

/**
 * Updates the verification status of the current user from Stripe
 */
export async function updateVerificationStatus() {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Get user data
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    if (!user || !user.stripeIdentityVerificationId) {
      throw new Error('User has no active verification session');
    }

    // Fetch status from Stripe
    const verificationStatus = await getIdentityVerificationStatus(
      user.stripeIdentityVerificationId,
    );

    // Update user record with latest status
    await db
      .update(UserTable)
      .set({
        stripeIdentityVerified: verificationStatus.status === 'verified',
        updatedAt: new Date(),
      })
      .where(eq(UserTable.id, user.id));

    return verificationStatus;
  } catch (error) {
    console.error('Failed to update verification status:', error);
    throw error;
  }
}
