import { headers } from "next/headers";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createMeeting } from "@/server/actions/meetings";

// Export config to disable body parsing
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "auto";
export const maxDuration = 60;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

// Add GET handler to explain the endpoint
export async function GET() {
  return NextResponse.json(
    { error: "This endpoint only accepts POST requests from Stripe webhooks" },
    { status: 405 }
  );
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
      console.error("Received signature:", signature);
      console.error(
        "Webhook secret:",
        `${webhookSecret.slice(0, 4)}...${webhookSecret.slice(-4)}`
      );
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    console.log("Processing webhook event:", event.type);

    switch (event.type) {
      case "payment_intent.created": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment intent created:", paymentIntent.id, "Status:", paymentIntent.status);
        return NextResponse.json({ received: true });
      }

      case "payment_intent.amount_capturable_updated": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment amount capturable updated:", paymentIntent.id, 
          "Amount capturable:", paymentIntent.amount_capturable);
        return NextResponse.json({ received: true });
      }

      case "payment_intent.canceled": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment canceled:", paymentIntent.id, 
          "Cancellation reason:", paymentIntent.cancellation_reason);
        return NextResponse.json({ received: true });
      }

      case "payment_intent.partially_funded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment partially funded:", paymentIntent.id, 
          "Amount received:", paymentIntent.amount_received,
          "Total amount:", paymentIntent.amount);
        return NextResponse.json({ received: true });
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment failed:", paymentIntent.id, 
          "Error:", paymentIntent.last_payment_error?.message);
        return NextResponse.json({ received: true });
      }

      case "payment_intent.processing": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment processing:", paymentIntent.id, 
          "Processing:", paymentIntent.processing);
        return NextResponse.json({ received: true });
      }

      case "payment_intent.requires_action": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment requires action:", paymentIntent.id, 
          "Next action:", paymentIntent.next_action?.type);
        return NextResponse.json({ received: true });
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Processing successful payment:", paymentIntent.id);

        try {
          if (!paymentIntent.metadata.meetingData) {
            console.error("No meeting data found in payment intent metadata");
            return NextResponse.json(
              { error: "Missing meeting data" },
              { status: 400 }
            );
          }

          const meetingData = JSON.parse(paymentIntent.metadata.meetingData);
          console.log("Parsed meeting data:", meetingData);

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
          return NextResponse.json({ received: true });
        } catch (error) {
          console.error("Error processing payment success:", error);
          return NextResponse.json(
            { error: "Failed to process payment success" },
            { status: 500 }
          );
        }
      }

      default: {
        // Check if the object is a PaymentIntent before accessing status
        const object = event.data.object;
        const status = 'object' in object && 'status' in object ? object.status : 'unknown';
        
        console.log(`Unhandled event type: ${event.type}`, 
          "Object status:", status
        );
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
