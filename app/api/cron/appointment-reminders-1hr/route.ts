/**
 * 1-Hour Urgent Appointment Reminder Cron Job
 *
 * Sends urgent reminders to both experts and patients via Novu workflows.
 * For patients without ClerkIDs, their email is used as the subscriber ID
 * (Novu auto-creates subscribers when triggered with a new subscriberId).
 *
 * Schedule: Every 15 minutes via QStash
 */
import { formatDateTime, getUpcomingAppointments } from '@/lib/cron/appointment-utils';
import { triggerWorkflow } from '@/lib/integrations/novu';
import { SupportedLocale } from '@/lib/integrations/novu/email-service';
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
 * - Expert urgent reminders via Novu (in-app + email) using ClerkID as subscriberId
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
      // 1. Send urgent reminder to expert (experts have Clerk IDs via Novu)
      try {
        const expertDateTime = formatDateTime(
          appointment.startTime,
          appointment.expertTimezone,
          appointment.expertLocale,
        );

        const expertResult = await triggerWorkflow({
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

        if (!expertResult) {
          throw new Error('Workflow trigger returned null');
        }

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

      // 2. Send urgent reminder to patient/guest via Novu (using email as subscriber ID)
      try {
        const patientDateTime = formatDateTime(
          appointment.startTime,
          appointment.customerTimezone,
          appointment.customerLocale,
        );

        // Determine locale for email template (supports pt, es, en)
        const customerLocaleLower = (appointment.customerLocale || 'en').toLowerCase();
        const locale: SupportedLocale = customerLocaleLower.startsWith('pt')
          ? 'pt'
          : customerLocaleLower.startsWith('es')
            ? 'es'
            : 'en';

        // Safely extract firstName and lastName from customerName
        // Handle empty, whitespace-only, or missing names
        const trimmedCustomerName = (appointment.customerName || '').trim();
        const nameParts = trimmedCustomerName ? trimmedCustomerName.split(' ') : [];
        const firstName = nameParts[0] || undefined;
        const lastName = nameParts.slice(1).join(' ') || undefined;

        // Trigger patient urgent reminder via Novu workflow (uses email as subscriber ID)
        const patientResult = await triggerWorkflow({
          workflowId: 'appointment-universal',
          to: {
            subscriberId: appointment.guestEmail, // Use email as subscriber ID for guests
            email: appointment.guestEmail,
            firstName,
            lastName,
          },
          payload: {
            eventType: 'reminder',
            expertName: appointment.expertName,
            customerName: appointment.customerName,
            serviceName: appointment.appointmentType,
            appointmentDate: patientDateTime.datePart,
            appointmentTime: patientDateTime.timePart,
            timezone: appointment.customerTimezone,
            appointmentDuration: `${appointment.durationMinutes} minutes`,
            meetingUrl: appointment.meetingUrl,
            timeUntilAppointment: 'in 1 hour',
            message: `🚨 URGENT: Your appointment with ${appointment.expertName} starts in 1 hour!`,
            locale,
            userSegment: 'patient',
            templateVariant: 'urgent',
          },
          transactionId: `reminder-1hr-patient-${appointment.id}`, // Idempotency key
        });

        if (!patientResult) {
          throw new Error('Workflow trigger returned null');
        }

        console.log(`⚡ URGENT reminder sent to patient via Novu: ${appointment.guestEmail}`);
        patientRemindersSent++;
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
