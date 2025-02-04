import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/drizzle/db";
import { MeetingTable } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { email: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = decodeURIComponent(params.email);
    const appointments = await db.query.MeetingTable.findMany({
      where: and(
        eq(MeetingTable.clerkUserId, userId),
        eq(MeetingTable.guestEmail, email)
      ),
      orderBy: (meetings) => [meetings.startTime],
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error("Error fetching customer appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer appointments" },
      { status: 500 }
    );
  }
}
