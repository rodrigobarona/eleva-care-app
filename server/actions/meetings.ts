"use server";
import { db } from "@/drizzle/db";
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule";
import { meetingActionSchema } from "@/schema/meetings";
import "use-server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/logAuditEvent";
import { headers } from "next/headers";
import { createCalendarEvent } from "../googleCalendar";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";

export async function createMeeting(
  unsafeData: z.infer<typeof meetingActionSchema>,
) {
  try {
    console.log("Debug: Starting meeting creation", { 
      receivedData: unsafeData 
    });

    const { success, data: validatedData } = meetingActionSchema.safeParse(unsafeData);

    if (!success) {
      console.error("Debug: Validation failed", { 
        validationErrors: validatedData.errors 
      });
      return { error: true };
    }

    console.log("Debug: Attempting database operation");

    const event = await db.query.EventTable.findFirst({
      where: ({ clerkUserId, isActive, id }, { eq, and }) =>
        and(
          eq(isActive, true),
          eq(clerkUserId, validatedData.clerkUserId),
          eq(id, validatedData.eventId),
        ),
    });

    if (event == null) return { error: true };
    const startInTimezone = fromZonedTime(validatedData.startTime, validatedData.timezone);

    const validTimes = await getValidTimesFromSchedule([startInTimezone], event);
    if (validTimes.length === 0) return { error: true };

    const headersList = headers();

    const ipAddress = headersList.get("x-forwarded-for") ?? "Unknown";
    const userAgent = headersList.get("user-agent") ?? "Unknown";

    await createCalendarEvent({
      ...validatedData,
      startTime: startInTimezone,
      durationInMinutes: event.durationInMinutes,
      eventName: event.name,
    });

    // Log the audit event for meeting creation
    await logAuditEvent(
      validatedData.clerkUserId, // User ID (related to the clerk user)
      "create", // Action type (creating a new meeting)
      "meetings", // Table name for audit logging
      validatedData.eventId, // Event ID (foreign key for the event)
      null, // Previous data (none in this case)
      { ...validatedData }, // Current data to log
      ipAddress, // IP address of the user
      userAgent, // User agent for the audit log
    );

    redirect(
      `/book/${validatedData.clerkUserId}/${
        validatedData.eventId
      }/success?startTime=${validatedData.startTime.toISOString()}`,
    );

    console.log("Debug: Database operation complete", { 
      result: validatedData 
    });

    return validatedData;
  } catch (error) {
    console.error("Debug: Server error in createMeeting", {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return { error: true };
  }
}
