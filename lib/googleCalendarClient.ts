"use server";

import GoogleCalendarService from "@/server/googleCalendar";

export async function hasValidTokens(userId: string): Promise<boolean> {
  return GoogleCalendarService.getInstance().hasValidTokens(userId);
}

export async function getCalendarEventTimes(
  clerkUserId: string,
  { start, end }: { start: Date; end: Date }
) {
  return GoogleCalendarService.getInstance().getCalendarEventTimes(
    clerkUserId,
    {
      start,
      end,
    }
  );
}

export async function createCalendarEvent(params: {
  clerkUserId: string;
  guestName: string;
  guestEmail: string;
  startTime: Date;
  guestNotes?: string | null;
  durationInMinutes: number;
  eventName: string;
}) {
  return GoogleCalendarService.getInstance().createCalendarEvent(params);
}
