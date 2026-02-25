'use server';

import GoogleCalendarService from '@/server/googleCalendar';

/**
 * Google Calendar Client Wrapper
 *
 * This module provides server-side functions for interacting with Google Calendar.
 * It acts as a wrapper around the GoogleCalendarService, exposing simplified
 * functions for the most common calendar operations. All functions are server actions
 * that can be imported and called from client components.
 *
 * @module googleCalendarClient
 */

/**
 * Checks if a user has valid Google OAuth tokens
 *
 * Verifies that the specified Clerk user has connected their Google account
 * and that valid OAuth tokens exist. This is useful for determining if a user
 * needs to be prompted to connect their Google account.
 *
 * @param userId - Clerk user ID to check
 * @returns Promise that resolves to true if the user has valid tokens, false otherwise
 */
export async function hasValidTokens(userId: string): Promise<boolean> {
  return GoogleCalendarService.getInstance().hasValidTokens(userId);
}

/**
 * Queries busy time ranges for a user's primary calendar
 *
 * Uses the Google Calendar FreeBusy API to return only busy/free time
 * ranges without fetching any event content (titles, descriptions,
 * attendees). Google handles filtering of transparent and cancelled
 * events server-side.
 *
 * @param clerkUserId - Clerk user ID to query availability for
 * @param options - Object containing start and end dates for the time range
 * @param options.start - Start date of the time range
 * @param options.end - End date of the time range
 * @returns Promise that resolves to an array of busy time ranges with start and end times
 */
export async function getCalendarEventTimes(
  clerkUserId: string,
  { start, end }: { start: Date; end: Date },
) {
  return GoogleCalendarService.getInstance().getCalendarEventTimes(clerkUserId, {
    start,
    end,
  });
}

/**
 * Creates a new calendar event with Google Meet integration
 *
 * This is a simplified wrapper around the more comprehensive
 * GoogleCalendarService.createCalendarEvent method. It creates a calendar
 * event with Google Meet integration and handles all the necessary OAuth
 * authentication behind the scenes.
 *
 * @param params - Event creation parameters
 * @param params.clerkUserId - Clerk user ID of the calendar owner (expert)
 * @param params.guestName - Name of the guest/client
 * @param params.guestEmail - Email of the guest/client
 * @param params.startTime - Start time of the appointment
 * @param params.guestNotes - Optional notes from the guest
 * @param params.durationInMinutes - Duration of the appointment in minutes
 * @param params.eventName - Name/title of the event
 * @returns Promise that resolves to the created calendar event data with additional meet link information
 */
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
