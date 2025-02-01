import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/drizzle/db";
import { UserTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getStripeConnectAccountStatus } from "@/lib/stripe";

// Mark route as dynamic
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, userId),
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    let accountStatus = null;
    if (dbUser.stripeConnectAccountId) {
      accountStatus = await getStripeConnectAccountStatus(
        dbUser.stripeConnectAccountId
      );
    }

    return NextResponse.json({
      user: dbUser,
      accountStatus,
    });
  } catch (error) {
    console.error("Error in billing API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
