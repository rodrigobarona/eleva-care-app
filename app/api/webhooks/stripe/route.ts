import { headers } from "next/headers";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createMeeting } from "@/server/actions/meetings";
import { db } from "@/drizzle/db";

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
    const body = await req.text();
    const signature = headers().get("stripe-signature");

    if (!signature) {
      console.error("Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );

    console.log("Processing webhook event:", event.type);

    switch (event.type) {
      case "payment_intent.created": {
        console.log("Payment intent created:", event.data.object.id);
        return NextResponse.json({ received: true });
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Processing successful payment:", paymentIntent.id);

        if (!paymentIntent.metadata.meetingData) {
          console.error("No meeting data found in payment intent metadata");
          return NextResponse.json({ error: "Invalid payment intent data" }, { status: 400 });
        }

        const meetingData = JSON.parse(paymentIntent.metadata.meetingData);

        // Check if meeting already exists
        const existingMeeting = await db.query.MeetingTable.findFirst({
          where: ({ eventId, startTime }, { eq, and }) =>
            and(
              eq(eventId, paymentIntent.metadata.eventId),
              eq(startTime, new Date(meetingData.startTime))
            ),
        });

        if (existingMeeting) {
          console.log("Meeting already exists:", existingMeeting.id);
          return NextResponse.json({ received: true });
        }

        try {
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
          console.error("Error creating meeting:", error);
          return NextResponse.json(
            { error: "Failed to create meeting" },
            { status: 500 }
          );
        }
      }

      default: {
        console.log("Unhandled event type:", event.type);
        return NextResponse.json({ received: true });
      }
    }
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: `Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 400 }
    );
  }
}
