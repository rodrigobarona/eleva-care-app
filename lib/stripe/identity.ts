import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

import { getBaseUrl, getServerStripe } from '../stripe';

/**
 * Creates a Stripe Identity verification session
 * This is the first step in the expert verification process
 *
 * @param userId - Database user ID
 * @param clerkUserId - Clerk user ID for authentication
 * @param email - User's email address
 * @returns Object containing success status and session details
 */
export async function createIdentityVerification(
  userId: string,
  clerkUserId: string,
  email: string,
): Promise<{
  success: boolean;
  status?: string;
  verificationId?: string;
  redirectUrl?: string | null;
  message?: string;
  error?: string;
}> {
  const stripe = await getServerStripe();
  const baseUrl = getBaseUrl();

  try {
    // Check if user already has an active verification
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, clerkUserId),
    });

    if (user?.stripeIdentityVerificationId) {
      // Check the status of the existing verification
      const verificationStatus = await getIdentityVerificationStatus(
        user.stripeIdentityVerificationId,
      );

      if (verificationStatus.status === 'verified') {
        return {
          success: true,
          status: verificationStatus.status,
          verificationId: user.stripeIdentityVerificationId,
          redirectUrl: null,
          message: 'Identity already verified',
        };
      }
    }

    // Create a new verification session
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: {
        userId,
        clerkUserId,
        email,
        created_at: new Date().toISOString(),
      },
      return_url: `${baseUrl}/account/identity/callback`,
    });

    // Store the verification session ID in the database
    await db
      .update(UserTable)
      .set({
        stripeIdentityVerificationId: verificationSession.id,
        stripeIdentityVerificationStatus: verificationSession.status,
        stripeIdentityVerificationLastChecked: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(UserTable.clerkUserId, clerkUserId));

    return {
      success: true,
      status: verificationSession.status,
      verificationId: verificationSession.id,
      redirectUrl: verificationSession.url,
      message: 'Identity verification created successfully',
    };
  } catch (error) {
    console.error('Error creating identity verification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Gets the status of a Stripe Identity verification session
 *
 * @param verificationId - Stripe verification session ID
 * @returns Object containing status information
 */
export async function getIdentityVerificationStatus(verificationId: string): Promise<{
  status: string;
  lastUpdated: string | undefined;
  details?: string;
}> {
  const stripe = await getServerStripe();

  try {
    const verificationSession = await stripe.identity.verificationSessions.retrieve(verificationId);

    // We access the status directly since it's part of the standard API
    const status = verificationSession.status;

    // For timestamps and other properties that might not be properly typed,
    // we use a more specific type definition
    let lastUpdated: string | undefined = undefined;

    // Define more specific types for stripe object properties
    type StripeTimestamp = number;
    interface StripeError {
      message?: string;
      code?: string;
    }

    // Type cast for accessing properties safely
    const stripeSession = verificationSession as Stripe.Identity.VerificationSession & {
      created: StripeTimestamp;
      last_error?: StripeError;
    };

    // Get timestamp
    if (stripeSession.created) {
      lastUpdated = new Date(stripeSession.created * 1000).toISOString();
    }

    return {
      status,
      lastUpdated,
      details: stripeSession.last_error?.message,
    };
  } catch (error) {
    console.error('Error retrieving verification status:', error);
    throw error;
  }
}

/**
 * Creates a Connect account using verified identity information
 * This should be called after identity verification is complete
 *
 * @param clerkUserId - Clerk user ID for authentication
 * @param email - User's email address
 * @param country - Two-letter country code
 * @returns Object containing success status and account details
 */
export async function createConnectAccountWithVerifiedIdentity(
  clerkUserId: string,
  email: string,
  country: string,
): Promise<{
  success: boolean;
  accountId?: string;
  detailsSubmitted?: boolean;
  onboardingUrl?: string;
  error?: string;
}> {
  const stripe = await getServerStripe();
  const baseUrl = getBaseUrl();

  try {
    // Get the user from the database
    const user = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, clerkUserId),
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if the user has a verified identity
    if (!user.stripeIdentityVerificationId) {
      throw new Error('User has not completed identity verification');
    }

    // Get verification status
    const verificationStatus = await getIdentityVerificationStatus(
      user.stripeIdentityVerificationId,
    );

    if (verificationStatus.status !== 'verified') {
      throw new Error(`Identity verification is not complete: ${verificationStatus.status}`);
    }

    // Create the Connect account using the verified identity
    const account = await stripe.accounts.create({
      type: 'express',
      country: country.toUpperCase(),
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      settings: {
        payouts: {
          schedule: {
            interval: 'daily',
            delay_days: 0,
          },
        },
      },
      metadata: {
        clerkUserId,
        identity_verified: 'true',
        identity_verified_at: new Date().toISOString(),
        identity_verification_id: user.stripeIdentityVerificationId,
      },
    });

    // Update the user record with the Connect account ID
    await db
      .update(UserTable)
      .set({
        stripeConnectAccountId: account.id,
        stripeConnectDetailsSubmitted: account.details_submitted,
        stripeConnectPayoutsEnabled: account.payouts_enabled,
        stripeConnectChargesEnabled: account.charges_enabled,
        updatedAt: new Date(),
      })
      .where(eq(UserTable.clerkUserId, clerkUserId));

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/account/billing?refresh=true`,
      return_url: `${baseUrl}/account/billing?success=true`,
      type: 'account_onboarding',
      collect: 'eventually_due',
    });

    return {
      success: true,
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      onboardingUrl: accountLink.url,
    };
  } catch (error) {
    console.error('Error creating Connect account with verified identity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
