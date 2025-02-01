import { headers } from "next/headers";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createMeeting } from "@/server/actions/meetings";
import { STRIPE_CONFIG } from "@/config/stripe";
import { db } from "@/drizzle/db";

// Export config to disable body parsing
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
export const maxDuration = 60;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

// Maximum number of retries for database operations
const MAX_RETRIES = 3;

interface MeetingData {
  clerkUserId: string;
  guestEmail: string;
  guestName: string;
  timezone: string;
  startTime: string;
  guestNotes?: string;
}

// Add GET handler to explain the endpoint
export async function GET() {
  return NextResponse.json(
    { error: "This endpoint only accepts POST requests from Stripe webhooks" },
    { status: 405 }
  );
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      // Check if meeting already exists by payment intent ID
      const existingMeetingByPayment = await db.query.MeetingTable.findFirst({
        where: (fields, operators) =>
          operators.eq(fields.paymentIntentId, paymentIntent.id),
      });

      if (existingMeetingByPayment) {
        console.log("Meeting already exists with payment intent:", {
          paymentIntentId: paymentIntent.id,
          meetingId: existingMeetingByPayment.id,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Parse meeting data and check by time and event
      const meetingData: MeetingData = JSON.parse(
        paymentIntent.metadata.meetingData
      );
      const existingMeetingByTime = await db.query.MeetingTable.findFirst({
        where: (fields, operators) =>
          operators.and(
            operators.eq(fields.eventId, paymentIntent.metadata.eventId),
            operators.eq(fields.startTime, new Date(meetingData.startTime))
          ),
      });

      if (existingMeetingByTime) {
        console.log("Meeting already exists for this time slot:", {
          meetingId: existingMeetingByTime.id,
          eventId: paymentIntent.metadata.eventId,
          startTime: meetingData.startTime,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Following Stripe recommendations:
      // 1. Validate the payment status before creating the meeting
      const paymentIntentDetails = await stripe.paymentIntents.retrieve(
        paymentIntent.id
      );
      if (paymentIntentDetails.status !== "succeeded") {
        throw new Error(
          `Payment not succeeded. Status: ${paymentIntentDetails.status}`
        );
      }

      // 2. Create the meeting with proper error handling
      const result = await createMeeting({
        eventId: paymentIntent.metadata.eventId,
        clerkUserId: meetingData.clerkUserId,
        guestEmail: meetingData.guestEmail,
        guestName: meetingData.guestName,
        timezone: meetingData.timezone,
        startTime: new Date(meetingData.startTime),
        guestNotes: meetingData.guestNotes || "",
        paymentIntentId: paymentIntent.id,
      });

      if (result?.error) {
        throw new Error(
          "Failed to create meeting: Server action returned error"
        );
      }

      // 3. Log success with structured data
      console.log("Meeting created successfully:", {
        paymentIntentId: paymentIntent.id,
        eventId: paymentIntent.metadata.eventId,
        customerEmail: meetingData.guestEmail,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      retries++;
      console.error("Error processing payment:", {
        error: error instanceof Error ? error.message : "Unknown error",
        attempt: retries,
        paymentIntentId: paymentIntent.id,
        timestamp: new Date().toISOString(),
      });

      if (retries === MAX_RETRIES) {
        throw error;
      }
      // Exponential backoff with jitter for better distributed retries
      const jitter = Math.random() * 1000;
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * retries + jitter)
      );
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  // Following Stripe recommendations for failed payments
  const errorDetails = {
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    error: paymentIntent.last_payment_error,
    timestamp: new Date().toISOString(),
  };

  console.error("Payment failed:", errorDetails);

  // Here you could implement additional error handling or notifications
  // For example, sending an email to the customer or admin
}

async function handleCustomerSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  // Following Stripe recommendations for subscription management
  const subscriptionDetails = {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    timestamp: new Date().toISOString(),
  };

  console.log("Subscription updated:", subscriptionDetails);

  // Here you could implement subscription status updates in your database
  // For example, updating user's subscription status
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = headers().get("stripe-signature");

    if (!signature) {
      console.error("Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", {
        error: err instanceof Error ? err.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    try {
      switch (event.type) {
        case "payment_intent.succeeded":
          await handlePaymentIntentSucceeded(
            event.data.object as Stripe.PaymentIntent
          );
          break;
        case "payment_intent.payment_failed":
          await handlePaymentIntentFailed(
            event.data.object as Stripe.PaymentIntent
          );
          break;
        case "customer.subscription.updated":
          await handleCustomerSubscriptionUpdated(
            event.data.object as Stripe.Subscription
          );
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return NextResponse.json({ received: true });
    } catch (error) {
      console.error(`Error handling webhook event type ${event.type}:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        eventType: event.type,
        timestamp: new Date().toISOString(),
      });
      // Return 200 to acknowledge receipt of the webhook
      // This prevents Stripe from retrying the webhook
      return NextResponse.json({ received: true });
    }
  } catch (err) {
    console.error("Webhook error:", {
      error: err instanceof Error ? err.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
