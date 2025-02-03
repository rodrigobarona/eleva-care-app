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

      // For Connect payments, we need to handle both payment_intent and direct charges
      const paymentIdentifier = session.payment_intent || session.id;

      // Parse meeting data from metadata
      const meetingData = JSON.parse(
        session.metadata?.meetingData ?? "{}"
      ) as ParsedMeetingData;
      const eventId = session.metadata?.eventId;

      if (!eventId) {
        throw new Error("Missing eventId in session metadata");
      }

      // Map Stripe payment status to your database enum values
      const paymentStatusMap: Record<string, string> = {
        paid: "succeeded",
        unpaid: "requires_payment",
        no_payment_required: "no_payment_required",
      };

      const mappedPaymentStatus =
        paymentStatusMap[session.payment_status] || session.payment_status;

      // If there's a payment intent, retrieve its full details for validation
      if (session.payment_intent) {
        const paymentIntent = await stripeInstance.paymentIntents.retrieve(
          session.payment_intent
        );

        // Additional validation with payment intent
        if (paymentIntent.status !== "succeeded") {
          throw new Error(
            `Payment intent ${paymentIntent.id} is not succeeded (status: ${paymentIntent.status})`
          );
        }
      }

      // Create the meeting with proper error handling
      const result = await createMeeting({
        eventId,
        clerkUserId: meetingData.clerkUserId,
        guestEmail: session.customer_details?.email ?? meetingData.guestEmail,
        guestName: session.customer_details?.name ?? meetingData.guestName,
        timezone: meetingData.timezone,
        startTime: new Date(meetingData.startTime),
        guestNotes: meetingData.guestNotes || "",
        stripePaymentIntentId: paymentIdentifier,
        stripeSessionId: session.id,
        stripePaymentStatus: mappedPaymentStatus,
        stripeAmount: session.amount_total ?? undefined,
        stripeApplicationFeeAmount: session.application_fee_amount,
      });

      if (result?.error) {
        // Handle specific error cases
        if (result.code === "SLOT_ALREADY_BOOKED") {
          console.log("Initiating refund for concurrent booking:", {
            sessionId: session.id,
            paymentIntent: session.payment_intent,
            amount: session.amount_total,
          });

          // Issue refund if payment was made
          if (session.payment_intent && session.payment_status === "paid") {
            const refund = await stripeInstance.refunds.create({
              payment_intent: session.payment_intent,
              reason: "duplicate",
            });

            console.log("Refund processed for concurrent booking:", {
              refundId: refund.id,
              sessionId: session.id,
              paymentIntent: session.payment_intent,
            });
          }

          // Return specific error for concurrent booking
          throw new Error(
            result.message || "Time slot was just booked by another user"
          );
        }

        console.error("Failed to create meeting:", {
          error: result.error,
          code: result.code,
          sessionId: session.id,
          eventId,
          timestamp: new Date().toISOString(),
        });
        throw new Error(result.code);
      }

      // After successful meeting creation, set up the transfer
      let transferData: Stripe.Transfer | null = null;
      if (session.payment_intent && session.payment_status === "paid") {
        // Get expert's Connect account ID
        const expertConnectAccountId = session.metadata?.expertConnectAccountId;
        if (!expertConnectAccountId) {
          console.error("Missing expert Connect account ID, skipping transfer");
        } else {
          // Calculate transfer amount (total minus application fee)
          const transferAmount =
            (session.amount_total || 0) - (session.application_fee_amount || 0);

          // Schedule transfer to expert's Connect account
          // We schedule it 4 hours after the meeting start time to allow for cancellations
          const meetingStartTime = new Date(meetingData.startTime);
          const transferScheduleTime = new Date(
            meetingStartTime.getTime() + 4 * 60 * 60 * 1000
          );

          transferData = await stripeInstance.transfers.create({
            amount: transferAmount,
            currency: session.currency || "eur", // Default to EUR if not specified
            destination: expertConnectAccountId,
            transfer_group: `meeting_${session.id}`,
            metadata: {
              meetingId: result.meeting?.id || session.id, // Fallback to session ID if meeting ID is not available
              eventId: eventId,
              expertId: meetingData.clerkUserId,
              scheduledFor: transferScheduleTime.toISOString(),
            },
          });

          // Update the meeting record with transfer information
          if (result.meeting?.id) {
            await db
              .update(MeetingTable)
              .set({
                stripeTransferId: transferData.id,
                stripeTransferAmount: transferData.amount,
                stripeTransferStatus: "pending",
                stripeTransferScheduledAt: transferScheduleTime,
              })
              .where(eq(MeetingTable.id, result.meeting.id));

            console.log("Transfer scheduled:", {
              transferId: transferData.id,
              amount: transferAmount,
              destination: expertConnectAccountId,
              scheduledFor: transferScheduleTime,
              meetingId: result.meeting.id,
            });
          }
        }
      }

      console.log("Meeting created successfully:", {
        sessionId: session.id,
        eventId,
        meetingId: result.meeting?.id,
        customerEmail: session.customer_details?.email,
        transferId: transferData?.id,
        timestamp: new Date().toISOString(),
      });

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
