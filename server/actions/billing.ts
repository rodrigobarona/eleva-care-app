"use server";

import { createStripeConnectAccount } from "@/lib/stripe";
import { redirect } from "next/navigation";

export async function handleConnectStripe(userId: string) {
  if (!userId) return;

  try {
    const { url } = await createStripeConnectAccount(userId);
    redirect(url);
  } catch (error) {
    console.error("Failed to create Stripe Connect account:", error);
  }
}
