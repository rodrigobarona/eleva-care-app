// Email templates are now imported through the email service functions
// Import email templates
import AppointmentConfirmationTemplate from '@/emails/appointments/appointment-confirmation';
import MultibancoBookingPendingTemplate from '@/emails/payments/multibanco-booking-pending';
import MultibancoPaymentReminderTemplate from '@/emails/payments/multibanco-payment-reminder';
import { generateAppointmentEmail, sendEmail } from '@/lib/email';
import { Novu } from '@novu/api';
import { render } from '@react-email/render';
import React from 'react';

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY!,
});

/**
 * Enhanced email service that integrates Novu workflows with Resend templates
 * This allows you to use your existing beautiful email templates with Novu's workflow orchestration
 */

interface NovuEmailOptions {
  workflowId: string;
  subscriberId: string;
  templateType: 'appointment-confirmation' | 'payment-success' | 'expert-welcome' | 'custom';
  templateData: Record<string, unknown>;
  overrides?: {
    from?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
  };
}

interface ResendEmailOptions {
  to: string;
  templateType: 'appointment-confirmation' | 'payment-success' | 'expert-welcome';
  templateData: Record<string, unknown>;
  locale?: string;
}

interface EmailGenerationResult {
  html: string;
  text: string;
  subject: string;
}

interface TriggerWorkflowPayload {
  subscriberId: string;
  [key: string]: unknown;
}

/**
 * Send an email using Novu workflow + Resend service
 * This combines Novu's workflow management with your existing Resend email templates
 */
export async function sendNovuEmail(options: NovuEmailOptions) {
  try {
    const { workflowId, subscriberId, templateData, overrides } = options;

    const result = await novu.trigger({
      workflowId,
      to: { subscriberId },
      payload: templateData,
      overrides: overrides ? { email: overrides } : undefined,
    });

    console.log('Novu email triggered successfully for workflow:', workflowId);

    return result;
  } catch (error) {
    console.error('Failed to send Novu email:', error);
    throw error;
  }
}

export async function sendNovuEmailWithCustomTemplate(
  workflowId: string,
  subscriberId: string,
  templateData: Record<string, unknown>,
  customTemplate: () => string,
) {
  try {
    const emailContent = customTemplate();

    const result = await novu.trigger({
      workflowId,
      to: { subscriberId },
      payload: {
        ...templateData,
        customEmailContent: emailContent,
      },
    });

    console.log('Custom template email sent via Novu for workflow:', workflowId);
    return result;
  } catch (error) {
    console.error('Failed to send custom template email:', error);
    throw error;
  }
}

/**
 * Direct email sending using Resend (bypassing Novu for immediate emails)
 * Use this for critical emails that need to be sent immediately
 */
export async function sendDirectResendEmail(options: ResendEmailOptions) {
  const { to, templateType, templateData } = options;

  try {
    let emailContent: EmailGenerationResult;

    switch (templateType) {
      case 'appointment-confirmation':
        emailContent = await generateAppointmentConfirmationEmail(templateData);
        break;
      case 'payment-success':
        emailContent = await generatePaymentSuccessEmail(templateData);
        break;
      case 'expert-welcome':
        emailContent = await generateExpertWelcomeEmail(templateData);
        break;
      default:
        throw new Error(`Unknown template type: ${templateType}`);
    }

    const result = await sendEmail({
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    console.log('Email sent successfully via Resend:', result);
    return result;
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
    throw error;
  }
}

async function generateAppointmentConfirmationEmail(
  data: Record<string, unknown>,
): Promise<EmailGenerationResult> {
  const { html: appointmentHtml } = await generateAppointmentEmail(
    data as Parameters<typeof generateAppointmentEmail>[0],
  );
  const subject = 'Appointment Confirmation - Eleva.care';
  const htmlTagRegex = /<[^>]*>/g;
  const text = appointmentHtml.replace(htmlTagRegex, '');

  return { html: appointmentHtml, text, subject };
}

async function generatePaymentSuccessEmail(
  data: Record<string, unknown>,
): Promise<EmailGenerationResult> {
  const subject = 'Payment Successful - Eleva.care';
  const html = `
    <h1>Payment Confirmation</h1>
    <p>Dear ${data.customerName || 'Customer'},</p>
    <p>Your payment of ${data.amount || 'N/A'} has been successfully processed.</p>
    <p>Thank you for choosing Eleva.care!</p>
    <p>Best regards,<br>The Eleva.care Team</p>
  `;
  const htmlTagRegex = /<[^>]*>/g;
  const text = html.replace(htmlTagRegex, '');

  return { html, text, subject };
}

async function generateExpertWelcomeEmail(
  data: Record<string, unknown>,
): Promise<EmailGenerationResult> {
  const subject = 'Welcome to Eleva.care - Expert Onboarding';
  const html = `
    <h1>Welcome to Eleva.care!</h1>
    <p>Dear ${data.expertName || 'Expert'},</p>
    <p>Welcome to the Eleva.care platform. We're excited to have you join our community of experts.</p>
    <p>Your next steps:</p>
    <ul>
      <li>Complete your profile setup</li>
      <li>Set your availability</li>
      <li>Start helping clients</li>
    </ul>
    <p>Best regards,<br>The Eleva.care Team</p>
  `;
  const htmlTagRegex = /<[^>]*>/g;
  const text = html.replace(htmlTagRegex, '');

  return { html, text, subject };
}

/**
 * Utility function to get subscriber info for emails
 */
export async function getSubscriberForEmail(clerkUserId: string) {
  try {
    // You can enhance this to get subscriber data from your database
    return {
      subscriberId: clerkUserId,
      // Add other subscriber fields as needed
    };
  } catch (error) {
    console.error('Failed to get subscriber for email:', error);
    return null;
  }
}

export async function triggerNovuWorkflow(workflowId: string, payload: TriggerWorkflowPayload) {
  try {
    const result = await novu.trigger({
      workflowId,
      to: payload.subscriberId,
      payload,
    });
    return result;
  } catch (error) {
    console.error('Error triggering Novu workflow:', error);
    throw error;
  }
}

/**
 * Enhanced email rendering service for existing React Email templates
 * Integrates with Novu workflows while preserving existing beautiful templates
 */
export class ElevaEmailService {
  private resendEmailUrl = process.env.RESEND_EMAIL_URL || 'updates@notifications.eleva.care';

  /**
   * Render appointment confirmation email
   */
  async renderAppointmentConfirmation(data: {
    expertName: string;
    clientName: string;
    appointmentDate: string;
    appointmentTime: string;
    timezone: string;
    appointmentDuration: string;
    eventTitle: string;
    meetLink?: string;
    notes?: string;
    locale?: string;
  }) {
    // Render the appointment confirmation template
    const template = AppointmentConfirmationTemplate({
      expertName: data.expertName,
      clientName: data.clientName,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      timezone: data.timezone,
      appointmentDuration: data.appointmentDuration,
      eventTitle: data.eventTitle,
      meetLink: data.meetLink,
      notes: data.notes,
    });
    return render(template);
  }

  /**
   * Render Multibanco booking pending email
   */
  async renderMultibancoBookingPending(data: {
    customerName: string;
    expertName: string;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
    timezone: string;
    duration: number;
    multibancoEntity: string;
    multibancoReference: string;
    multibancoAmount: string;
    voucherExpiresAt: string;
    hostedVoucherUrl: string;
    customerNotes?: string;
    locale?: string;
  }) {
    // Render the multibanco booking pending template
    const template = MultibancoBookingPendingTemplate(data);
    return render(template);
  }

  /**
   * Render Multibanco payment reminder email
   */
  async renderMultibancoPaymentReminder(data: {
    customerName: string;
    expertName: string;
    serviceName: string;
    appointmentDate: string;
    appointmentTime: string;
    timezone: string;
    duration: number;
    multibancoEntity: string;
    multibancoReference: string;
    multibancoAmount: string;
    voucherExpiresAt: string;
    hostedVoucherUrl: string;
    customerNotes?: string;
    reminderType: 'gentle' | 'urgent';
    daysRemaining: number;
    locale?: string;
  }) {
    // Render the multibanco payment reminder template
    const template = MultibancoPaymentReminderTemplate(data);
    return render(template);
  }

  /**
   * Render simple notification email for other workflows
   */
  renderSimpleNotification(data: {
    subject: string;
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    userName?: string;
    locale?: string;
  }) {
    const { title, message, actionUrl, actionText, userName } = data;

    // Create a simple notification template using React createElement
    const template = React.createElement(
      'html',
      null,
      React.createElement(
        'body',
        { style: { fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', padding: '40px' } },
        React.createElement(
          'div',
          {
            style: {
              maxWidth: '600px',
              margin: '0 auto',
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
            },
          },
          React.createElement(
            'h1',
            { style: { color: '#4F46E5', textAlign: 'center', fontSize: '24px' } },
            'Eleva.care',
          ),
          React.createElement(
            'h2',
            { style: { color: '#1f2937', textAlign: 'center', fontSize: '20px' } },
            title,
          ),
          userName &&
            React.createElement(
              'p',
              { style: { color: '#374151', fontSize: '16px' } },
              `Hello ${userName},`,
            ),
          React.createElement('p', { style: { color: '#374151', fontSize: '16px' } }, message),
          actionUrl &&
            actionText &&
            React.createElement(
              'div',
              { style: { textAlign: 'center', margin: '32px 0' } },
              React.createElement(
                'a',
                {
                  href: actionUrl,
                  style: {
                    backgroundColor: '#4F46E5',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                  },
                },
                actionText,
              ),
            ),
          React.createElement('hr', { style: { margin: '24px 0', borderColor: '#d1d5db' } }),
          React.createElement(
            'p',
            { style: { color: '#374151', fontSize: '16px' } },
            'Best regards,',
            React.createElement('br'),
            'The Eleva.care Team',
          ),
          React.createElement('hr', { style: { margin: '24px 0', borderColor: '#d1d5db' } }),
          React.createElement(
            'p',
            { style: { color: '#6b7280', fontSize: '12px', textAlign: 'center' } },
            `© ${new Date().getFullYear()} Eleva.care. All rights reserved.`,
          ),
        ),
      ),
    );

    return render(template);
  }
}

// Create singleton instance
export const elevaEmailService = new ElevaEmailService();
