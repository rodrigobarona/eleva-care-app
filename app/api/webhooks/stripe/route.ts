import { headers } from "next/headers";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createMeeting } from "@/server/actions/meetings";
import { STRIPE_CONFIG } from "@/config/stripe";
import { db } from "@/drizzle/db";
import { MeetingTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { calculateExpertAmount } from "@/config/stripe";
import type { Stripe as StripeType } from "stripe";
import StripeSDK from "stripe";

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

const stripe = new StripeSDK(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});

// Make sure to use the correct webhook secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable");
}

// Maximum number of retries for database operations
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Type for parsed meeting data from metadata
type ParsedMeetingData = {
  clerkUserId: string;
  timezone: string;
  startTime: string;
  guestEmail: string;
  guestName: string;
  guestNotes?: string;
};

interface MeetingMetadata {
  timezone: string;
  startTime: string;
  guestEmail: string;
  guestName: string;
  guestNotes?: string;
  expertClerkUserId: string;
}

interface StripeCheckoutSession extends Stripe.Checkout.Session {
  application_fee_amount: number | null;
}

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

async function handleCheckoutSession(session: StripeCheckoutSession) {
  console.log("Starting checkout session processing:", {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    paymentIntent: session.payment_intent,
    metadata: session.metadata,
  });

  // First check if we already have a meeting for this session
  const existingMeeting = await db.query.MeetingTable.findFirst({
    where: ({ stripeSessionId }, { eq }) => eq(stripeSessionId, session.id),
  });

  if (existingMeeting) {
    console.log("Meeting already exists for session:", {
      sessionId: session.id,
      meetingId: existingMeeting.id,
    });
    return { success: true, meetingId: existingMeeting.id };
  }

  if (!session.metadata?.meetingData || !session.metadata.eventId) {
    throw new Error("Missing required metadata");
  }

  const meetingData = JSON.parse(
    session.metadata.meetingData
  ) as MeetingMetadata;
  console.log("Parsed meeting data:", meetingData);

  const result = await createMeeting({
    eventId: session.metadata.eventId,
    clerkUserId: meetingData.expertClerkUserId,
    startTime: new Date(meetingData.startTime),
    guestEmail: meetingData.guestEmail,
    guestName: meetingData.guestName,
    guestNotes: meetingData.guestNotes,
    timezone: meetingData.timezone,
    stripeSessionId: session.id,
    stripePaymentStatus: session.payment_status,
    stripeAmount: session.amount_total ?? undefined,
    stripeApplicationFeeAmount: session.application_fee_amount ?? undefined,
  });

  console.log("Meeting creation result:", {
    success: !result.error,
    error: result.error,
    code: result.code,
    meetingId: result.meeting?.id,
    metadata: meetingData,
    timestamp: new Date().toISOString(),
  });

  if (result.error) {
    if (
      result.code === "SLOT_ALREADY_BOOKED" &&
      session.payment_status === "paid"
    ) {
      // Initiate refund if payment was successful
      try {
        if (typeof session.payment_intent === "string") {
          const refund = await stripe.refunds.create({
            payment_intent: session.payment_intent,
            reason: "duplicate",
          });
          console.log("Initiated refund for double booking:", {
            sessionId: session.id,
            refundId: refund.id,
          });
        }
      } catch (refundError) {
        console.error("Error initiating refund:", refundError);
      }
    }

    throw new Error(`Meeting creation failed: ${result.code}`);
  }

  return { success: true, meetingId: result.meeting?.id };
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
    // Validate session amount
    if (!session.amount_total || session.amount_total <= 0) {
      throw new Error("Invalid session amount");
    }

    // Calculate expert amount
    const expertAmount = calculateExpertAmount(session.amount_total);

    // Validate expert amount
    if (expertAmount <= 0) {
      throw new Error("Invalid expert amount calculated");
    }

    // Validate that expert amount is less than total amount
    if (expertAmount >= session.amount_total) {
      throw new Error("Expert amount must be less than total amount");
    }

    // Validate application fee
    const applicationFee = session.application_fee_amount;
    if (!applicationFee || applicationFee <= 0) {
      throw new Error("Invalid application fee");
    }

    // Validate that amounts add up correctly
    if (expertAmount + applicationFee !== session.amount_total) {
      console.error("Amount mismatch:", {
        totalAmount: session.amount_total,
        expertAmount,
        applicationFee,
        difference: session.amount_total - (expertAmount + applicationFee),
      });
      throw new Error("Amount validation failed");
    }

    const transfer = await stripe.transfers.create({
      amount: expertAmount,
      currency: STRIPE_CONFIG.CURRENCY,
      destination: expertConnectAccountId,
      transfer_group: `meeting_${meetingId}`,
      metadata: {
        meetingId,
        scheduledFor: transferScheduleTime.toISOString(),
        originalAmount: session.amount_total,
        applicationFee: applicationFee,
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
        stripeApplicationFeeAmount: applicationFee,
      })
      .where(eq(MeetingTable.id, meetingId));

    console.log("Transfer scheduled:", {
      transferId: transfer.id,
      amount: transfer.amount,
      applicationFee: applicationFee,
      destination: expertConnectAccountId,
      scheduledFor: transferScheduleTime,
      meetingId,
      totalAmount: session.amount_total,
    });

    return transfer;
  } catch (error) {
    console.error("Error scheduling transfer:", {
      error: error instanceof Error ? error.message : "Unknown error",
      meetingId,
      expertConnectAccountId,
      sessionAmount: session.amount_total,
      applicationFee: session.application_fee_amount,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = headers().get("stripe-signature");

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Missing stripe signature" },
        { status: 400 }
      );
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log("Received webhook event:", {
      type: event.type,
      id: event.id,
      timestamp: new Date().toISOString(),
    });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as StripeCheckoutSession;

      console.log("Processing completed checkout session:", {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        metadata: session.metadata,
      });

      let lastError: Error | unknown;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const result = await handleCheckoutSession(session);
          return NextResponse.json(result);
        } catch (error) {
          lastError = error;
          console.error("Error processing checkout session:", {
            error: error instanceof Error ? error.message : "Unknown error",
            attempt,
            sessionId: session.id,
            timestamp: new Date().toISOString(),
          });

          if (attempt < MAX_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          }
        }
      }

      console.error("Error processing webhook:", {
        eventType: event.type,
        error: lastError instanceof Error ? lastError.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: "Failed to process checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 400 }
    );
  }
}
