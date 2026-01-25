/**
 * 1-Hour Urgent Appointment Reminder Cron Job
 *
 * Sends urgent reminders to both experts and patients via Novu workflows.
 * For patients without WorkOS IDs, their email is used as the subscriber ID
 * (Novu auto-creates subscribers when triggered with a new subscriberId).
 *
 * Schedule: Every 15 minutes via QStash
 */
import {
  formatDateTime,
  getUpcomingAppointments,
  normalizeLocale,
} from '@/lib/cron/appointment-utils';
import { triggerWorkflow } from '@/lib/integrations/novu';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { NextResponse } from 'next/server';

/** Vercel region configuration for serverless function */
export const preferredRegion = 'auto';

/** Maximum execution time in seconds (1 minute for processing appointments) */
export const maxDuration = 60;

/** Minutes from now for urgent reminder window start (1 hour) */
const WINDOW_START_MINUTES = 60;

/** Minutes from now for urgent reminder window end (1.25 hours) */
const WINDOW_END_MINUTES = 75;

/**
 * Cron job handler that sends 1-hour urgent appointment reminders.
 *
 * Processes all confirmed appointments starting in 60-75 minutes and sends:
 * - Expert urgent reminders via Novu (in-app + email) using WorkOS ID as subscriberId
 * - Patient urgent reminders via Novu (email only) using email as subscriberId
 *
 * Novu auto-creates subscribers when triggered, so patients without
 * accounts still receive email notifications and appear in Novu activity logs.
 *
 * Uses idempotency keys (transactionId) to prevent duplicate reminders on cron retries.
 * Runs every 15 minutes to catch appointments within the window.
 *
 * @returns {Promise<NextResponse>} JSON response with reminder statistics
 *
 * @example Response
 * ```json
 * {
 *   "success": true,
 *   "totalAppointments": 2,
 *   "expertRemindersSent": 2,
 *   "expertRemindersFailed": 0,
 *   "patientRemindersSent": 2,
 *   "patientRemindersFailed": 0
 * }
 * ```
 */
async function handler() {
  console.log('⚡ Running 1-hour urgent appointment reminder cron job...');

  try {
    const appointments = await getUpcomingAppointments(WINDOW_START_MINUTES, WINDOW_END_MINUTES);
    console.log(`Found ${appointments.length} appointments needing urgent reminders`);

    let expertRemindersSent = 0;
    let expertRemindersFailed = 0;
    let patientRemindersSent = 0;
    let patientRemindersFailed = 0;

    for (const appointment of appointments) {
      // 1. Send urgent reminder to expert (experts have WorkOS IDs via Novu)
      try {
        const expertDateTime = formatDateTime(
          appointment.startTime,
          appointment.expertTimezone,
          appointment.expertLocale,
        );

        // Normalize locale for expert email template (supports pt, es, en)
        const expertLocale = normalizeLocale(appointment.expertLocale);

        const expertResult = await triggerWorkflow({
          workflowId: 'appointment-universal',
          to: {
            subscriberId: appointment.expertWorkosId,
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
            meetingUrl: appointment.meetingUrl,
            userSegment: 'expert',
            locale: expertLocale,
          },
          // Deterministic transactionId for idempotency - no Date.now()
          transactionId: `urgent-expert-${appointment.id}-1hr`,
        });

        if (expertResult) {
          console.log(`⚡ URGENT reminder sent to expert: ${appointment.expertWorkosId}`);
          expertRemindersSent++;
        } else {
          console.warn(`⚠️ Workflow returned null for expert ${appointment.expertWorkosId}`);
          expertRemindersFailed++;
        }
      } catch (error) {
        console.error(
          `❌ Failed to send urgent reminder to expert ${appointment.expertWorkosId}:`,
          error,
        );
        expertRemindersFailed++;
      }

      // 2. Send urgent reminder to patient (use email as subscriberId for guests)
      try {
        // Validate guest email before using as subscriberId
        if (appointment.customerWorkosId === 'guest' && !appointment.guestEmail) {
          console.error(
            `❌ Cannot send reminder: guest appointment ${appointment.id} has no guestEmail`,
          );
          patientRemindersFailed++;
          continue; // Skip to next appointment
        }

        const patientDateTime = formatDateTime(
          appointment.startTime,
          appointment.customerTimezone,
          appointment.customerLocale,
        );

        // Normalize locale for patient email template
        const patientLocale = normalizeLocale(appointment.customerLocale);

        // Use guestEmail as subscriberId - Novu will auto-create subscriber
        const subscriberId =
          appointment.customerWorkosId !== 'guest'
            ? appointment.customerWorkosId
            : appointment.guestEmail;

        const patientResult = await triggerWorkflow({
          workflowId: 'appointment-universal',
          to: {
            subscriberId,
            email: appointment.guestEmail,
          },
          payload: {
            eventType: 'reminder',
            expertName: appointment.expertName,
            customerName: appointment.customerName,
            serviceName: appointment.appointmentType,
            appointmentDate: patientDateTime.datePart,
            appointmentTime: patientDateTime.timePart,
            timezone: appointment.customerTimezone,
            message: `🚨 URGENT: Your appointment with ${appointment.expertName} starts in 1 hour!`,
            meetingUrl: appointment.meetingUrl,
            userSegment: 'patient',
            locale: patientLocale,
          },
          // Deterministic transactionId for idempotency - no Date.now()
          transactionId: `urgent-patient-${appointment.id}-1hr`,
        });

        if (patientResult) {
          console.log(`⚡ URGENT reminder sent to patient: ${appointment.guestEmail}`);
          patientRemindersSent++;
        } else {
          console.warn(`⚠️ Workflow returned null for patient ${appointment.guestEmail}`);
          patientRemindersFailed++;
        }
      } catch (error) {
        console.error(
          `❌ Failed to send urgent reminder to patient ${appointment.guestEmail}:`,
          error,
        );
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
    console.error('❌ Error in 1-hour appointment reminder cron job:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process urgent reminders' },
      { status: 500 },
    );
  }
}

export const POST = verifySignatureAppRouter(handler);
