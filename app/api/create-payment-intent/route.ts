import { NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_CONFIG, calculateApplicationFee } from "@/config/stripe";
import { getOrCreateStripeCustomer } from "@/lib/stripe";
import { db } from "@/drizzle/db";
import { eq, and, sql } from "drizzle-orm";
import { EventTable, MeetingTable } from "@/drizzle/schema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});

async function validateMeetingTime(
  eventId: string,
  startTime: Date,
  durationInMinutes: number
) {
  // Check if time is in the future
  if (startTime.getTime() <= Date.now()) {
    return { valid: false, message: "Meeting time must be in the future" };
  }

  // Calculate end time
  const endTime = new Date(startTime.getTime() + durationInMinutes * 60 * 1000);

  // Check for overlapping meetings using SQL timestamp
  const existingMeeting = await db.query.MeetingTable.findFirst({
    where: and(
      eq(MeetingTable.eventId, eventId),
      sql`${MeetingTable.startTime} < ${endTime}::timestamp AND ${MeetingTable.endTime} > ${startTime}::timestamp`
    ),
  });

  if (existingMeeting) {
    return { valid: false, message: "This time slot is already booked" };
  }

  return { valid: true };
}

export async function POST(request: Request) {
  try {
    const { eventId, price, meetingData, username, eventSlug } =
      await request.json();

    // Validate required fields
    if (!price || !meetingData?.guestEmail || !meetingData?.startTime) {
      return NextResponse.json(
        {
          message:
            "Missing required fields: price, guest email, and start time are required",
          receivedData: {
            price,
            email: meetingData?.guestEmail,
            startTime: meetingData?.startTime,
          },
        },
        { status: 400 }
      );
    }

    try {
      // Get expert's Connect account ID and event details
      const event = await db.query.EventTable.findFirst({
        where: eq(EventTable.id, eventId),
        with: {
          user: true,
        },
      });

      if (!event?.user?.stripeConnectAccountId) {
        throw new Error("Expert's Connect account not found");
      }

      // Validate meeting time
      const startTime = new Date(meetingData.startTime);
      const timeValidation = await validateMeetingTime(
        eventId,
        startTime,
        event.durationInMinutes
      );

      if (!timeValidation.valid) {
        return NextResponse.json(
          { message: timeValidation.message },
          { status: 400 }
        );
      }

      // Check for existing pending payments for this time slot
      const pendingPayment = await db.query.MeetingTable.findFirst({
        where: and(
          eq(MeetingTable.eventId, eventId),
          eq(MeetingTable.startTime, startTime),
          eq(MeetingTable.stripePaymentStatus, "pending")
        ),
      });

      if (pendingPayment) {
        return NextResponse.json(
          { message: "This time slot has a pending payment" },
          { status: 400 }
        );
      }

      // Validate price matches event price
      if (price !== event.price) {
        return NextResponse.json(
          {
            message: "Invalid price",
            expectedPrice: event.price,
            receivedPrice: price,
          },
          { status: 400 }
        );
      }

      // Prepare meeting metadata with expert's clerkUserId
      const meetingMetadata = {
        ...meetingData,
        clerkUserId: event.clerkUserId,
        expertClerkUserId: event.clerkUserId,
        isGuest: "true",
        guestEmail: meetingData.guestEmail,
        timezone: meetingData.timezone,
        startTime: meetingData.startTime,
        endTime: new Date(
          startTime.getTime() + event.durationInMinutes * 60 * 1000
        ).toISOString(),
        durationInMinutes: event.durationInMinutes,
      };

      // Get or create customer first
      const customerId = await getOrCreateStripeCustomer(
        undefined,
        meetingData.guestEmail
      );

      console.log("Creating checkout session for customer:", customerId);

      // Create a Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: [...STRIPE_CONFIG.PAYMENT_METHODS],
        mode: "payment",
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes expiration
        payment_intent_data: {
          application_fee_amount: calculateApplicationFee(price),
          transfer_data: {
            destination: event.user.stripeConnectAccountId,
          },
          metadata: {
            eventId,
            meetingData: JSON.stringify(meetingMetadata),
            expertConnectAccountId: event.user.stripeConnectAccountId,
          },
        },
        line_items: [
          {
            price_data: {
              currency: STRIPE_CONFIG.CURRENCY,
              product_data: {
                name: `${event.name} - Consultation`,
                description: `Booking for ${meetingData.guestName} on ${new Date(
                  meetingData.startTime
                ).toLocaleString()} (${event.durationInMinutes} minutes)`,
              },
              unit_amount: Math.round(price),
            },
            quantity: 1,
          },
        ],
        metadata: {
          eventId,
          meetingData: JSON.stringify(meetingMetadata),
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

      console.log("Checkout session created:", {
        sessionId: session.id,
        startTime: meetingData.startTime,
        endTime: meetingMetadata.endTime,
        duration: event.durationInMinutes,
      });

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
