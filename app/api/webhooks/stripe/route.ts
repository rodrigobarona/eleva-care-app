import { headers } from "next/headers";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createMeeting } from "@/server/actions/meetings";
import { STRIPE_CONFIG } from "@/config/stripe";

// Export config to disable body parsing
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
export const maxDuration = 60;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

// Add GET handler to explain the endpoint
export async function GET() {
  return NextResponse.json(
    { error: "This endpoint only accepts POST requests from Stripe webhooks" },
    { status: 405 }
  );
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  console.log("Processing successful payment:", paymentIntent.id);

  try {
    if (!paymentIntent.metadata?.meetingData) {
      // If metadata is not in PaymentIntent, try to get it from the Checkout Session
      const session = await stripe.checkout.sessions.list({
        payment_intent: paymentIntent.id,
        limit: 1,
      });

      if (!session.data[0]?.metadata?.meetingData) {
        throw new Error("No meeting data found in metadata");
      }

      paymentIntent.metadata = session.data[0].metadata;
    }

    const meetingData = JSON.parse(paymentIntent.metadata.meetingData);
    console.log("Parsed meeting data:", meetingData);

    // Validate required fields
    if (
      !meetingData.startTime ||
      !meetingData.clerkUserId ||
      !meetingData.guestEmail
    ) {
      throw new Error("Missing required meeting data fields");
    }

    const meeting = await createMeeting({
      eventId: paymentIntent.metadata.eventId,
      clerkUserId: meetingData.clerkUserId,
      guestEmail: meetingData.guestEmail,
      guestName: meetingData.guestName,
      timezone: meetingData.timezone,
      startTime: new Date(meetingData.startTime),
      guestNotes: meetingData.guestNotes || "",
      paymentIntentId: paymentIntent.id,
    });

    console.log("Meeting created successfully:", meeting);
    return { success: true };
  } catch (error) {
    console.error("Error processing payment success:", error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    // Get the raw request body as a buffer
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
      // Verify the event with the raw body
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log(
        "✅ Webhook signature verified successfully for event:",
        event.type
      );
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    console.log("Processing webhook event:", event.type);

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        try {
          await handlePaymentSuccess(paymentIntent);
          return NextResponse.json({ received: true });
        } catch (error) {
          console.error("Failed to process payment success:", error);
          return NextResponse.json(
            { error: "Failed to process payment success" },
            { status: 500 }
          );
        }
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_intent) {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            session.payment_intent as string
          );
          try {
            await handlePaymentSuccess(paymentIntent);
            return NextResponse.json({ received: true });
          } catch (error) {
            console.error("Failed to process payment success:", error);
            return NextResponse.json(
              { error: "Failed to process payment success" },
              { status: 500 }
            );
          }
        }
        return NextResponse.json({ received: true });
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session expired:", session.id);
        return NextResponse.json({ received: true });
      }

      default: {
        console.log(`Unhandled event type: ${event.type}`);
        return NextResponse.json({ received: true });
      }
    }
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      {
        error: `Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      },
      { status: 400 }
    );
  }
}
