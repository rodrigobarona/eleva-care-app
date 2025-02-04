import { headers } from "next/headers";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createMeeting } from "@/server/actions/meetings";
import { STRIPE_CONFIG } from "@/config/stripe";
import { db } from "@/drizzle/db";
import { MeetingTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

// Add type for Stripe Connect session
type StripeConnectSession = Stripe.Checkout.Session & {
  application_fee_amount?: number;
  payment_intent: string | null;
  application_fee?: string;
};

// Use new Next.js route segment config
export const runtime = "nodejs";
export const preferredRegion = "auto";
export const maxDuration = 60;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});

// Make sure to use the correct webhook secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable");
}

// Maximum number of retries for database operations
const MAX_RETRIES = 3;

// Type for parsed meeting data from metadata
type ParsedMeetingData = {
  clerkUserId: string;
  timezone: string;
  startTime: string;
  guestEmail: string;
  guestName: string;
  guestNotes?: string;
};

// Add GET handler to explain the endpoint
export async function GET() {
  return NextResponse.json(
    { error: "This endpoint only accepts POST requests from Stripe webhooks" },
    { status: 405 }
  );
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  // Log the failure details
  const errorDetails = {
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    error: paymentIntent.last_payment_error,
    timestamp: new Date().toISOString(),
  };

  console.error("Payment failed:", errorDetails);

  try {
    // Parse meeting data from metadata to get event details
    const meetingData = JSON.parse(
      paymentIntent.metadata.meetingData ?? "{}"
    ) as ParsedMeetingData;
    const eventId = paymentIntent.metadata.eventId;

    if (!eventId || !meetingData) {
      throw new Error("Missing required metadata");
    }

    // Log the failure with event details
    console.error("Payment failed for event:", {
      ...errorDetails,
      eventId,
      guestEmail: meetingData.guestEmail,
      startTime: meetingData.startTime,
    });
  } catch (error) {
    console.error("Error handling failed payment:", {
      error: error instanceof Error ? error.message : "Unknown error",
      paymentIntentId: paymentIntent.id,
      timestamp: new Date().toISOString(),
    });
  }
}

// First, let's add a helper function to calculate amounts
function calculateExpertAmount(totalAmount: number | null): number {
  if (!totalAmount) return 0;
  // Default to 85% for the expert
  return Math.floor(totalAmount * 0.85);
}

function calculateApplicationFee(totalAmount: number | null): number {
  if (!totalAmount) return 0;
  // Default to 15% platform fee
  return Math.floor(totalAmount * 0.15);
}

// Update the handleCheckoutSessionCompleted function
async function handleCheckoutSessionCompleted(
  session: StripeConnectSession,
  stripeInstance: Stripe
) {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      console.log("Starting checkout session processing:", {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        paymentIntent: session.payment_intent,
        metadata: session.metadata,
      });

      // Get expert's Connect account ID from metadata
      const expertConnectAccountId = session.metadata?.expertConnectAccountId;
      if (!expertConnectAccountId) {
        throw new Error("Missing expert Connect account ID in metadata");
      }

      // For Connect payments, handle both payment_intent and direct charges
      const paymentIdentifier = session.payment_intent || session.id;

      // If there's a payment intent, set up the transfer data
      if (session.payment_intent && session.payment_status === "paid") {
        const transferData = {
          destination: expertConnectAccountId,
          amount: calculateExpertAmount(session.amount_total),
          transfer_group: `meeting_${session.id}`,
        };

        // Update payment intent with transfer data
        await stripeInstance.paymentIntents.update(session.payment_intent, {
          transfer_data: transferData,
          application_fee_amount: calculateApplicationFee(session.amount_total),
        });
      }

      // Add runtime check for required metadata before calling createMeeting
      const eventId = session.metadata?.eventId;
      if (!eventId) {
        throw new Error("Missing required eventId in session metadata");
      }

      // Optionally, enforce expertId and timezone as well:
      const expertId = session.metadata?.expertId;
      if (!expertId) {
        throw new Error("Missing required expertId in session metadata");
      }

      const timezone = session.metadata?.timezone;
      if (!timezone) {
        throw new Error("Missing required timezone in session metadata");
      }

      // Create the meeting
      const result = await createMeeting({
        eventId: eventId,
        clerkUserId: expertId,
        guestEmail:
          session.customer_details?.email ??
          (session.metadata?.guestEmail as string),
        guestName:
          session.customer_details?.name ??
          (session.metadata?.guestName as string),
        timezone: timezone,
        startTime: new Date(session.metadata?.startTime as string),
        guestNotes: session.metadata?.guestNotes as string,
        stripePaymentIntentId: paymentIdentifier,
        stripeSessionId: session.id,
        stripePaymentStatus: session.payment_status,
        stripeAmount: session.amount_total ?? undefined,
        stripeApplicationFeeAmount: session.application_fee_amount,
      });

      // If meeting creation was successful, schedule the delayed transfer
      if (!result.error && result.meeting) {
        await setupDelayedTransfer(
          session,
          result.meeting.id,
          expertConnectAccountId
        );
      }

      return result;
    } catch (error) {
      retries++;
      console.error("Error processing checkout session:", {
        error: error instanceof Error ? error.message : "Unknown error",
        attempt: retries,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
      });

      if (retries === MAX_RETRIES) {
        throw error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(1000 * 2 ** retries, 10000))
      );
    }
  }
}

// Add the setupDelayedTransfer function
async function setupDelayedTransfer(
  session: StripeConnectSession,
  meetingId: string,
  expertConnectAccountId: string
) {
  const meetingStartTime = new Date(session.metadata?.startTime as string);
  const transferScheduleTime = new Date(
    meetingStartTime.getTime() + 4 * 60 * 60 * 1000
  ); // 4 hours after meeting

  try {
    const transfer = await stripe.transfers.create({
      amount: calculateExpertAmount(session.amount_total),
      currency: "eur",
      destination: expertConnectAccountId,
      transfer_group: `meeting_${meetingId}`,
      metadata: {
        meetingId,
        scheduledFor: transferScheduleTime.toISOString(),
      },
    });

    // Update meeting record with transfer details
    await db
      .update(MeetingTable)
      .set({
        stripeTransferId: transfer.id,
        stripeTransferAmount: transfer.amount,
        stripeTransferStatus: "pending",
        stripeTransferScheduledAt: transferScheduleTime,
      })
      .where(eq(MeetingTable.id, meetingId));

    console.log("Transfer scheduled:", {
      transferId: transfer.id,
      amount: transfer.amount,
      destination: expertConnectAccountId,
      scheduledFor: transferScheduleTime,
      meetingId,
    });

    return transfer;
  } catch (error) {
    console.error("Error scheduling transfer:", {
      error: error instanceof Error ? error.message : "Unknown error",
      meetingId,
      expertConnectAccountId,
    });
    throw error;
  }
}

export const POST = async (req: Request) => {
  try {
    // Get the raw body
    const rawBody = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature || !webhookSecret) {
      console.error("Missing required webhook configuration");
      return NextResponse.json(
        { error: "Missing required webhook configuration" },
        { status: 400 }
      );
    }

    // Use the webhook secret from the Stripe CLI for local development
    const secretToUse =
      process.env.NODE_ENV === "development"
        ? "whsec_87c9cc12ca175698146972f9fd9ec232c5915a192d6a18e52b56bebc023c42b1"
        : webhookSecret;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secretToUse);
      console.log("Received webhook event:", {
        type: event.type,
        id: event.id,
        account: event.account,
        livemode: event.livemode,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Webhook signature verification failed:", {
        error: err instanceof Error ? err.message : "Unknown error",
        signature: signature,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    try {
      // If this is a Connect account event, use the connected account's Stripe instance
      const stripeInstance = event.account
        ? new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
            apiVersion: STRIPE_CONFIG.API_VERSION,
            stripeAccount: event.account,
          })
        : stripe;

      // Log whether this is a platform or connected account event
      console.log(
        `Processing ${event.account ? "connected account" : "platform"} event:`,
        {
          type: event.type,
          accountId: event.account || "platform",
          livemode: event.livemode,
        }
      );

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as StripeConnectSession;
          console.log("Processing completed checkout session:", {
            sessionId: session.id,
            paymentStatus: session.payment_status,
            paymentIntent: session.payment_intent,
            customerId: session.customer,
            metadata: session.metadata,
            connectedAccountId: event.account,
            livemode: event.livemode,
          });
          await handleCheckoutSessionCompleted(session, stripeInstance);
          break;
        }
        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log("Processing payment intent failed:", {
            paymentIntentId: paymentIntent.id,
            error: paymentIntent.last_payment_error,
          });
          await handlePaymentIntentFailed(paymentIntent);
          break;
        }
        default:
          console.log(`Unhandled event type: ${event.type}`, {
            accountId: event.account || "platform",
            livemode: event.livemode,
          });
      }

      return NextResponse.json({ received: true });
    } catch (error) {
      console.error(`Error handling webhook event type ${event.type}:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        eventType: event.type,
        connectedAccountId: event.account,
        livemode: event.livemode,
        timestamp: new Date().toISOString(),
      });
      // Return 200 even on error to prevent retries
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
};
