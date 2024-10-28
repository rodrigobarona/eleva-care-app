"use server";
import { db } from "@/drizzle/db";
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule";
import { meetingActionSchema } from "@/schema/meetings";
import { logAuditEvent } from "@/lib/logAuditEvent";
import { headers } from "next/headers";
import "use-server";
import { z } from "zod";
import { createCalendarEvent } from "../googleCalendar";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";

export async function createMeeting(
  unsafeData: z.infer<typeof meetingActionSchema>
) {
  try {
    // Add try/catch for better error handling
    // Parse the incoming data with schema validation
    const { success, data } = meetingActionSchema.safeParse(unsafeData);

    if (!success) {
      console.error("Validation failed:", unsafeData);
      return { error: true, message: "Invalid data" };
    } // Exit if data validation fails

    // Retrieve the relevant event if it is active and belongs to the given user
    const event = await db.query.EventTable.findFirst({
      where: ({ clerkUserId, isActive, id }, { eq, and }) =>
        and(
          eq(isActive, true),
          eq(clerkUserId, data.clerkUserId),
          eq(id, data.eventId)
        ),
    });

    if (event == null) {
      console.error("Event not found:", data.eventId);
      return { error: true, message: "Event not found" };
    } // Exit if no valid event is found

    // Convert the start time to the specified timezone
    const startInTimezone = fromZonedTime(data.startTime, data.timezone);

    // Check if the chosen start time is valid based on the schedule
    const validTimes = await getValidTimesFromSchedule(
      [startInTimezone],
      event
    );
    if (validTimes.length === 0) {
      console.error("No valid times found for:", startInTimezone);
      return { error: true, message: "Invalid time slot" };
    } // Exit if no valid times are found

    const headersList = headers();

    const ipAddress = headersList.get("x-forwarded-for") ?? "Unknown";
    const userAgent = headersList.get("user-agent") ?? "Unknown";

    // Create a new calendar event
    try {
      await createCalendarEvent({
        ...data,
        startTime: startInTimezone,
        durationInMinutes: event.durationInMinutes,
        eventName: event.name,
      });
    } catch (calendarError) {
      console.error("Calendar creation failed:", calendarError);
      return { error: true, message: "Failed to create calendar event" };
    }

    // Log the audit event for meeting creation
    try {
      await logAuditEvent(
        data.clerkUserId, // User ID (related to the clerk user)
        "create", // Action type (creating a new meeting)
        "meetings", // Table name for audit logging
        data.eventId, // Event ID (foreign key for the event)
        null, // Previous data (none in this case)
        { ...data }, // Current data to log
        ipAddress, // IP address of the user
        userAgent // User agent for the audit log
      );
    } catch (auditError) {
      console.error("Audit logging failed:", auditError);
      // Consider if you want to fail the whole operation or just log the error
    }

    // Redirect to success page with the start time of the meeting
    redirect(
      `/book/${data.clerkUserId}/${
        data.eventId
      }/success?startTime=${data.startTime.toISOString()}`
    );
  } catch (error) {
    console.error("Meeting creation failed:", error);
    return { error: true, message: "Failed to create meeting" };
  }
}
