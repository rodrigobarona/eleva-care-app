import { triggerWorkflow } from '@/app/utils/novu';
import { db } from '@/drizzle/db';
import { EventTable, MeetingTable, UserTable } from '@/drizzle/schema';
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

// Query database for appointments starting in the next 24-25 hours
async function getUpcomingAppointments(): Promise<Appointment[]> {
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Query for meetings that start between 24-25 hours from now
    // This gives us a 1-hour window to catch all appointments for the next day
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
        expertClerkId: EventTable.clerkUserId,
        // Expert info
        expertFirstName: UserTable.firstName,
        expertLastName: UserTable.lastName,
        expertCountry: UserTable.country,
      })
      .from(MeetingTable)
      .innerJoin(EventTable, eq(EventTable.id, MeetingTable.eventId))
      .innerJoin(UserTable, eq(UserTable.clerkUserId, EventTable.clerkUserId))
      .where(
        and(
          between(MeetingTable.startTime, in24Hours, in25Hours),
          eq(MeetingTable.stripePaymentStatus, 'succeeded'), // Only confirmed appointments
        ),
      );

    console.log(`Found ${upcomingMeetings.length} upcoming appointments for reminders`);

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
        customerClerkId: 'guest', // Guests don't have Clerk IDs, we'll handle this differently
        expertClerkId: meeting.expertClerkId,
        customerName: meeting.guestName,
        expertName,
        appointmentType: meeting.eventName,
        startTime: meeting.startTime,
        meetingUrl: meeting.meetingUrl || `https://meet.eleva.care/${meeting.meetingId}`,
        customerLocale: 'en-US', // Default for guests, could be enhanced with guest preferences
        expertLocale: getLocaleFromCountry(meeting.expertCountry),
        customerTimezone: meeting.timezone,
        expertTimezone: meeting.timezone, // Using meeting timezone as default
      };
    });

    return appointments;
  } catch (error) {
    console.error('Error querying upcoming appointments:', error);
    throw error;
  }
}

async function formatTimeUntilAppointment(appointmentTime: Date, locale: string): Promise<string> {
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
  console.log('🔔 Running appointment reminder cron job...');

  try {
    const appointments = await getUpcomingAppointments();
    console.log(`Found ${appointments.length} appointments needing reminders`);

    for (const appointment of appointments) {
      // Send reminder to expert (experts have Clerk IDs)
      try {
        const expertDateTime = await formatDateTime(
          appointment.startTime,
          appointment.expertTimezone,
          appointment.expertLocale,
        );

        const expertTimeUntil = await formatTimeUntilAppointment(
          appointment.startTime,
          appointment.expertLocale,
        );

        await triggerWorkflow({
          workflowId: 'appointment-reminder-24hr',
          to: {
            subscriberId: appointment.expertClerkId,
          },
          payload: {
            userName: appointment.expertName,
            expertName: appointment.customerName, // From expert's perspective, the customer is the "other person"
            appointmentDate: expertDateTime.datePart,
            appointmentTime: expertDateTime.timePart,
            appointmentType: appointment.appointmentType,
            timeUntilAppointment: expertTimeUntil,
            meetingLink: appointment.meetingUrl,
          },
        });

        console.log(`✅ Reminder sent to expert: ${appointment.expertClerkId}`);
      } catch (error) {
        console.error(`❌ Failed to send reminder to expert ${appointment.expertClerkId}:`, error);
      }

      // Note: Guest reminders would need a different approach since guests don't have Clerk IDs
      // You could implement email-based reminders directly using Resend here if needed
      // For now, we're only sending reminders to experts who have accounts
    }

    console.log('🎉 Appointment reminder cron job completed');
    return NextResponse.json({ success: true, count: appointments.length });
  } catch (error) {
    console.error('❌ Error in appointment reminder cron job:', error);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
