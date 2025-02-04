"use server";

import {
  createStripeConnectAccount,
  getStripeConnectSetupOrLoginLink,
} from "@/lib/stripe";
import { db } from "@/drizzle/db";
import { UserTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function handleConnectStripe(
  clerkUserId: string
): Promise<string | null> {
  if (!clerkUserId) return null;

  try {
    // Get the database user first
    const dbUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, clerkUserId),
    });

    if (!dbUser) {
      console.error("User not found in database");
      return null;
    }

    // Create the Stripe Connect account and get the URL
    const { url } = await createStripeConnectAccount(dbUser.id);
    return url;
  } catch (error) {
    console.error("Failed to create Stripe Connect account:", error);
    return null;
  }
}

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
