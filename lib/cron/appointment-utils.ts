/**
 * Shared utilities for appointment reminder cron jobs
 *
 * Contains common interfaces, queries, and formatting functions
 * used by both 24-hour and 1-hour reminder routes.
 */
import { db } from '@/drizzle/db';
import { EventTable, MeetingTable, ScheduleTable, UserTable } from '@/drizzle/schema';
import { and, between, eq } from 'drizzle-orm';

/**
 * Appointment data structure used by reminder cron jobs
 */
export interface Appointment {
  id: string;
  guestEmail: string;
  customerClerkId: string;
  expertClerkId: string;
  customerName: string;
  expertName: string;
  appointmentType: string;
  startTime: Date;
  durationMinutes: number;
  meetingUrl: string;
  customerLocale: string;
  expertLocale: string;
  customerTimezone: string;
  expertTimezone: string;
}

/**
 * Determines locale based on country code
 */
export function getLocaleFromCountry(country: string | null): string {
  switch (country?.toUpperCase()) {
    case 'PT':
      return 'pt-PT';
    case 'BR':
      return 'pt-BR';
    case 'ES':
      return 'es-ES';
    default:
      return 'en-US';
  }
}

/**
 * Formats a date into separate date and time parts for a given timezone and locale
 */
export function formatDateTime(
  date: Date,
  timezone: string,
  locale: string,
): { datePart: string; timePart: string } {
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formatted = formatter.formatToParts(date);
  const datePart = `${formatted.find((p) => p.type === 'day')?.value} ${formatted.find((p) => p.type === 'month')?.value} ${formatted.find((p) => p.type === 'year')?.value}`;
  const timePart = `${formatted.find((p) => p.type === 'hour')?.value}:${formatted.find((p) => p.type === 'minute')?.value}`;

  return { datePart, timePart };
}

/**
 * Formats a human-readable time until appointment string
 */
export function formatTimeUntilAppointment(appointmentTime: Date, locale: string): string {
  const now = new Date();
  const hoursUntil = Math.round((appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60));

  if (locale.startsWith('pt')) {
    if (hoursUntil <= 1) return 'em 1 hora';
    if (hoursUntil <= 24) return `em ${hoursUntil} horas`;
    return 'amanhã';
  } else if (locale.startsWith('es')) {
    if (hoursUntil <= 1) return 'en 1 hora';
    if (hoursUntil <= 24) return `en ${hoursUntil} horas`;
    return 'mañana';
  } else {
    if (hoursUntil <= 1) return 'in 1 hour';
    if (hoursUntil <= 24) return `in ${hoursUntil} hours`;
    return 'tomorrow';
  }
}

/**
 * Query database for appointments within a time window
 *
 * @param startOffsetMinutes - Minutes from now for window start
 * @param endOffsetMinutes - Minutes from now for window end
 * @returns Array of appointments needing reminders
 */
export async function getUpcomingAppointments(
  startOffsetMinutes: number,
  endOffsetMinutes: number,
): Promise<Appointment[]> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() + startOffsetMinutes * 60 * 1000);
    const windowEnd = new Date(now.getTime() + endOffsetMinutes * 60 * 1000);

    // Query for meetings that start within the specified window
    const upcomingMeetings = await db
      .select({
        meetingId: MeetingTable.id,
        guestEmail: MeetingTable.guestEmail,
        guestName: MeetingTable.guestName,
        startTime: MeetingTable.startTime,
        endTime: MeetingTable.endTime,
        timezone: MeetingTable.timezone,
        meetingUrl: MeetingTable.meetingUrl,
        eventName: EventTable.name,
        eventDuration: EventTable.durationInMinutes,
        expertClerkId: EventTable.clerkUserId,
        // Expert info
        expertFirstName: UserTable.firstName,
        expertLastName: UserTable.lastName,
        expertCountry: UserTable.country,
        // Expert's schedule timezone
        expertScheduleTimezone: ScheduleTable.timezone,
      })
      .from(MeetingTable)
      .innerJoin(EventTable, eq(EventTable.id, MeetingTable.eventId))
      .innerJoin(UserTable, eq(UserTable.clerkUserId, EventTable.clerkUserId))
      .leftJoin(ScheduleTable, eq(ScheduleTable.clerkUserId, EventTable.clerkUserId))
      .where(
        and(
          between(MeetingTable.startTime, windowStart, windowEnd),
          eq(MeetingTable.stripePaymentStatus, 'succeeded'), // Only confirmed appointments
        ),
      );

    console.log(
      `Found ${upcomingMeetings.length} appointments in window (${startOffsetMinutes}-${endOffsetMinutes} min)`,
    );

    // Transform the data to match the expected interface
    return upcomingMeetings.map((meeting) => {
      const expertName =
        [meeting.expertFirstName, meeting.expertLastName].filter(Boolean).join(' ') || 'Expert';

      // Use expert's schedule timezone if available, otherwise fall back to meeting timezone
      const expertTimezone = meeting.expertScheduleTimezone || meeting.timezone;

      return {
        id: meeting.meetingId,
        guestEmail: meeting.guestEmail,
        customerClerkId: 'guest', // Guests don't have Clerk IDs
        expertClerkId: meeting.expertClerkId,
        customerName: meeting.guestName,
        expertName,
        appointmentType: meeting.eventName,
        startTime: meeting.startTime,
        durationMinutes: meeting.eventDuration,
        meetingUrl: meeting.meetingUrl || `https://meet.eleva.care/${meeting.meetingId}`,
        customerLocale: 'en-US', // Default for guests
        expertLocale: getLocaleFromCountry(meeting.expertCountry),
        customerTimezone: meeting.timezone,
        expertTimezone,
      };
    });
  } catch (error) {
    console.error('Error querying upcoming appointments:', error);
    throw error;
  }
}
