'use server';

import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { getCachedUserById } from '@/lib/cache/clerk-cache';
import { invalidateUserCache } from '@/lib/cache/clerk-cache-utils';
import {
  createStripeConnectAccount,
  getStripeConnectSetupOrLoginLink,
} from '@/lib/integrations/stripe';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_CONFIG.API_VERSION as Stripe.LatestApiVersion,
});

/**
 * @fileoverview Server actions for managing Stripe Connect integration in the Eleva Care application.
 * This file handles the creation and management of Stripe Connect accounts for experts,
 * enabling them to receive payments through the platform. It provides functionality for
 * account creation, login link generation, and account management.

 * Initiates the Stripe Connect account creation process for an expert.
 *
 * This function:
 * 1. Validates the user exists in both Clerk and our database
 * 2. Gets or sets the user's country from Clerk metadata
 * 3. Creates a Stripe Connect account for the expert
 * 4. Updates the user's record with the new Stripe Connect account ID
 * 5. Returns the onboarding URL for the expert to complete their setup
 *
 * @param clerkUserId - The Clerk user ID of the expert
 * @returns Promise that resolves to either:
 *   - The Stripe Connect onboarding URL (string)
 *   - null if the process fails or user is not found
 *
 * @example
 * const onboardingUrl = await handleConnectStripe("user_123");
 * if (onboardingUrl) {
 *   // Redirect user to onboardingUrl to complete Stripe Connect setup
 * } else {
 *   console.error("Failed to create Stripe Connect account");
 * }
 */
export async function handleConnectStripe(clerkUserId: string): Promise<string | null> {
  if (!clerkUserId) return null;

  try {
    // Get user data from both Clerk and our database
    try {
      const clerk = await clerkClient();
      const [clerkUser, dbUser] = await Promise.all([
        getCachedUserById(clerkUserId).catch((error: Error) => {
          console.error('Failed to fetch Clerk user:', error);
          return null;
        }),
        db.query.UserTable.findFirst({
          where: eq(UserTable.clerkUserId, clerkUserId),
        }),
      ]);

      if (!dbUser || !clerkUser) {
        console.error('User not found in', !dbUser ? 'database' : 'Clerk');
        return null;
      }

      if (!dbUser.email) {
        console.error('User email not found');
        return null;
      }

      // Get country from Clerk metadata or default to US
      let country = (clerkUser.publicMetadata.country as string) || 'US';

      // Ensure country code is uppercase
      country = country.toUpperCase();

      // Validate country is supported by Stripe Connect
      // See: https://stripe.com/global
      const supportedCountries = ['US', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'PT', 'IE', 'PT']; // Add more as needed
      if (!supportedCountries.includes(country)) {
        console.error('Country not supported by Stripe Connect:', country);
        return null;
      }

      // Create Stripe Connect account
      const { accountId } = await createStripeConnectAccount(dbUser.email, country);

      // Update user records
      await Promise.all([
        // Update our database
        db
          .update(UserTable)
          .set({
            stripeConnectAccountId: accountId,
            country: country, // Store the country in our database
            updatedAt: new Date(),
          })
          .where(eq(UserTable.clerkUserId, clerkUserId)),

        // Update Clerk metadata
        clerk.users.updateUser(clerkUserId, {
          publicMetadata: {
            ...clerkUser.publicMetadata,
            country: country,
            stripeConnectAccountId: accountId,
          },
        }),
      ]);

      // Invalidate cache after updating user metadata
      await invalidateUserCache(clerkUserId);

      // Generate the onboarding URL
      const url = await getStripeConnectSetupOrLoginLink(accountId);
      return url;
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      return null;
    }
  } catch (error) {
    console.error('Failed to create Stripe Connect account:', error);
    return null;
  }
}

/**
 * Generates a login link for an existing Stripe Connect account.
 *
 * This function creates a unique URL that allows experts to access their
 * Stripe Connect dashboard or complete their account setup if not finished.
 *
 * @param stripeConnectAccountId - The ID of the expert's Stripe Connect account
 * @returns Promise that resolves to the Stripe Connect dashboard URL
 * @throws Error if the account ID is missing or invalid
 *
 * @example
 * try {
 *   const dashboardUrl = await getConnectLoginLink("acct_123");
 *   // Redirect user to dashboardUrl to access their Stripe dashboard
 * } catch (error) {
 *   console.error("Failed to generate login link:", error);
 * }
 */
export async function getConnectLoginLink(stripeConnectAccountId: string) {
  if (!stripeConnectAccountId) {
    throw new Error('Stripe Connect Account ID is required');
  }

  try {
    return await getStripeConnectSetupOrLoginLink(stripeConnectAccountId);
  } catch (error) {
    console.error('Failed to create Stripe Connect link:', error);
    throw error;
  }
}

/**
 * Synchronizes a user's verified identity with their Stripe Connect account.
 * This helps streamline the verification process by reusing the Stripe Identity verification.
 * Includes retry logic for improved reliability.
 *
 * @returns An object with success status and a message
 */
export async function syncIdentityToConnect() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, message: 'Not authenticated' };
    }

    // Import the sync function
    const { syncIdentityVerificationToConnect } = await import('@/lib/integrations/stripe');

    // Implement retry logic with exponential backoff
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `Syncing identity verification attempt ${attempt}/${maxRetries} for user ${userId}`,
        );
        const result = await syncIdentityVerificationToConnect(userId);

        if (result.success) {
          console.log(`Successfully synced identity verification on attempt ${attempt}`, {
            userId,
            verificationStatus: result.verificationStatus,
          });

          return {
            success: true,
            message: 'Identity verification successfully synced to Connect account',
            attempt,
          };
        }

        // Store the error and retry
        lastError = new Error(result.message || 'Sync failed with unknown reason');
        console.warn(`Sync attempt ${attempt} failed: ${result.message}`);

        // If not the last attempt, wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delayMs = 2 ** attempt * 500; // 1s, 2s, 4s backoff
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        lastError = error;
        console.error(`Error during sync attempt ${attempt}:`, error);

        // If not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const delayMs = 2 ** attempt * 500; // 1s, 2s, 4s backoff
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    // If we get here, all attempts failed
    console.error(`Failed to sync identity after ${maxRetries} attempts`, {
      userId,
      lastError,
    });

    // Return the most recent error
    return {
      success: false,
      message:
        lastError instanceof Error
          ? lastError.message
          : 'Failed to sync identity verification after multiple attempts',
      attempts: maxRetries,
    };
  } catch (error) {
    console.error('Error in syncIdentityToConnect:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Creates a refund for a connected account charge with proper application fee handling.
 *
 * @param chargeId - The ID of the charge to refund
 * @param amount - Optional partial refund amount in cents (full refund if not provided)
 * @param reason - Optional refund reason
 * @returns Promise with refund result
 */
export async function createConnectRefund(
  chargeId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { success: false, message: 'Not authenticated' };
    }

    // Get user's connected account ID
    const dbUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    if (!dbUser?.stripeConnectAccountId) {
      return { success: false, message: 'No connected Stripe account found' };
    }

    // Create refund with application fee refund enabled
    const refund = await stripe.refunds.create(
      {
        charge: chargeId,
        refund_application_fee: true, // Refunds the platform fee
        ...(amount && { amount }), // Partial refund if amount specified
        ...(reason && { reason }),
      },
      {
        stripeAccount: dbUser.stripeConnectAccountId,
      },
    );

    console.log('Refund created successfully:', {
      refundId: refund.id,
      chargeId,
      amount: refund.amount,
      status: refund.status,
      userId,
    });

    return {
      success: true,
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
      },
    };
  } catch (error) {
    console.error('Failed to create refund:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process refund',
    };
  }
}
