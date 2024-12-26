import { db } from "@/drizzle/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startTime = searchParams.get("startTime");
  const eventSlug = searchParams.get("eventSlug");

  if (!startTime || !eventSlug) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    // First get the event
    const event = await db.query.EventTable.findFirst({
      where: ({ slug }, { eq }) => eq(slug, eventSlug),
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Then check if meeting exists
    const meeting = await db.query.MeetingTable.findFirst({
      where: ({ eventId, startTime: meetingStartTime }, { eq, and }) =>
        and(
          eq(eventId, event.id),
          eq(meetingStartTime, new Date(startTime))
        ),
    });

    return NextResponse.json({
      status: meeting ? "created" : "pending",
    });
  } catch (error) {
    console.error("Error checking meeting status:", error);
    return NextResponse.json(
      { error: "Failed to check meeting status" },
      { status: 500 }
    );
  }
} 