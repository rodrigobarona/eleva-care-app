import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export async function POST(req: Request) {
  try {
    const { price, eventId, meetingData } = await req.json();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: price,
      currency: "eur",
      // Enable automatic payment methods
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        eventId,
        meetingData: JSON.stringify(meetingData),
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
