import { NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_CONFIG, calculateApplicationFee } from "@/config/stripe";
import { getOrCreateStripeCustomer } from "@/lib/stripe";
import { db } from "@/drizzle/db";
import { eq } from "drizzle-orm";
import { EventTable } from "@/drizzle/schema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});

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

    try {
      // Get expert's Connect account ID
      const event = await db.query.EventTable.findFirst({
        where: eq(EventTable.id, eventId),
        with: {
          user: true,
        },
      });

      if (!event?.user?.stripeConnectAccountId) {
        throw new Error("Expert's Connect account not found");
      }

      // Get or create customer first
      const customerId = await getOrCreateStripeCustomer(
        undefined, // No userId for guests
        meetingData.guestEmail
      );

      console.log("Creating checkout session for customer:", customerId);

      // Create a Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: [...STRIPE_CONFIG.PAYMENT_METHODS],
        mode: "payment",
        payment_intent_data: {
          application_fee_amount: calculateApplicationFee(price),
          transfer_data: {
            destination: event.user.stripeConnectAccountId,
          },
          metadata: {
            eventId,
            meetingData: JSON.stringify(meetingData),
            isGuest: "true",
            guestEmail: meetingData.guestEmail,
            expertConnectAccountId: event.user.stripeConnectAccountId,
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
          expertConnectAccountId: event.user.stripeConnectAccountId,
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
      });

      console.log("Checkout session created:", session.id);

      return NextResponse.json({
        url: session.url,
      });
    } catch (error) {
      console.error("Checkout session creation failed:", {
        error: error instanceof Error ? error.message : "Unknown error",
        customerId: error instanceof Error ? error.cause : undefined,
      });
      throw error;
    }
  } catch (error) {
    console.error("Request processing failed:", {
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
