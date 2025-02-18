/**
 * @fileoverview Server actions for managing Stripe Connect integration in the Eleva Care application.
 * This file handles the creation and management of Stripe Connect accounts for experts,
 * enabling them to receive payments through the platform. It provides functionality for
 * account creation, login link generation, and account management.
 */

"use server";

import {
  createStripeConnectAccount,
  getStripeConnectSetupOrLoginLink,
} from "@/lib/stripe";
import { db } from "@/drizzle/db";
import { UserTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Initiates the Stripe Connect account creation process for an expert.
 *
 * This function performs several steps:
 * 1. Validates the user exists in the database
 * 2. Creates a Stripe Connect account for the expert
 * 3. Returns the onboarding URL for the expert to complete their setup
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
export async function handleConnectStripe(
  clerkUserId: string
): Promise<string | null> {
  if (!clerkUserId) return null;

  try {
    // Retrieve the user from the database
    const dbUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, clerkUserId),
    });

    if (!dbUser) {
      console.error("User not found in database");
      return null;
    }

    // Create Stripe Connect account and get onboarding URL
    const { url } = await createStripeConnectAccount(dbUser.id);
    return url;
  } catch (error) {
    console.error("Failed to create Stripe Connect account:", error);
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
    throw new Error("Stripe Connect Account ID is required");
  }

  try {
    return await getStripeConnectSetupOrLoginLink(stripeConnectAccountId);
  } catch (error) {
    console.error("Failed to create Stripe Connect link:", error);
    throw error;
  }
}
