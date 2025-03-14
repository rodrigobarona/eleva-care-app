'use server';

import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { createStripeConnectAccount, getStripeConnectSetupOrLoginLink } from '@/lib/stripe';
import { clerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

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
        clerk.users.getUser(clerkUserId).catch((error: Error) => {
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
