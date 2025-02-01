"use server";

import {
  createStripeConnectAccount,
  getStripeConnectSetupOrLoginLink,
} from "@/lib/stripe";
import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { UserTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export async function handleConnectStripe(clerkUserId: string) {
  if (!clerkUserId) return;

  try {
    // Get the database user first
    const dbUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, clerkUserId),
    });

    if (!dbUser) {
      console.error("User not found in database");
      return;
    }

    const { url } = await createStripeConnectAccount(dbUser.id);
    redirect(url);
  } catch (error) {
    console.error("Failed to create Stripe Connect account:", error);
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
