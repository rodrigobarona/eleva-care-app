/**
 * 1-Hour Urgent Appointment Reminder Cron Job
 *
 * Sends urgent reminders to both experts (via Novu) and patients (via direct email)
 * for appointments starting in the next 1-1.25 hours.
 *
 * Schedule: Every 15 minutes via QStash
 */
import { formatDateTime, getUpcomingAppointments } from '@/lib/cron/appointment-utils';
import { triggerWorkflow } from '@/lib/integrations/novu';
import { generateAppointmentEmail, sendEmail } from '@/lib/integrations/novu/email';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { NextResponse } from 'next/server';

// Time window: 60-75 minutes from now (15-minute window)
const WINDOW_START_MINUTES = 60; // 1 hour
const WINDOW_END_MINUTES = 75; // 1.25 hours

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
        const patientDateTime = formatDateTime(
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
