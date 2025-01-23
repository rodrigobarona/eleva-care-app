import { NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_CONFIG } from "@/config/stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});

export async function POST(request: Request) {
  try {
    const { eventId, price, meetingData, username, eventSlug } =
      await request.json();

    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      payment_intent_data: {
        metadata: {
          eventId,
          meetingData: JSON.stringify(meetingData),
        },
      },
      line_items: [
        {
          price_data: {
            currency: STRIPE_CONFIG.CURRENCY,
            product_data: {
              name: "Consultation Booking",
              description: `Booking for ${meetingData.guestName} on ${new Date(meetingData.startTime).toLocaleString()}`,
            },
            unit_amount: Math.round(price),
          },
          quantity: 1,
        },
      ],
      metadata: {
        eventId,
        meetingData: JSON.stringify(meetingData),
      },
      success_url: `${request.headers.get("origin")}/${username}/${eventSlug}/success?session_id={CHECKOUT_SESSION_ID}&startTime=${encodeURIComponent(meetingData.startTime)}`,
      cancel_url: `${request.headers.get("origin")}/${username}/${eventSlug}?s=2&d=${encodeURIComponent(meetingData.date)}&t=${encodeURIComponent(meetingData.startTime)}&n=${encodeURIComponent(meetingData.guestName)}&e=${encodeURIComponent(meetingData.guestEmail)}&tz=${encodeURIComponent(meetingData.timezone)}`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Checkout session creation failed:", error);
    return NextResponse.json(
      { error: "Checkout session creation failed" },
      { status: 500 }
    );
  }
}
