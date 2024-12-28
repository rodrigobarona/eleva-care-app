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

    console.log("Webhook called with signature:", signature?.slice(0, 10));

    if (!signature) {
      console.error("Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
      console.log("Webhook event constructed successfully:", event.type);

      switch (event.type) {
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log("Processing payment_intent.succeeded:", paymentIntent.id);
          console.log("Meeting data:", paymentIntent.metadata.meetingData);
          
          try {
            const meetingData = JSON.parse(paymentIntent.metadata.meetingData);
            await createMeeting({
              eventId: paymentIntent.metadata.eventId,
              clerkUserId: meetingData.clerkUserId,
              guestEmail: meetingData.guestEmail,
              guestName: meetingData.guestName,
              timezone: meetingData.timezone,
              startTime: new Date(meetingData.startTime),
              guestNotes: meetingData.guestNotes || "",
            });
            
            console.log("Meeting created successfully");
            return NextResponse.json({ received: true });
          } catch (error) {
            console.error('Error creating meeting:', error);
            return NextResponse.json(
              { error: 'Failed to create meeting' },
              { status: 500 }
            );
          }
        }
        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.error(`PaymentIntent failed: ${paymentIntent.id}`);
          break;
        }
      }

      return NextResponse.json({ received: true });
    } catch (err) {
      console.error("Error constructing webhook event:", err);
      throw err;
    }
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 400 }
    );
  }
}
