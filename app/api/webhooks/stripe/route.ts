import { headers } from "next/headers";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createMeeting } from "@/server/actions/meetings";
import { db } from "@/drizzle/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

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

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
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
