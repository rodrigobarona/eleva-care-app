import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startTime = searchParams.get("startTime");
    const eventSlug = searchParams.get("eventSlug");

    if (!startTime || !eventSlug) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // First get the event by slug
    const event = await db.query.EventTable.findFirst({
      where: (events, { eq }) => eq(events.slug, eventSlug),
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Then check for the meeting
    const meeting = await db.query.MeetingTable.findFirst({
      where: ({ eventId, startTime: meetingStartTime }, { eq, and }) =>
        and(
          eq(eventId, event.id),
          eq(meetingStartTime, new Date(startTime))
        ),
    });

    return NextResponse.json({
      status: meeting ? "created" : "pending",
      meeting: meeting ? { id: meeting.id } : null,
    });
  } catch (error) {
    console.error("Error checking meeting status:", error);
    return NextResponse.json(
      { error: "Failed to check meeting status" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json({ message: "Method not implemented" }, { status: 501 });
} 