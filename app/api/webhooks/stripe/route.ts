import { headers } from "next/headers";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createMeeting } from "@/server/actions/meetings";
import { STRIPE_CONFIG } from "@/config/stripe";
import { db } from "@/drizzle/db";
import { MeetingTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { calculateExpertAmount } from "@/config/stripe";

// Add type for Stripe Connect session
type StripeConnectSession = Stripe.Checkout.Session & {
  application_fee_amount?: number;
  payment_intent: string | null;
  application_fee?: string;
};

// Add route segment config
export const dynamic = "force-dynamic";
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

// Update the handleCheckoutSessionCompleted function
async function handleCheckoutSessionCompleted(session: StripeConnectSession) {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      console.log("Starting checkout session processing:", {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        paymentIntent: session.payment_intent,
        metadata: session.metadata,
      });

      // Parse the meetingData from metadata
      const meetingData = JSON.parse(session.metadata?.meetingData || "{}");
      console.log("Parsed meeting data:", meetingData);

      // Get expert's Connect account ID and eventId from metadata
      const expertConnectAccountId = session.metadata?.expertConnectAccountId;
      const eventId = session.metadata?.eventId;

      if (
        !eventId ||
        !expertConnectAccountId ||
        !meetingData.expertClerkUserId
      ) {
        console.error("Missing required metadata:", {
          eventId,
          expertConnectAccountId,
          expertClerkUserId: meetingData.expertClerkUserId,
          metadata: session.metadata,
        });
        throw new Error(
          "Missing required metadata: eventId, expertConnectAccountId, or expertClerkUserId"
        );
      }

      // Create the meeting using all required data
      const result = await createMeeting({
        eventId,
        clerkUserId: meetingData.expertClerkUserId,
        guestEmail: session.customer_details?.email || meetingData.guestEmail,
        guestName: session.customer_details?.name || meetingData.guestName,
        timezone: meetingData.timezone,
        startTime: new Date(meetingData.startTime),
        guestNotes: meetingData.guestNotes || "",
        stripePaymentIntentId: session.payment_intent || undefined,
        stripeSessionId: session.id,
        stripePaymentStatus: session.payment_status as "succeeded",
        stripeAmount: session.amount_total || undefined,
        stripeApplicationFeeAmount: session.application_fee_amount || undefined,
      });

      console.log("Meeting creation result:", {
        success: !result.error,
        error: result.error,
        code: result.code,
        meetingId: result.meeting?.id,
        metadata: meetingData,
      });

      if (result.error) {
        throw new Error(`Meeting creation failed: ${result.code}`);
      }

      // Schedule the delayed transfer to the expert
      if (
        session.payment_status === "paid" &&
        !result.error &&
        result.meeting
      ) {
        await setupDelayedTransfer(
          session,
          result.meeting.id,
          expertConnectAccountId
        );
        console.log("Delayed transfer scheduled for meeting:", {
          meetingId: result.meeting.id,
          expertConnectAccountId,
          scheduledFor:
            new Date(meetingData.startTime).getTime() + 4 * 60 * 60 * 1000,
        });
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
      currency: STRIPE_CONFIG.CURRENCY,
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

export async function POST(req: Request) {
  try {
    // Get the raw body
    const rawBody = await req.text();
    const headersList = headers();
    const signature = headersList.get("stripe-signature");

    if (!signature || !webhookSecret) {
      console.error("Missing webhook signature or secret");
      return NextResponse.json(
        { error: "Missing webhook configuration" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      console.log("Received webhook event:", {
        type: event.type,
        id: event.id,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Webhook signature verification failed:", {
        error: err instanceof Error ? err.message : "Unknown error",
        signature,
      });
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as StripeConnectSession;
          console.log("Processing completed checkout session:", {
            sessionId: session.id,
            paymentStatus: session.payment_status,
            metadata: session.metadata,
          });

          const result = await handleCheckoutSessionCompleted(session);
          console.log("Checkout session processing result:", {
            sessionId: session.id,
            success: result ? !result.error : false,
            meetingId: result?.meeting?.id ?? null,
          });
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
          console.log(`Unhandled event type: ${event.type}`);
      }

      return NextResponse.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", {
        eventType: event.type,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
      // Return 200 to acknowledge receipt even if processing fails
      return NextResponse.json({ received: true });
    }
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
