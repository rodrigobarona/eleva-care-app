'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Define a type for Resend options
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
  from = process.env.RESEND_EMAIL_BOOKINGS_FROM,
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

    // Construct the email options object
    const emailParams = {
      from,
      to,
      subject,
      html,
      text,
      replyTo,
      cc,
      bcc,
    };

    // Use type assertion to match Resend's expected shape
    // This is necessary because the Resend types in the installed version
    // have a conflict with our usage pattern
    // @ts-expect-error Resend types don't perfectly match our current usage
    const { data, error } = await resend.emails.send(emailParams);

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
 * Converts HTML content to plain text
 *
 * @param html HTML content to convert
 * @returns Plain text representation of the HTML
 */
function generatePlainTextFromHTML(html: string): string {
  // Basic conversion of HTML to plain text
  return (
    html
      // Replace common HTML elements with text equivalents
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '$1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
      .replace(/<tr[^>]*>(.*?)<\/tr>/gi, '$1\n')
      .replace(/<hr[^>]*>/gi, '\n---\n')
      // Handle links
      .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '$2 ($1)')
      // Remove all other tags
      .replace(/<[^>]*>/g, '')
      // Clean up whitespace
      .replace(/&nbsp;/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      // Decode HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim()
  );
}

/**
 * Generates HTML and plain text for an appointment confirmation email
 *
 * @param params Parameters for the appointment email content
 * @returns Object containing HTML and plain text versions of the email
 */
export async function generateAppointmentEmail(params: {
  expertName: string;
  clientName: string;
  appointmentDate: string; // Date only (e.g., "Monday, April 8, 2025")
  appointmentTime: string; // Time with timezone (e.g., "10:30 AM - 11:30 AM")
  timezone: string; // Explicit timezone (e.g., "America/Los_Angeles")
  appointmentDuration: string;
  eventTitle: string;
  meetLink?: string;
  notes?: string;
}): Promise<{ html: string; text: string }> {
  // Import dynamically to avoid JSX in server component issues
  const { default: AppointmentConfirmation } = await import(
    '@/components/emails/AppointmentConfirmation'
  );
  const { render } = await import('@react-email/render');

  // Render the React Email component to HTML
  const renderedHtml = await render(AppointmentConfirmation(params));

  // Generate plain text version
  const plainText = generatePlainTextFromHTML(renderedHtml);

  return {
    html: renderedHtml,
    text: plainText,
  };
}
