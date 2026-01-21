/**
 * 24-Hour Appointment Reminder Cron Job
 *
 * Sends reminders to both experts (via Novu) and patients (via direct email)
 * for appointments starting in the next 24-25 hours.
 *
 * Schedule: Every hour via QStash
 */
import {
  formatDateTime,
  formatTimeUntilAppointment,
  getUpcomingAppointments,
} from '@/lib/cron/appointment-utils';
import { triggerWorkflow } from '@/lib/integrations/novu';
import { generateAppointmentEmail, sendEmail } from '@/lib/integrations/novu/email';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { NextResponse } from 'next/server';

/** Minutes from now for reminder window start (24 hours) */
const WINDOW_START_MINUTES = 24 * 60;

/** Minutes from now for reminder window end (25 hours) */
const WINDOW_END_MINUTES = 25 * 60;

/**
 * Cron job handler that sends 24-hour appointment reminders.
 *
 * Processes all confirmed appointments starting in 24-25 hours and sends:
 * - Expert reminders via Novu (in-app + email)
 * - Patient reminders via direct Resend email (patients don't have Novu IDs)
 *
 * Uses idempotency keys to prevent duplicate reminders on cron retries.
 *
 * @returns {Promise<NextResponse>} JSON response with reminder statistics
 *
 * @example Response
 * ```json
 * {
 *   "success": true,
 *   "totalAppointments": 5,
 *   "expertRemindersSent": 5,
 *   "expertRemindersFailed": 0,
 *   "patientRemindersSent": 5,
 *   "patientRemindersFailed": 0
 * }
 * ```
 */
async function handler() {
  console.log('🔔 Running 24-hour appointment reminder cron job...');

  try {
    const appointments = await getUpcomingAppointments(WINDOW_START_MINUTES, WINDOW_END_MINUTES);
    console.log(`Found ${appointments.length} appointments needing reminders`);

    let expertRemindersSent = 0;
    let expertRemindersFailed = 0;
    let patientRemindersSent = 0;
    let patientRemindersFailed = 0;

    for (const appointment of appointments) {
      // 1. Send reminder to expert (experts have Clerk IDs via Novu)
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
          transactionId: `24hr-reminder-expert-${appointment.id}`, // Idempotency
        });

        console.log(`✅ Reminder sent to expert: ${appointment.expertClerkId}`);
        expertRemindersSent++;
      } catch (error) {
        console.error(`❌ Failed to send reminder to expert:`, {
          error: error instanceof Error ? error.message : error,
          appointmentId: appointment.id,
          expertClerkId: appointment.expertClerkId,
        });
        expertRemindersFailed++;
      }

      // 2. Send reminder to patient/guest via direct email (guests don't have Clerk IDs)
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
          subject: `📅 Reminder: ${subject} - ${patientTimeUntil}`,
          html,
          text,
          headers: {
            'Idempotency-Key': `24hr-reminder-patient-${appointment.id}`,
          },
        });

        if (emailResult.success) {
          console.log(`✅ Reminder sent to patient: ${appointment.guestEmail}`);
          patientRemindersSent++;
        } else {
          console.error(`❌ Failed to send reminder to patient:`, {
            appointmentId: appointment.id,
            guestEmail: appointment.guestEmail,
            error: emailResult.error,
          });
          patientRemindersFailed++;
        }
      } catch (error) {
        console.error(`❌ Failed to send reminder to patient:`, {
          appointmentId: appointment.id,
          guestEmail: appointment.guestEmail,
          error: error instanceof Error ? error.message : error,
        });
        patientRemindersFailed++;
      }
    }

    console.log('🎉 24-hour appointment reminder cron job completed', {
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
    console.error('❌ Error in 24-hour appointment reminder cron job:', error);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
