/**
 * 24-Hour Appointment Reminder Cron Job
 *
 * Sends advance reminders to both experts and patients via Novu workflows.
 * For patients without WorkOS IDs, their email is used as the subscriber ID
 * (Novu auto-creates subscribers when triggered with a new subscriberId).
 *
 * Schedule: Every hour via QStash
 */
import {
  formatDateTime,
  formatTimeUntilAppointment,
  getUpcomingAppointments,
} from '@/lib/cron/appointment-utils';
import { triggerWorkflow } from '@/lib/integrations/novu';
import type { SupportedLocale } from '@/emails/utils/i18n';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { NextResponse } from 'next/server';

/** Vercel region configuration for serverless function */
export const preferredRegion = 'auto';

/** Maximum execution time in seconds (1 minute for processing appointments) */
export const maxDuration = 60;

/** Minutes from now for reminder window start (24 hours) */
const WINDOW_START_MINUTES = 24 * 60; // 1440 minutes

/** Minutes from now for reminder window end (25 hours) */
const WINDOW_END_MINUTES = 25 * 60; // 1500 minutes

/**
 * Cron job handler that sends 24-hour appointment reminders.
 *
 * Processes all confirmed appointments starting in 24-25 hours and sends:
 * - Expert reminders via Novu (in-app + email) using WorkOS ID as subscriberId
 * - Patient reminders via Novu (email only) using email as subscriberId
 *
 * Novu auto-creates subscribers when triggered, so patients without
 * accounts still receive email notifications and appear in Novu activity logs.
 *
 * Uses idempotency keys (transactionId) to prevent duplicate reminders on cron retries.
 * Runs every hour to catch appointments within the window.
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
    console.log(`Found ${appointments.length} appointments needing 24-hour reminders`);

    let expertRemindersSent = 0;
    let expertRemindersFailed = 0;
    let patientRemindersSent = 0;
    let patientRemindersFailed = 0;

    for (const appointment of appointments) {
      // 1. Send reminder to expert (experts have WorkOS IDs via Novu)
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

        // Determine locale for expert email template (supports pt, es, en)
        const expertLocaleLower = (appointment.expertLocale || 'en').toLowerCase();
        const expertLocale: SupportedLocale = expertLocaleLower.startsWith('pt')
          ? 'pt'
          : expertLocaleLower.startsWith('es')
            ? 'es'
            : 'en';

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
            message: `Appointment reminder: You have an appointment with ${appointment.customerName} ${expertTimeUntil}`,
            meetingUrl: appointment.meetingUrl,
            userSegment: 'expert',
            locale: expertLocale,
          },
          transactionId: `24h-expert-${appointment.id}-${Date.now()}`,
        });

        if (expertResult) {
          console.log(`✅ Reminder sent to expert: ${appointment.expertWorkosId}`);
          expertRemindersSent++;
        } else {
          console.warn(`⚠️ Workflow returned null for expert ${appointment.expertWorkosId}`);
          expertRemindersFailed++;
        }
      } catch (error) {
        console.error(`❌ Failed to send reminder to expert ${appointment.expertWorkosId}:`, error);
        expertRemindersFailed++;
      }

      // 2. Send reminder to patient (use email as subscriberId for guests)
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

        // Determine locale for patient email template
        const patientLocaleLower = (appointment.customerLocale || 'en').toLowerCase();
        const patientLocale: SupportedLocale = patientLocaleLower.startsWith('pt')
          ? 'pt'
          : patientLocaleLower.startsWith('es')
            ? 'es'
            : 'en';

        // Use guestEmail as subscriberId - Novu will auto-create subscriber
        const subscriberId = appointment.customerWorkosId !== 'guest'
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
            message: `Appointment reminder: You have an appointment with ${appointment.expertName} ${patientTimeUntil}`,
            meetingUrl: appointment.meetingUrl,
            userSegment: 'patient',
            locale: patientLocale,
          },
          transactionId: `24h-patient-${appointment.id}-${Date.now()}`,
        });

        if (patientResult) {
          console.log(`✅ Reminder sent to patient: ${appointment.guestEmail}`);
          patientRemindersSent++;
        } else {
          console.warn(`⚠️ Workflow returned null for patient ${appointment.guestEmail}`);
          patientRemindersFailed++;
        }
      } catch (error) {
        console.error(`❌ Failed to send reminder to patient ${appointment.guestEmail}:`, error);
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
