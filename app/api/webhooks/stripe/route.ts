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
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      try {
        // Check if meeting already exists by payment intent ID
        const existingMeetingByPayment = await db.query.MeetingTable.findFirst({
          where: ({ paymentIntentId }, { eq }) =>
            eq(paymentIntentId, paymentIntent.id),
        });

        if (existingMeetingByPayment) {
          console.log(
            "Meeting already exists with payment intent:",
            paymentIntent.id
          );
          return NextResponse.json({ received: true });
        }

        // Parse meeting data and check by time and event
        const meetingData = JSON.parse(paymentIntent.metadata.meetingData);
        const existingMeetingByTime = await db.query.MeetingTable.findFirst({
          where: ({ eventId, startTime: meetingStartTime }, { eq, and }) =>
            and(
              eq(eventId, paymentIntent.metadata.eventId),
              eq(meetingStartTime, new Date(meetingData.startTime))
            ),
        });

        if (existingMeetingByTime) {
          console.log(
            "Meeting already exists for this time slot:",
            existingMeetingByTime.id
          );
          return NextResponse.json({ received: true });
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

        if (!meeting) {
          throw new Error("Failed to create meeting");
        }

        console.log("Meeting created successfully:", meeting);
        return NextResponse.json({ received: true });
      } catch (error) {
        console.error("Error processing payment:", error);
        return NextResponse.json({ received: true });
      }
    }

    // Handle other event types
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ received: true });
  }
}
