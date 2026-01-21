/**
 * Shared utilities for appointment reminder cron jobs
 * Used by both 24-hour and 1-hour reminder routes
 */
import { db } from '@/drizzle/db';
import { EventTable, MeetingTable, ScheduleTable, UserTable } from '@/drizzle/schema';
import { and, between, eq } from 'drizzle-orm';

/**
 * Common appointment interface used across reminder jobs
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
  endTime: Date;
  durationMinutes: number;
  meetingUrl: string;
  customerLocale: string;
  expertLocale: string;
  customerTimezone: string;
  expertTimezone: string;
}

/**
 * Get locale code from country code
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
 * Query database for appointments starting within a time window
 * @param startOffset - Minutes from now to start the window
 * @param endOffset - Minutes from now to end the window
 */
export async function getUpcomingAppointments(
  startOffset: number,
  endOffset: number,
): Promise<Appointment[]> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() + startOffset * 60 * 1000);
    const windowEnd = new Date(now.getTime() + endOffset * 60 * 1000);

    // Query for meetings within the specified time window
    // Join with ScheduleTable to get expert's actual timezone
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
        // Expert's actual timezone from their schedule settings
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

    // Transform the data to match the expected interface
    const appointments: Appointment[] = upcomingMeetings.map((meeting) => {
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
        endTime: meeting.endTime,
        durationMinutes: meeting.eventDuration,
        meetingUrl: meeting.meetingUrl || `https://meet.eleva.care/${meeting.meetingId}`,
        customerLocale: 'en-US', // Default for guests, could be enhanced with guest preferences
        expertLocale: getLocaleFromCountry(meeting.expertCountry),
        customerTimezone: meeting.timezone, // Patient's timezone from booking
        expertTimezone, // Expert's actual timezone from schedule settings
      };
    });

    return appointments;
  } catch (error) {
    console.error('Error querying upcoming appointments:', error);
    throw error;
  }
}

/**
 * Format date/time for display in emails
 * Returns both date and time parts separately for flexible templating
 */
export function formatDateTime(
  date: Date,
  timezone: string,
  locale: string,
): { datePart: string; timePart: string } {
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const timeFormatter = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });

  return {
    datePart: dateFormatter.format(date),
    timePart: timeFormatter.format(date),
  };
}

/**
 * Format time until appointment for human-readable display
 */
export function formatTimeUntilAppointment(appointmentTime: Date, locale: string): string {
  const now = new Date();
  const hoursUntil = Math.round((appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60));

  if (locale.startsWith('pt')) {
    if (hoursUntil <= 1) return 'em menos de 1 hora';
    if (hoursUntil < 24) return `em ${hoursUntil} horas`;
    return 'amanhã';
  }

  if (hoursUntil <= 1) return 'in less than 1 hour';
  if (hoursUntil < 24) return `in ${hoursUntil} hours`;
  return 'tomorrow';
}
