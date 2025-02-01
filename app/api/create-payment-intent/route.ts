import { NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_CONFIG } from "@/config/stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});

// Maximum number of retries for failed operations
const MAX_RETRIES = 3;

export async function POST(request: Request) {
  try {
    const { eventId, price, meetingData, username, eventSlug } =
      await request.json();

    // Generate a unique idempotency key
    const idempotencyKey = `payment_${eventId}_${meetingData.startTime}_${Date.now()}`;

    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        // Create a Checkout Session with idempotency key
        const session = await stripe.checkout.sessions.create(
          {
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
                    description: `Booking for ${meetingData.guestName} on ${new Date(
                      meetingData.startTime
                    ).toLocaleString()}`,
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
            success_url: `${request.headers.get(
              "origin"
            )}/${username}/${eventSlug}/success?session_id={CHECKOUT_SESSION_ID}&startTime=${encodeURIComponent(
              meetingData.startTime
            )}`,
            cancel_url: `${request.headers.get(
              "origin"
            )}/${username}/${eventSlug}?s=2&d=${encodeURIComponent(
              meetingData.date
            )}&t=${encodeURIComponent(
              meetingData.startTime
            )}&n=${encodeURIComponent(
              meetingData.guestName
            )}&e=${encodeURIComponent(
              meetingData.guestEmail
            )}&tz=${encodeURIComponent(meetingData.timezone)}`,
          },
          {
            idempotencyKey,
          }
        );

        return NextResponse.json({
          url: session.url,
        });
      } catch (error) {
        retries++;
        console.error("Checkout session creation attempt failed:", {
          error: error instanceof Error ? error.message : "Unknown error",
          attempt: retries,
          eventId,
          timestamp: new Date().toISOString(),
        });

        if (retries === MAX_RETRIES) {
          throw error;
        }
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
      }
    }
  } catch (error) {
    console.error("Checkout session creation failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
