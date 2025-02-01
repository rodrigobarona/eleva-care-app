import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { STRIPE_CONFIG } from "@/config/stripe";
import { db } from "@/drizzle/db";
import { UserTable, MeetingTable } from "@/drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: STRIPE_CONFIG.API_VERSION,
});

// Mark route as dynamic
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return new NextResponse("Missing code parameter", { status: 400 });
    }

    // Exchange the authorization code for an access token
    const stripeResponse = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    // Get the connected account ID
    const connectedAccountId = stripeResponse.stripe_user_id;

    if (!connectedAccountId) {
      return new NextResponse("Failed to get connected account ID", {
        status: 400,
      });
    }

    // Update the user's record with the connected account ID
    await db
      .update(UserTable)
      .set({
        stripeConnectAccountId: connectedAccountId,
        updatedAt: new Date(),
      })
      .where(eq(UserTable.clerkUserId, userId));

    // Get expert's earnings
    const expertEarnings = await db
      .select({
        total: sql`sum(${MeetingTable.stripeAmount})`,
      })
      .from(MeetingTable)
      .where(
        and(
          eq(MeetingTable.clerkUserId, userId),
          eq(MeetingTable.stripePaymentStatus, "succeeded")
        )
      );

    return NextResponse.json({
      success: true,
      earnings: Number(expertEarnings[0].total) || 0,
    });
  } catch (error) {
    console.error("Error handling Stripe Connect callback:", error);
    return new NextResponse(
      error instanceof Error ? error.message : "Internal Server Error",
      { status: 500 }
    );
  }
}
