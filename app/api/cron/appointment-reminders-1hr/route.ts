import { db } from '@/drizzle/db';
import { EventTable, MeetingTable, ScheduleTable, UserTable } from '@/drizzle/schema';
import { triggerWorkflow } from '@/lib/integrations/novu';
import { generateAppointmentEmail, sendEmail } from '@/lib/integrations/novu/email';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { and, between, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

interface Appointment {
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
          between(MeetingTable.startTime, in1Hour, in75Minutes),
          eq(MeetingTable.stripePaymentStatus, 'succeeded'), // Only confirmed appointments
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

    let expertRemindersSent = 0;
    let expertRemindersFailed = 0;
    let patientRemindersSent = 0;
    let patientRemindersFailed = 0;

    for (const appointment of appointments) {
      // 1. Send urgent reminder to expert (experts have Clerk IDs via Novu)
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
          transactionId: `1hr-reminder-expert-${appointment.id}`, // Idempotency
        });

        console.log(`⚡ URGENT reminder sent to expert: ${appointment.expertClerkId}`);
        expertRemindersSent++;
      } catch (error) {
        console.error(`❌ Failed to send urgent reminder to expert:`, {
          error: error instanceof Error ? error.message : error,
          appointmentId: appointment.id,
          expertClerkId: appointment.expertClerkId,
        });
        expertRemindersFailed++;
      }

      // 2. Send urgent reminder to patient/guest via direct email (guests don't have Clerk IDs)
      try {
        const patientDateTime = await formatDateTime(
          appointment.startTime,
          appointment.customerTimezone,
          appointment.customerLocale,
        );

        // Determine locale for email template
        const locale = appointment.customerLocale.startsWith('pt') ? 'pt' : 'en';

        const { html, text, subject } = await generateAppointmentEmail({
          expertName: appointment.expertName,
          clientName: appointment.customerName,
          appointmentDate: patientDateTime.datePart,
          appointmentTime: patientDateTime.timePart,
          timezone: appointment.customerTimezone,
          appointmentDuration: `${appointment.durationMinutes} minutes`,
          eventTitle: appointment.appointmentType,
          meetLink: appointment.meetingUrl,
          locale,
        });

        const emailResult = await sendEmail({
          to: appointment.guestEmail,
          subject: `🚨 Starting Soon: ${subject} - in 1 hour!`,
          html,
          text,
          headers: {
            'Idempotency-Key': `1hr-reminder-patient-${appointment.id}`,
          },
        });

        if (emailResult.success) {
          console.log(`⚡ URGENT reminder sent to patient: ${appointment.guestEmail}`);
          patientRemindersSent++;
        } else {
          console.error(`❌ Failed to send urgent reminder to patient:`, {
            appointmentId: appointment.id,
            guestEmail: appointment.guestEmail,
            error: emailResult.error,
          });
          patientRemindersFailed++;
        }
      } catch (error) {
        console.error(`❌ Failed to send urgent reminder to patient:`, {
          appointmentId: appointment.id,
          guestEmail: appointment.guestEmail,
          error: error instanceof Error ? error.message : error,
        });
        patientRemindersFailed++;
      }
    }

    console.log('🎉 1-hour urgent appointment reminder cron job completed', {
      totalAppointments: appointments.length,
      expertRemindersSent,
      expertRemindersFailed,
      patientRemindersSent,
      patientRemindersFailed,
    });

    return NextResponse.json({
      success: true,
      totalAppointments: appointments.length,
      expertRemindersSent,
      expertRemindersFailed,
      patientRemindersSent,
      patientRemindersFailed,
    });
  } catch (error) {
    console.error('❌ Error in 1-hour urgent appointment reminder cron job:', error);
    return NextResponse.json({ error: 'Failed to process urgent reminders' }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
