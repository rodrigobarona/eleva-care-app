import { NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_CONFIG } from "@/config/stripe";
import { db } from "@/drizzle/db";
import { UserTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});

const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET ?? "";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") ?? "";

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new NextResponse("Invalid signature", { status: 400 });
    }

    console.log("Received Stripe Connect webhook event:", event.type);

    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;

        // Update user's Stripe Connect status
        await db
          .update(UserTable)
          .set({
            stripeConnectOnboardingComplete: account.details_submitted,
            updatedAt: new Date(),
          })
          .where(eq(UserTable.stripeConnectAccountId, account.id));

        console.log("Updated Connect account status:", {
          accountId: account.id,
          detailsSubmitted: account.details_submitted,
        });
        break;
      }

      case "account.application.deauthorized": {
        const application = event.data.object as { id: string };

        // Remove Stripe Connect account association
        await db
          .update(UserTable)
          .set({
            stripeConnectAccountId: null,
            stripeConnectOnboardingComplete: false,
            updatedAt: new Date(),
          })
          .where(eq(UserTable.stripeConnectAccountId, application.id));

        console.log("Deauthorized Connect account:", {
          accountId: application.id,
        });
        break;
      }

      case "account.external_account.created":
      case "account.external_account.updated":
      case "account.external_account.deleted": {
        const externalAccount = event.data.object as
          | Stripe.BankAccount
          | Stripe.Card;
        const eventType = event.type.split(".").pop(); // 'created', 'updated', or 'deleted'
        console.log(`Bank account ${eventType} for Connect account:`, {
          accountId: externalAccount.account,
          last4: externalAccount.last4,
          bankName:
            "bank_name" in externalAccount
              ? externalAccount.bank_name
              : undefined,
        });
        break;
      }

      case "payout.created": {
        const payout = event.data.object as Stripe.Payout;
        console.log("Payout initiated:", {
          payoutId: payout.id,
          accountId: payout.destination,
          amount: payout.amount,
          currency: payout.currency,
          arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
        });
        break;
      }

      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        console.log("Payout failed:", {
          payoutId: payout.id,
          accountId: payout.destination,
          amount: payout.amount,
          currency: payout.currency,
          failureCode: payout.failure_code,
          failureMessage: payout.failure_message,
        });
        break;
      }

      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout;
        console.log("Payout successful:", {
          payoutId: payout.id,
          accountId: payout.destination,
          amount: payout.amount,
          currency: payout.currency,
          arrivalDate: new Date(payout.arrival_date * 1000).toISOString(),
        });
        break;
      }
    }

    return new NextResponse("Webhook processed", { status: 200 });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Webhook Error",
      { status: 500 }
    );
  }
}
