import { headers } from "next/headers";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createMeeting } from "@/server/actions/meetings";
import { db } from "@/drizzle/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

const relevantEvents = new Set([
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled'
]);

// Add GET handler to explain the endpoint
export async function GET() {
  return NextResponse.json(
    { error: "This endpoint only accepts POST requests from Stripe webhooks" },
    { status: 405 }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = headers().get("stripe-signature");

    console.log(`🔔 Webhook received with signature: ${signature?.slice(0, 10)}...`);

    if (!signature || !webhookSecret) {
      console.error('❌ Missing webhook secret or signature');
      return NextResponse.json(
        { error: "Configuration error" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log(`✅ Webhook verified: ${event.type}`);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 400 }
      );
    }

    console.log("Webhook event:", {
      type: event.type,
      id: event.id,
    });

    if (!relevantEvents.has(event.type)) {
      console.log(`🔕 Unhandled event type: ${event.type}`);
      return NextResponse.json(
        { error: `Unhandled event type: ${event.type}` },
        { status: 400 }
      );
    }

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Processing payment intent:", paymentIntent.id);

        const meetingData = JSON.parse(paymentIntent.metadata.meetingData);

        // Check if we've already processed this event
        const existingMeeting = await db.query.MeetingTable.findFirst({
          where: ({ eventId, stripePaymentIntentId }, { eq, and }) =>
            and(
              eq(eventId, paymentIntent.metadata.eventId),
              eq(stripePaymentIntentId, paymentIntent.id)
            ),
        });

        if (existingMeeting) {
          console.log(`⏭️ Skipping duplicate payment: ${paymentIntent.id}`);
          return NextResponse.json({ received: true });
        }

        try {
          await createMeeting({
            eventId: paymentIntent.metadata.eventId,
            clerkUserId: meetingData.clerkUserId,
            guestEmail: meetingData.guestEmail,
            guestName: meetingData.guestName,
            timezone: meetingData.timezone,
            startTime: new Date(meetingData.startTime),
            guestNotes: meetingData.guestNotes || "",
          });

          console.log(
            "Meeting created successfully for payment:",
            paymentIntent.id
          );
          return NextResponse.json({ received: true });
        } catch (error) {
          console.error("Error creating meeting:", error);
          return NextResponse.json(
            { error: "Failed to create meeting" },
            { status: 500 }
          );
        }
      }
      case "payment_intent.payment_failed":
        console.log(`❌ Payment failed: ${event.data.object.id}`);
        // Handle failed payment
        break;
      case "payment_intent.canceled":
        console.log(`🚫 Payment canceled: ${event.data.object.id}`);
        // Handle canceled payment
        break;
      default:
        throw new Error('Unhandled relevant event!');
    }

    return NextResponse.json({ received: true });
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
