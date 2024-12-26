import { headers } from "next/headers";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createMeeting } from "@/server/actions/meetings";

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

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const meetingData = paymentIntent.metadata;
        
        // Parse the startTime from metadata since it's stored as string
        const startTime = new Date(meetingData.startTime);
        
        await createMeeting({
          eventId: meetingData.eventId,
          clerkUserId: meetingData.clerkUserId,
          guestEmail: meetingData.guestEmail,
          guestName: meetingData.guestName,
          timezone: meetingData.timezone,
          guestNotes: meetingData.guestNotes,
          startTime, // Already converted Date object
        });
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const error = err as Error;
    console.error("Webhook error:", error.message);
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }
}
