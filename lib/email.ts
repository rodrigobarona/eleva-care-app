'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Define a type for Resend options
type ResendEmailOptions = {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  cc?: string[];
  bcc?: string[];
};

type SendEmailParams = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
};

/**
 * Sends an email using the Resend API
 *
 * @param params Email parameters including recipient, subject, and content
 * @returns Object with success status and message or error
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = 'Eleva Care <notifications@eleva.care>',
  replyTo,
  cc,
  bcc,
}: SendEmailParams) {
  try {
    if (!html && !text) {
      throw new Error('Either HTML or text content must be provided');
    }

    // Check recipient email
    if (!to || !to.includes('@')) {
      throw new Error('Invalid recipient email address');
    }

    // Prepare options with the correct types
    const emailOptions: ResendEmailOptions = {
      from,
      to,
      subject,
      html,
      text,
      reply_to: replyTo,
      cc,
      bcc,
    };

    // Send the email via Resend
    // @ts-expect-error - Resend types don't perfectly match our usage
    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('Error sending email via Resend:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error: unknown) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unknown error occurred while sending email',
    };
  }
}

/**
 * Generates HTML for an appointment confirmation email using React Email
 *
 * @param params Parameters for the appointment email content
 * @returns Rendered HTML string from React Email components
 */
export async function generateAppointmentEmailHtml(params: {
  expertName: string;
  clientName: string;
  appointmentDate: string;
  appointmentDuration: string;
  eventTitle: string;
  meetLink?: string;
  notes?: string;
}) {
  // Import dynamically to avoid JSX in server component issues
  const { default: AppointmentConfirmation } = await import(
    '@/components/emails/AppointmentConfirmation'
  );
  const { render } = await import('@react-email/render');

  // Render the React Email component to HTML
  return render(AppointmentConfirmation(params));
}
