import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(request: Request) {
  try {
    const { eventId, price, meetingData } = await request.json();

    // Create payment intent with specific payment methods
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price),
      currency: "eur",
      payment_method_types: ['card', 'sepa_debit', 'multibanco'],
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
