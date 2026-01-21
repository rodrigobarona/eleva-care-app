import { formatDateTime, getUpcomingAppointments } from '@/lib/cron/appointment-utils';
import { triggerWorkflow } from '@/lib/integrations/novu';
import { generateAppointmentEmail, sendEmail } from '@/lib/integrations/novu/email';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { NextResponse } from 'next/server';

// Time window constants (in minutes)
const WINDOW_START_MINUTES = 60; // 1 hour
const WINDOW_END_MINUTES = 75; // 1.25 hours (15-minute window)

async function handler() {
  console.log('⚡ Running 1-hour urgent appointment reminder cron job...');

  try {
    const appointments = await getUpcomingAppointments(WINDOW_START_MINUTES, WINDOW_END_MINUTES);
    console.log(`Found ${appointments.length} appointments needing urgent reminders`);

    let expertRemindersSent = 0;
    let patientRemindersSent = 0;

    for (const appointment of appointments) {
      // Send urgent reminder to expert (experts have Clerk IDs via Novu)
      try {
        const expertDateTime = formatDateTime(
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
          transactionId: `reminder-1hr-expert-${appointment.id}`, // Idempotency key
        });

        console.log(`⚡ URGENT reminder sent to expert: ${appointment.expertClerkId}`);
        expertRemindersSent++;
      } catch (error) {
        console.error(
          `❌ Failed to send urgent reminder to expert ${appointment.expertClerkId}:`,
          error,
        );
      }

      // Send urgent reminder to patient/guest via direct email (Resend)
      // Patients don't have Clerk IDs, so we send email directly
      try {
        const patientDateTime = formatDateTime(
          appointment.startTime,
          appointment.customerTimezone,
          appointment.customerLocale,
        );

        // Determine locale for email template
        const locale = appointment.customerLocale.startsWith('pt') ? 'pt' : 'en';

        // Generate the appointment reminder email
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

        // Send email directly to guest via Resend
        await sendEmail({
          to: appointment.guestEmail,
          subject: `🚨 Starting Soon: ${subject} - in 1 hour!`,
          html,
          text,
        });

        console.log(`⚡ URGENT reminder sent to patient: ${appointment.guestEmail}`);
        patientRemindersSent++;
      } catch (error) {
        console.error(
          `❌ Failed to send urgent reminder to patient ${appointment.guestEmail}:`,
          error,
        );
      }
    }

    console.log(
      `🎉 1-hour urgent appointment reminder cron job completed. Expert: ${expertRemindersSent}, Patient: ${patientRemindersSent}`,
    );
    return NextResponse.json({
      success: true,
      count: appointments.length,
      expertRemindersSent,
      patientRemindersSent,
    });
  } catch (error) {
    console.error('❌ Error in 1-hour appointment reminder cron job:', error);
    return NextResponse.json({ error: 'Failed to process urgent reminders' }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
