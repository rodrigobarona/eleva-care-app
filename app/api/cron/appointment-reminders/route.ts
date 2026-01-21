import {
  formatDateTime,
  formatTimeUntilAppointment,
  getUpcomingAppointments,
} from '@/lib/cron/appointment-utils';
import { triggerWorkflow } from '@/lib/integrations/novu';
import { generateAppointmentEmail, sendEmail } from '@/lib/integrations/novu/email';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { NextResponse } from 'next/server';

// Time window constants (in minutes)
const WINDOW_START_MINUTES = 24 * 60; // 24 hours
const WINDOW_END_MINUTES = 25 * 60; // 25 hours

async function handler() {
  console.log('🔔 Running 24-hour appointment reminder cron job...');

  try {
    const appointments = await getUpcomingAppointments(WINDOW_START_MINUTES, WINDOW_END_MINUTES);
    console.log(`Found ${appointments.length} appointments needing reminders`);

    let expertRemindersSent = 0;
    let patientRemindersSent = 0;

    for (const appointment of appointments) {
      // Send reminder to expert (experts have Clerk IDs via Novu)
      try {
        const expertDateTime = formatDateTime(
          appointment.startTime,
          appointment.expertTimezone,
          appointment.expertLocale,
        );

        const expertTimeUntil = formatTimeUntilAppointment(
          appointment.startTime,
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
            message: `Appointment reminder: You have an appointment with ${appointment.customerName} ${expertTimeUntil}`,
            meetLink: appointment.meetingUrl,
          },
          transactionId: `reminder-24h-expert-${appointment.id}`, // Idempotency key
        });

        console.log(`✅ Reminder sent to expert: ${appointment.expertClerkId}`);
        expertRemindersSent++;
      } catch (error) {
        console.error(`❌ Failed to send reminder to expert ${appointment.expertClerkId}:`, error);
      }

      // Send reminder to patient/guest via direct email (Resend)
      // Patients don't have Clerk IDs, so we send email directly
      try {
        const patientDateTime = formatDateTime(
          appointment.startTime,
          appointment.customerTimezone,
          appointment.customerLocale,
        );

        const patientTimeUntil = formatTimeUntilAppointment(
          appointment.startTime,
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
        const emailResult = await sendEmail({
          to: appointment.guestEmail,
          subject: `📅 Reminder: ${subject} - ${patientTimeUntil}`,
          html,
          text,
        });

        if (emailResult.success) {
          console.log(`✅ Reminder sent to patient: ${appointment.guestEmail}`);
          patientRemindersSent++;
        } else {
          console.error(
            `❌ Failed to send reminder to patient ${appointment.guestEmail}:`,
            emailResult.error,
          );
        }
      } catch (error) {
        console.error(`❌ Failed to send reminder to patient ${appointment.guestEmail}:`, error);
      }
    }

    console.log(
      `🎉 24-hour appointment reminder cron job completed. Expert: ${expertRemindersSent}, Patient: ${patientRemindersSent}`,
    );
    return NextResponse.json({
      success: true,
      count: appointments.length,
      expertRemindersSent,
      patientRemindersSent,
    });
  } catch (error) {
    console.error('❌ Error in appointment reminder cron job:', error);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
