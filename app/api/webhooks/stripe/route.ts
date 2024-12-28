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

    console.log("Webhook received", {
      hasSignature: !!signature,
      bodyLength: body.length,
      method: req.method,
    });

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

    console.log("Webhook event:", {
      type: event.type,
      id: event.id,
    });

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Processing payment intent:", paymentIntent.id);

        const meetingData = JSON.parse(paymentIntent.metadata.meetingData);

        // Check if meeting already exists to prevent duplicates
        const existingMeeting = await db.query.MeetingTable.findFirst({
          where: ({ eventId, startTime }, { eq, and }) =>
            and(
              eq(eventId, paymentIntent.metadata.eventId),
              eq(startTime, new Date(meetingData.startTime))
            ),
        });

        if (existingMeeting) {
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
