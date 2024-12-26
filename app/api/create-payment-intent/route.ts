import { NextResponse } from "next/server";
import { stripe, PAYMENT_METHODS } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const { eventId, price, meetingData } = await request.json();

    if (!price || price <= 0) {
      return NextResponse.json(
        { error: "Invalid price for payment intent" },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(price),
      currency: "eur",
      payment_method_types: [...PAYMENT_METHODS],
      metadata: {
        eventId,
        meetingData: JSON.stringify(meetingData),
      },
      payment_method_options: {
        card: {
          request_three_d_secure: "automatic",
        },
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
