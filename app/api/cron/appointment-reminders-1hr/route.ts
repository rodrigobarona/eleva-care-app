import { triggerWorkflow } from '@/app/utils/novu';
import { db } from '@/drizzle/db';
import { EventsTable, MeetingsTable, ProfilesTable, UsersTable } from '@/drizzle/schema-workos';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { and, between, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

interface Appointment {
  id: string;
  customerClerkId: string;
  expertClerkId: string;
  customerName: string;
  expertName: string;
  appointmentType: string;
  startTime: Date;
  meetingUrl: string;
  customerLocale: string;
  expertLocale: string;
  customerTimezone: string;
  expertTimezone: string;
}

// Query database for appointments starting in the next 1-1.25 hours
async function getUpcomingAppointments(): Promise<Appointment[]> {
  try {
    const now = new Date();
    const in1Hour = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour from now
    const in75Minutes = new Date(now.getTime() + 75 * 60 * 1000); // 1.25 hours from now

    // Query for meetings that start between 1-1.25 hours from now
    // This gives us a 15-minute window to catch all appointments for urgent reminders
    const upcomingMeetings = await db
      .select({
        meetingId: MeetingsTable.id,
        guestEmail: MeetingsTable.guestEmail,
        guestName: MeetingsTable.guestName,
        startTime: MeetingsTable.startTime,
        endTime: MeetingsTable.endTime,
        timezone: MeetingsTable.timezone,
        meetingUrl: MeetingsTable.meetingUrl,
        eventName: EventsTable.name,
        expertClerkId: EventsTable.workosUserId,
        // Expert info from UsersTable
        expertCountry: UsersTable.country,
        // Expert professional name from ProfilesTable (for email display)
        expertFirstName: ProfilesTable.firstName,
        expertLastName: ProfilesTable.lastName,
      })
      .from(MeetingsTable)
      .innerJoin(EventsTable, eq(EventsTable.id, MeetingsTable.eventId))
      .innerJoin(UsersTable, eq(UsersTable.workosUserId, EventsTable.workosUserId))
      .innerJoin(ProfilesTable, eq(ProfilesTable.workosUserId, EventsTable.workosUserId))
      .where(
        and(
          between(MeetingsTable.startTime, in1Hour, in75Minutes),
          eq(MeetingsTable.stripePaymentStatus, 'succeeded'), // Only confirmed appointments
        ),
      );

    console.log(`Found ${upcomingMeetings.length} appointments for 1-hour urgent reminders`);

    // Transform the data to match the expected interface
    const appointments: Appointment[] = upcomingMeetings.map((meeting) => {
      // Determine locales based on country
      const getLocaleFromCountry = (country: string | null): string => {
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
      };

      const expertName =
        [meeting.expertFirstName, meeting.expertLastName].filter(Boolean).join(' ') || 'Expert';

      return {
        id: meeting.meetingId,
        customerClerkId: 'guest', // Guests don't have Clerk IDs
        expertClerkId: meeting.expertClerkId,
        customerName: meeting.guestName,
        expertName,
        appointmentType: meeting.eventName,
        startTime: meeting.startTime,
        meetingUrl: meeting.meetingUrl || `https://meet.eleva.care/${meeting.meetingId}`,
        customerLocale: 'en-US', // Default for guests
        expertLocale: getLocaleFromCountry(meeting.expertCountry),
        customerTimezone: meeting.timezone,
        expertTimezone: meeting.timezone,
      };
    });

    return appointments;
  } catch (error) {
    console.error('Error querying upcoming appointments for 1hr reminders:', error);
    throw error;
  }
}

async function formatDateTime(date: Date, timezone: string, locale: string) {
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

async function handler() {
  console.log('⚡ Running 1-hour urgent appointment reminder cron job...');

  try {
    const appointments = await getUpcomingAppointments();
    console.log(`Found ${appointments.length} appointments needing urgent reminders`);

    for (const appointment of appointments) {
      // Send urgent reminder to expert (experts have Clerk IDs)
      try {
        const expertDateTime = await formatDateTime(
          appointment.startTime,
          appointment.expertTimezone,
          appointment.expertLocale,
        );

        await triggerWorkflow({
          workflowId: 'appointment-universal',
          to: {
            subscriberId: appointment.expertClerkId,
          },
          payload: {
            eventType: 'reminder',
            expertName: appointment.expertName,
            customerName: appointment.customerName,
            serviceName: appointment.appointmentType,
            appointmentDate: expertDateTime.datePart,
            appointmentTime: expertDateTime.timePart,
            timezone: appointment.expertTimezone,
            message: `🚨 URGENT: Your appointment with ${appointment.customerName} starts in 1 hour!`,
            meetLink: appointment.meetingUrl,
          },
        });

        console.log(`⚡ URGENT reminder sent to expert: ${appointment.expertClerkId}`);
      } catch (error) {
        console.error(
          `❌ Failed to send urgent reminder to expert ${appointment.expertClerkId}:`,
          error,
        );
      }
    }

    console.log('🎉 1-hour urgent appointment reminder cron job completed');
    return NextResponse.json({ success: true, count: appointments.length });
  } catch (error) {
    console.error('❌ Error in 1-hour appointment reminder cron job:', error);
    return NextResponse.json({ error: 'Failed to process urgent reminders' }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
