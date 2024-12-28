import { NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_CONFIG } from "@/config/stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(request: Request) {
  try {
    const { eventId, price, meetingData } = await request.json();

    // Create payment intent with specific configuration
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price),
      currency: "eur",
      payment_method_types: [...STRIPE_CONFIG.PAYMENT_METHODS],
      capture_method: "automatic",
      confirmation_method: "automatic",
      setup_future_usage: undefined,
      payment_method_options: {
        card: {
          request_three_d_secure: "automatic",
        },
      },
      metadata: {
        eventId,
        meetingData: JSON.stringify(meetingData),
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Payment intent creation failed:", error);
    return NextResponse.json(
      { error: "Payment intent creation failed" },
      { status: 500 }
    );
  }
}
