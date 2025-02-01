import { NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_CONFIG } from "@/config/stripe";
import { getOrCreateStripeCustomer } from "@/lib/stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});

// Maximum number of retries for failed operations
const MAX_RETRIES = 3;

export async function POST(request: Request) {
  try {
    const { eventId, price, meetingData, username, eventSlug } =
      await request.json();

    // Validate required fields
    if (!price || !meetingData?.guestEmail) {
      return NextResponse.json(
        {
          message:
            "Missing required fields: price and guest email are required",
          receivedData: { price, email: meetingData?.guestEmail },
        },
        { status: 400 }
      );
    }

    // Generate a unique idempotency key
    const idempotencyKey = `payment_${eventId}_${meetingData.startTime}_${Date.now()}`;

    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        // First, create or get customer with the guest email
        const customerId = await getOrCreateStripeCustomer(
          undefined, // No userId for guests
          meetingData.guestEmail
        );

        // Create a Checkout Session with idempotency key
        const session = await stripe.checkout.sessions.create(
          {
            customer: customerId, // Use the created/retrieved customer
            payment_method_types: [...STRIPE_CONFIG.PAYMENT_METHODS],
            mode: "payment",
            payment_intent_data: {
              metadata: {
                eventId,
                meetingData: JSON.stringify(meetingData),
                isGuest: "true",
                guestEmail: meetingData.guestEmail,
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
              isGuest: "true",
              guestEmail: meetingData.guestEmail,
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
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Checkout session creation attempt failed:", {
          error: errorMessage,
          attempt: retries,
          eventId,
          timestamp: new Date().toISOString(),
        });

        if (retries === MAX_RETRIES) {
          return NextResponse.json(
            {
              error: "Failed to create checkout session",
              details: errorMessage,
              code:
                error instanceof Stripe.errors.StripeError
                  ? error.code
                  : "unknown",
            },
            { status: 500 }
          );
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
      {
        error: "Failed to create checkout session",
        details: error instanceof Error ? error.message : "Unknown error",
        code:
          error instanceof Stripe.errors.StripeError ? error.code : "unknown",
      },
      { status: 500 }
    );
  }
}
