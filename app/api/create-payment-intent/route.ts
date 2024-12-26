import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(request: Request) {
  try {
    const { eventId, price, meetingData } = await request.json();

    // Stripe expects amount in cents/smallest currency unit
    const amount = Math.round(price * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Convert price to cents
      currency: "eur",
      metadata: {
        eventId,
        meetingData: JSON.stringify(meetingData),
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Payment intent creation failed:", error);
    return NextResponse.json(
      { error: "Payment intent creation failed" },
      { status: 500 }
    );
  }
}
