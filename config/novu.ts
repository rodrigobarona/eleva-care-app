import { ExpertPayoutNotificationTemplate } from '@/emails/payments';
import { elevaEmailService } from '@/lib/novu-email-service';
import { workflow } from '@novu/framework';
import { render } from '@react-email/render';
import React from 'react';
import { z } from 'zod';

// HTML escaping utility to prevent XSS vulnerabilities
function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char]);
}

// Helper function to create localized workflow content
async function getLocalizedContent(
  workflowKey: string,
  locale: string,
  params: Record<string, string | number | boolean | undefined>,
  type: 'inApp' | 'email' = 'inApp',
) {
  try {
    const messages = await import(`@/messages/${locale}.json`);
    const notificationData = messages.notifications?.[workflowKey];

    if (!notificationData) {
      throw new Error(`No translation found for ${workflowKey} in ${locale}`);
    }

    // Template replacement with optional HTML escaping for security
    const replaceVars = (
      text: string,
      vars: Record<string, string | number | boolean | undefined>,
      shouldEscapeHtml: boolean = false,
    ) => {
      return text.replace(/\{(\w+)\}/g, (match, key) => {
        const value = String(vars[key] || match);
        return shouldEscapeHtml ? escapeHtml(value) : value;
      });
    };

    if (type === 'email' && notificationData.email) {
      const email = notificationData.email;
      let body = '';

      // Use HTML escaping for email content to prevent XSS
      if (email.title) body += `<h2>${replaceVars(email.title, params, true)}</h2>\n`;
      if (email.greeting) body += `<p>${replaceVars(email.greeting, params, true)}</p>\n`;
      if (email.body) body += `<p>${replaceVars(email.body, params, true)}</p>\n`;

      if (email.detailsTitle) {
        body += `<h3>${replaceVars(email.detailsTitle, params, true)}</h3>\n<ul>\n`;
        const details = [
          'amount',
          'client',
          'sessionDate',
          'transactionId',
          'service',
          'date',
          'time',
        ];
        details.forEach((key) => {
          if (email[key])
            body += `  <li><strong>${replaceVars(email[key], params, true)}</strong></li>\n`;
        });
        body += `</ul>\n`;
      }

      if (email.footer) body += `<p>${replaceVars(email.footer, params, true)}</p>\n`;
      if (email.cta) {
        // URLs should not be HTML-escaped, but the CTA text should be
        const ctaUrl = params.dashboardUrl || params.actionUrl || '/account';
        body += `<p><a href="${String(ctaUrl)}">${replaceVars(email.cta, params, true)}</a></p>\n`;
      }

      return {
        subject: replaceVars(email.subject, params, true),
        body: body.trim(),
      };
    }

    // For in-app notifications, escaping is not needed as they don't render HTML
    return {
      subject: replaceVars(notificationData.subject, params),
      body: replaceVars(notificationData.body, params),
    };
  } catch (error) {
    console.error(`Failed to get localized content for ${workflowKey}:`, error);
    return {
      subject: `Notification: ${workflowKey}`,
      body: 'A notification has been sent to you.',
    };
  }
}

// Helper to determine locale from payload
function getLocale(payload: Record<string, string | number | boolean | undefined>): string {
  if (payload.locale) return String(payload.locale);
  if (payload.country) {
    const countryMap: Record<string, string> = {
      PT: 'pt',
      BR: 'pt-BR',
      ES: 'es',
      MX: 'es',
      AR: 'es',
      CO: 'es',
    };
    return countryMap[String(payload.country).toUpperCase()] || 'en';
  }
  return 'en';
}

// CONSOLIDATED WORKFLOWS - 12 total instead of 26+

// 1. Universal User Lifecycle Workflow (combines welcome + user creation)
export const userLifecycleWorkflow = workflow(
  'user-lifecycle',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const eventType = payload.eventType as string;

    // Welcome new users
    if (eventType === 'welcome') {
      const content = await getLocalizedContent('welcome', locale, payload);
      await step.inApp('welcome-message', async () => content);

      const emailContent = await getLocalizedContent('welcome', locale, payload, 'email');
      await step.email('welcome-email', async () => ({
        subject: emailContent.subject,
        body: emailContent.body,
      }));
    }

    // Handle user creation events
    if (eventType === 'user-created') {
      const content = await getLocalizedContent('userCreated', locale, payload);
      await step.inApp('user-created-notification', async () => content);
    }
  },
  {
    payloadSchema: z.object({
      eventType: z.enum(['welcome', 'user-created']),
      userName: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      clerkUserId: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
    tags: ['auth', 'user'],
  },
);

// 2. Universal Security & Auth Workflow (combines 3 workflows)
export const securityAuthWorkflow = workflow(
  'security-auth',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const eventType = payload.eventType as string;

    // Security alerts
    if (eventType === 'security-alert') {
      const content = await getLocalizedContent('securityAlert', locale, payload);
      await step.inApp('security-alert', async () => content);
    }

    // Account verification
    if (eventType === 'account-verification') {
      const content = await getLocalizedContent('accountVerification', locale, payload);
      await step.inApp('verification-reminder', async () => content);
    }

    // Recent login tracking
    if (eventType === 'recent-login') {
      const content = await getLocalizedContent('recentLogin', locale, payload);
      await step.inApp('login-tracking', async () => content);
    }
  },
  {
    payloadSchema: z.object({
      eventType: z.enum(['security-alert', 'account-verification', 'recent-login']),
      userId: z.string(),
      alertType: z.string().optional(),
      verificationUrl: z.string().optional(),
      deviceInfo: z.string().optional(),
      message: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
    tags: ['security'],
  },
);

// 3. Universal Payment Workflow (comprehensive Stripe webhook support)
export const paymentWorkflow = workflow(
  'payment-universal',
  async ({ payload, step }) => {
    const eventType = payload.eventType as string;

    // Payment successful (Stripe payment_intent.succeeded)
    if (eventType === 'payment-success') {
      await step.inApp('payment-confirmation', async () => ({
        subject: `✅ Payment Successful - ${payload.amount} ${payload.currency}`,
        body: `Your payment of ${payload.amount} ${payload.currency} for ${payload.serviceName} has been processed successfully. Transaction ID: ${payload.transactionId}`,
        data: {
          paymentIntentId: payload.paymentIntentId,
          amount: payload.amount,
          currency: payload.currency,
          serviceName: payload.serviceName,
          transactionId: payload.transactionId,
          receiptUrl: payload.receiptUrl,
        },
      }));

      // Send confirmation email
      await step.email('payment-success-email', async () => ({
        subject: `✅ Payment Confirmed - ${payload.serviceName}`,
        body: `
<h2>Payment Successful! ✅</h2>
<p>Hi ${payload.customerName || 'Valued Customer'},</p>
<p>Your payment has been successfully processed.</p>
<h3>Payment Details:</h3>
<ul>
  <li><strong>Amount:</strong> ${payload.amount} ${payload.currency}</li>
  <li><strong>Service:</strong> ${payload.serviceName}</li>
  <li><strong>Payment Method:</strong> ${payload.paymentMethod}</li>
  <li><strong>Transaction ID:</strong> ${payload.transactionId}</li>
  <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
</ul>
<p>You will receive appointment details shortly.</p>
${payload.receiptUrl ? `<p><a href="${payload.receiptUrl}">Download Receipt</a></p>` : ''}
<p>Thank you for choosing Eleva Care!</p>
        `,
      }));
    }

    // Payment failed (Stripe payment_intent.payment_failed)
    if (eventType === 'payment-failed') {
      await step.inApp('payment-failure', async () => ({
        subject: `❌ Payment Failed - ${payload.amount} ${payload.currency}`,
        body: `Your payment of ${payload.amount} ${payload.currency} could not be processed. Reason: ${payload.failureReason}. Please try again or use a different payment method.`,
        data: {
          paymentIntentId: payload.paymentIntentId,
          amount: payload.amount,
          currency: payload.currency,
          failureReason: payload.failureReason,
          failureCode: payload.failureCode,
          retryUrl: payload.retryUrl,
        },
      }));

      // Send failure notification email
      await step.email('payment-failed-email', async () => ({
        subject: `❌ Payment Issue - ${payload.serviceName}`,
        body: `
<h2>Payment Issue ❌</h2>
<p>Hi ${payload.customerName || 'Valued Customer'},</p>
<p>We encountered an issue processing your payment.</p>
<h3>Payment Details:</h3>
<ul>
  <li><strong>Amount:</strong> ${payload.amount} ${payload.currency}</li>
  <li><strong>Service:</strong> ${payload.serviceName}</li>
  <li><strong>Issue:</strong> ${payload.failureReason}</li>
  <li><strong>Transaction ID:</strong> ${payload.transactionId}</li>
</ul>
<h3>Next Steps:</h3>
<p>Please try again using a different payment method or contact your bank.</p>
${payload.retryUrl ? `<p><a href="${payload.retryUrl}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Try Again</a></p>` : ''}
<p>Need help? Contact our support team.</p>
        `,
      }));
    }

    // Refund processed (Stripe refund.created)
    if (eventType === 'refund-processed') {
      await step.inApp('refund-notification', async () => ({
        subject: `💰 Refund Processed - ${payload.refundAmount} ${payload.currency}`,
        body: `Your refund of ${payload.refundAmount} ${payload.currency} has been processed. It will appear in your account within 5-10 business days.`,
        data: {
          refundId: payload.refundId,
          refundAmount: payload.refundAmount,
          currency: payload.currency,
          originalPaymentId: payload.originalPaymentId,
          reason: payload.refundReason,
        },
      }));

      await step.email('refund-processed-email', async () => ({
        subject: `💰 Refund Processed - ${payload.refundAmount} ${payload.currency}`,
        body: `
<h2>Refund Processed 💰</h2>
<p>Hi ${payload.customerName || 'Valued Customer'},</p>
<p>Your refund has been processed successfully.</p>
<h3>Refund Details:</h3>
<ul>
  <li><strong>Refund Amount:</strong> ${payload.refundAmount} ${payload.currency}</li>
  <li><strong>Original Service:</strong> ${payload.serviceName}</li>
  <li><strong>Refund ID:</strong> ${payload.refundId}</li>
  <li><strong>Reason:</strong> ${payload.refundReason}</li>
  <li><strong>Processing Date:</strong> ${new Date().toLocaleDateString()}</li>
</ul>
<p>The refund will appear in your account within 5-10 business days, depending on your payment method.</p>
<p>Thank you for your understanding.</p>
        `,
      }));
    }

    // Stripe account updates
    if (eventType === 'stripe-account-update') {
      await step.inApp('account-update', async () => ({
        subject: `🔔 Account Update - ${payload.updateType}`,
        body: `Your Stripe account has been updated. Status: ${payload.accountStatus}. ${payload.message || ''}`,
        data: {
          accountId: payload.accountId,
          updateType: payload.updateType,
          accountStatus: payload.accountStatus,
          message: payload.message,
        },
      }));
    }

    // Stripe payouts for experts
    if (eventType === 'stripe-payout') {
      await step.inApp('payout-notification', async () => ({
        subject: `💸 Payout Sent - ${payload.payoutAmount} ${payload.currency}`,
        body: `Your payout of ${payload.payoutAmount} ${payload.currency} has been sent to your bank account ending in ${payload.bankLastFour}. Expected arrival: 1-2 business days.`,
        data: {
          payoutId: payload.payoutId,
          payoutAmount: payload.payoutAmount,
          currency: payload.currency,
          bankLastFour: payload.bankLastFour,
          expectedArrival: payload.expectedArrival,
        },
      }));
    }
  },
  {
    payloadSchema: z.object({
      eventType: z.enum([
        'payment-success',
        'payment-failed',
        'refund-processed',
        'stripe-account-update',
        'stripe-payout',
      ]),
      // Common fields
      customerName: z.string().optional(),
      serviceName: z.string().optional(),
      amount: z.string().optional(),
      currency: z.string().optional(),
      // Payment success fields
      paymentIntentId: z.string().optional(),
      paymentMethod: z.string().optional(),
      transactionId: z.string().optional(),
      receiptUrl: z.string().optional(),
      // Payment failure fields
      failureReason: z.string().optional(),
      failureCode: z.string().optional(),
      retryUrl: z.string().optional(),
      // Refund fields
      refundId: z.string().optional(),
      refundAmount: z.string().optional(),
      originalPaymentId: z.string().optional(),
      refundReason: z.string().optional(),
      // Account update fields
      accountId: z.string().optional(),
      updateType: z.string().optional(),
      accountStatus: z.string().optional(),
      message: z.string().optional(),
      // Payout fields
      payoutId: z.string().optional(),
      payoutAmount: z.string().optional(),
      bankLastFour: z.string().optional(),
      expectedArrival: z.string().optional(),
      // Localization
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
    tags: ['payments'],
    preferences: {
      all: { enabled: true },
      channels: {
        email: { enabled: true },
        inApp: { enabled: true },
      },
    },
  },
);

// 4. Universal Expert Management Workflow (combines 5 expert workflows)
export const expertManagementWorkflow = workflow(
  'expert-management',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const eventType = payload.eventType as string;

    // Onboarding complete
    if (eventType === 'onboarding-complete') {
      const content = await getLocalizedContent('expertOnboardingComplete', locale, payload);
      await step.inApp('onboarding-complete', async () => content);
    }

    // Setup step complete
    if (eventType === 'setup-step-complete') {
      const content = await getLocalizedContent('expertSetupStepComplete', locale, payload);
      await step.inApp('setup-step-complete', async () => content);
    }

    // Identity verification
    if (eventType === 'identity-verification') {
      const content = await getLocalizedContent('expertIdentityVerification', locale, payload);
      await step.inApp('identity-verification', async () => content);
    }

    // Google account setup
    if (eventType === 'google-account') {
      const content = await getLocalizedContent('expertGoogleAccount', locale, payload);
      await step.inApp('google-account-status', async () => content);
    }

    // Payout setup reminder
    if (eventType === 'payout-setup-reminder') {
      const content = await getLocalizedContent('expertPayoutSetupReminder', locale, payload);
      await step.inApp('payout-setup-reminder', async () => content);
    }
  },
  {
    payloadSchema: z.object({
      eventType: z.enum([
        'onboarding-complete',
        'setup-step-complete',
        'identity-verification',
        'google-account',
        'payout-setup-reminder',
      ]),
      expertId: z.string(),
      expertName: z.string(),
      stepType: z.string().optional(),
      actionType: z.string().optional(),
      status: z.string().optional(),
      message: z.string().optional(),
      setupUrl: z.string().optional(),
      accountEmail: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
    tags: ['expert'],
  },
);

// 5. Universal Appointment Workflow (comprehensive appointment management)
export const appointmentWorkflow = workflow(
  'appointment-universal',
  async ({ payload, step }) => {
    const eventType = payload.eventType as string;

    // Appointment reminders (24h, 1h before)
    if (eventType === 'reminder') {
      const timeUntil = payload.reminderType === '24h' ? '24 hours' : '1 hour';
      const isUrgent = payload.reminderType === '1h';

      await step.inApp('appointment-reminder', async () => ({
        subject: isUrgent
          ? `🔔 Appointment in 1 hour with ${payload.expertName}`
          : `📅 Appointment reminder - ${timeUntil}`,
        body: `Your appointment with ${payload.expertName} for ${payload.appointmentType} is scheduled for ${payload.appointmentDate} at ${payload.appointmentTime}. ${isUrgent ? 'Starting soon!' : ''}`,
        data: {
          expertName: payload.expertName,
          appointmentType: payload.appointmentType,
          appointmentDate: payload.appointmentDate,
          appointmentTime: payload.appointmentTime,
          meetLink: payload.meetLink,
          reminderType: payload.reminderType,
          isUrgent,
        },
      }));

      // Send reminder email
      await step.email('appointment-reminder-email', async () => ({
        subject: isUrgent
          ? `🔔 Appointment Starting Soon - ${payload.appointmentType}`
          : `📅 Appointment Reminder - ${payload.appointmentType}`,
        body: `
<h2>${isUrgent ? '🔔 Appointment Starting Soon!' : '📅 Appointment Reminder'}</h2>
<p>Hi ${payload.clientName || 'there'},</p>
<p>This is a ${timeUntil} reminder for your upcoming appointment.</p>
<h3>Appointment Details:</h3>
<ul>
  <li><strong>Expert:</strong> ${payload.expertName}</li>
  <li><strong>Service:</strong> ${payload.appointmentType}</li>
  <li><strong>Date:</strong> ${payload.appointmentDate}</li>
  <li><strong>Time:</strong> ${payload.appointmentTime}</li>
  ${payload.timezone ? `<li><strong>Timezone:</strong> ${payload.timezone}</li>` : ''}
  ${payload.duration ? `<li><strong>Duration:</strong> ${payload.duration} minutes</li>` : ''}
</ul>
${payload.meetLink ? `<p><a href="${payload.meetLink}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join Meeting</a></p>` : ''}
${payload.clientNotes ? `<h3>Your Notes:</h3><p>${payload.clientNotes}</p>` : ''}
<p>Need to reschedule? ${payload.rescheduleUrl ? `<a href="${payload.rescheduleUrl}">Click here</a>` : 'Contact support'}</p>
        `,
      }));
    }

    // Appointment cancelled
    if (eventType === 'cancelled') {
      await step.inApp('appointment-cancelled', async () => ({
        subject: `❌ Appointment Cancelled - ${payload.expertName}`,
        body: `Your appointment with ${payload.expertName} on ${payload.appointmentDate} has been cancelled. ${payload.cancellationReason ? `Reason: ${payload.cancellationReason}` : ''}`,
        data: {
          expertName: payload.expertName,
          appointmentDate: payload.appointmentDate,
          appointmentTime: payload.appointmentTime,
          cancellationReason: payload.cancellationReason,
          refundAmount: payload.refundAmount,
          newBookingUrl: payload.newBookingUrl,
        },
      }));

      // Send cancellation email
      await step.email('appointment-cancelled-email', async () => ({
        subject: `❌ Appointment Cancelled - ${payload.appointmentType}`,
        body: `
<h2>Appointment Cancelled ❌</h2>
<p>Hi ${payload.clientName || 'there'},</p>
<p>We're sorry to inform you that your appointment has been cancelled.</p>
<h3>Cancelled Appointment:</h3>
<ul>
  <li><strong>Expert:</strong> ${payload.expertName}</li>
  <li><strong>Service:</strong> ${payload.appointmentType}</li>
  <li><strong>Original Date:</strong> ${payload.appointmentDate}</li>
  <li><strong>Original Time:</strong> ${payload.appointmentTime}</li>
  ${payload.cancellationReason ? `<li><strong>Reason:</strong> ${payload.cancellationReason}</li>` : ''}
</ul>
${payload.refundAmount ? `<h3>Refund Information:</h3><p>A refund of ${payload.refundAmount} ${payload.currency || 'EUR'} will be processed within 5-10 business days.</p>` : ''}
<h3>Next Steps:</h3>
<p>We sincerely apologize for any inconvenience. We'd love to help you reschedule.</p>
${payload.newBookingUrl ? `<p><a href="${payload.newBookingUrl}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Book New Appointment</a></p>` : ''}
<p>Need assistance? Contact our support team.</p>
        `,
      }));
    }

    // New booking notification for expert
    if (eventType === 'new-booking-expert') {
      await step.inApp('new-booking-notification', async () => ({
        subject: `🎉 New Booking: ${payload.clientName}`,
        body: `You have a new booking from ${payload.clientName} for ${payload.appointmentType} on ${payload.appointmentDate} at ${payload.appointmentTime}.`,
        data: {
          clientName: payload.clientName,
          appointmentType: payload.appointmentType,
          appointmentDate: payload.appointmentDate,
          appointmentTime: payload.appointmentTime,
          clientNotes: payload.clientNotes,
          bookingAmount: payload.bookingAmount,
          currency: payload.currency,
        },
      }));

      // Send new booking email to expert
      await step.email('new-booking-email', async () => ({
        subject: `🎉 New Booking Confirmed - ${payload.appointmentType}`,
        body: `
<h2>New Booking Received! 🎉</h2>
<p>Hi ${payload.expertName},</p>
<p>You have received a new booking. Here are the details:</p>
<h3>Booking Details:</h3>
<ul>
  <li><strong>Client:</strong> ${payload.clientName}</li>
  <li><strong>Service:</strong> ${payload.appointmentType}</li>
  <li><strong>Date:</strong> ${payload.appointmentDate}</li>
  <li><strong>Time:</strong> ${payload.appointmentTime}</li>
  ${payload.timezone ? `<li><strong>Timezone:</strong> ${payload.timezone}</li>` : ''}
  ${payload.duration ? `<li><strong>Duration:</strong> ${payload.duration} minutes</li>` : ''}
  ${payload.bookingAmount ? `<li><strong>Booking Value:</strong> ${payload.bookingAmount} ${payload.currency || 'EUR'}</li>` : ''}
</ul>
${payload.clientNotes ? `<h3>Client Notes:</h3><p>"${payload.clientNotes}"</p>` : ''}
<h3>Next Steps:</h3>
<p>The meeting details will be sent automatically. You can view all booking details in your dashboard.</p>
${payload.appointmentDetailsLink ? `<p><a href="${payload.appointmentDetailsLink}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Booking Details</a></p>` : ''}
<p>Thank you for being part of Eleva Care!</p>
        `,
      }));
    }

    // Appointment rescheduled
    if (eventType === 'rescheduled') {
      await step.inApp('appointment-rescheduled', async () => ({
        subject: `📅 Appointment Rescheduled - ${payload.expertName}`,
        body: `Your appointment with ${payload.expertName} has been rescheduled from ${payload.originalDate} to ${payload.appointmentDate} at ${payload.appointmentTime}.`,
        data: {
          expertName: payload.expertName,
          originalDate: payload.originalDate,
          originalTime: payload.originalTime,
          appointmentDate: payload.appointmentDate,
          appointmentTime: payload.appointmentTime,
          rescheduleReason: payload.rescheduleReason,
        },
      }));

      // Send reschedule confirmation email
      await step.email('appointment-rescheduled-email', async () => ({
        subject: `📅 Appointment Rescheduled - ${payload.appointmentType}`,
        body: `
<h2>Appointment Rescheduled 📅</h2>
<p>Hi ${payload.clientName || 'there'},</p>
<p>Your appointment has been successfully rescheduled.</p>
<h3>Updated Appointment:</h3>
<ul>
  <li><strong>Expert:</strong> ${payload.expertName}</li>
  <li><strong>Service:</strong> ${payload.appointmentType}</li>
  <li><strong>New Date:</strong> ${payload.appointmentDate}</li>
  <li><strong>New Time:</strong> ${payload.appointmentTime}</li>
  ${payload.timezone ? `<li><strong>Timezone:</strong> ${payload.timezone}</li>` : ''}
</ul>
<h3>Previous Appointment:</h3>
<ul>
  <li><strong>Original Date:</strong> ${payload.originalDate}</li>
  <li><strong>Original Time:</strong> ${payload.originalTime}</li>
  ${payload.rescheduleReason ? `<li><strong>Reason for Change:</strong> ${payload.rescheduleReason}</li>` : ''}
</ul>
${payload.meetLink ? `<p><a href="${payload.meetLink}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join Meeting</a></p>` : ''}
<p>Thank you for your flexibility!</p>
        `,
      }));
    }

    // Appointment completed
    if (eventType === 'completed') {
      await step.inApp('appointment-completed', async () => ({
        subject: `✅ Session Complete - ${payload.expertName}`,
        body: `Your session with ${payload.expertName} has been completed. Thank you for choosing Eleva Care!`,
        data: {
          expertName: payload.expertName,
          appointmentType: payload.appointmentType,
          sessionDuration: payload.sessionDuration,
          completedAt: payload.completedAt,
        },
      }));

      // Send completion and feedback email
      await step.email('appointment-completed-email', async () => ({
        subject: `✅ Session Complete - How was your experience?`,
        body: `
<h2>Session Completed! ✅</h2>
<p>Hi ${payload.clientName || 'there'},</p>
<p>Your session with ${payload.expertName} has been completed.</p>
<h3>Session Summary:</h3>
<ul>
  <li><strong>Expert:</strong> ${payload.expertName}</li>
  <li><strong>Service:</strong> ${payload.appointmentType}</li>
  <li><strong>Date:</strong> ${payload.appointmentDate}</li>
  <li><strong>Duration:</strong> ${payload.sessionDuration || payload.duration} minutes</li>
  <li><strong>Completed:</strong> ${payload.completedAt || 'Just now'}</li>
</ul>
<h3>How was your experience?</h3>
<p>Your feedback helps us improve our services and support our experts.</p>
${payload.feedbackUrl ? `<p><a href="${payload.feedbackUrl}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Leave Feedback</a></p>` : ''}
${payload.rebookUrl ? `<p>Need another session? <a href="${payload.rebookUrl}">Book Again</a></p>` : ''}
<p>Thank you for choosing Eleva Care!</p>
        `,
      }));
    }
  },
  {
    payloadSchema: z.object({
      eventType: z.enum([
        'reminder',
        'cancelled',
        'new-booking-expert',
        'rescheduled',
        'completed',
      ]),
      // Common fields
      expertName: z.string(),
      clientName: z.string().optional(),
      appointmentType: z.string().optional(),
      appointmentDate: z.string(),
      appointmentTime: z.string().optional(),
      timezone: z.string().optional(),
      duration: z.number().optional(),
      // Reminder fields
      reminderType: z.enum(['24h', '1h']).optional(),
      meetLink: z.string().optional(),
      rescheduleUrl: z.string().optional(),
      // Cancellation fields
      cancellationReason: z.string().optional(),
      refundAmount: z.string().optional(),
      currency: z.string().optional(),
      newBookingUrl: z.string().optional(),
      // New booking fields
      clientNotes: z.string().optional(),
      bookingAmount: z.string().optional(),
      appointmentDetailsLink: z.string().optional(),
      // Reschedule fields
      originalDate: z.string().optional(),
      originalTime: z.string().optional(),
      rescheduleReason: z.string().optional(),
      // Completion fields
      sessionDuration: z.string().optional(),
      completedAt: z.string().optional(),
      feedbackUrl: z.string().optional(),
      rebookUrl: z.string().optional(),
      // Localization
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
    tags: ['appointments'],
    preferences: {
      all: { enabled: true },
      channels: {
        email: { enabled: true },
        inApp: { enabled: true },
      },
    },
  },
);

// 6. Universal Marketplace Workflow
export const marketplaceWorkflow = workflow(
  'marketplace-universal',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const eventType = payload.eventType as string;

    if (eventType === 'payment-received') {
      const content = await getLocalizedContent('marketplacePaymentReceived', locale, payload);
      await step.inApp('marketplace-payment-received', async () => content);
    }

    if (eventType === 'payout-processed') {
      const content = await getLocalizedContent('marketplacePayoutProcessed', locale, payload);
      await step.inApp('marketplace-payout-processed', async () => content);
    }

    if (eventType === 'connect-account-status') {
      const content = await getLocalizedContent('marketplaceConnectAccountStatus', locale, payload);
      await step.inApp('connect-account-status', async () => content);
    }
  },
  {
    payloadSchema: z.object({
      eventType: z.enum(['payment-received', 'payout-processed', 'connect-account-status']),
      amount: z.string().optional(),
      expertName: z.string().optional(),
      accountStatus: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
    tags: ['marketplace'],
  },
);

// 7-9. EMAIL TEMPLATE WORKFLOWS (CORE - Keep separate for clarity)
export const appointmentConfirmationWorkflow = workflow(
  'appointment-confirmation',
  async ({ payload, step }) => {
    const locale = getLocale(payload);

    // In-app notification with enhanced details
    await step.inApp('appointment-confirmed', async () => ({
      subject: `✅ Appointment confirmed with ${payload.expertName}`,
      body: `Your appointment for ${payload.eventTitle} is confirmed for ${payload.appointmentDate} at ${payload.appointmentTime}. You'll receive a calendar invite and meeting link shortly.`,
      data: {
        expertName: payload.expertName,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        meetLink: payload.meetLink,
        timezone: payload.timezone,
      },
    }));

    // Email using existing beautiful AppointmentConfirmation template
    await step.email('appointment-confirmation-email', async () => {
      const emailBody = await elevaEmailService.renderAppointmentConfirmation({
        expertName: payload.expertName,
        clientName: payload.clientName,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        timezone: payload.timezone,
        appointmentDuration: payload.appointmentDuration,
        eventTitle: payload.eventTitle,
        meetLink: payload.meetLink,
        notes: payload.notes,
        locale: String(locale),
      });

      return {
        subject: `✅ Appointment Confirmed - ${payload.eventTitle}`,
        body: emailBody,
      };
    });
  },
  {
    payloadSchema: z.object({
      expertName: z.string(),
      clientName: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      timezone: z.string(),
      appointmentDuration: z.string(),
      eventTitle: z.string(),
      meetLink: z.string().optional(),
      notes: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
    tags: ['appointments', 'email'],
    preferences: {
      all: { enabled: true },
      channels: {
        email: { enabled: true },
        inApp: { enabled: true },
      },
    },
  },
);

export const multibancoBookingPendingWorkflow = workflow(
  'multibanco-booking-pending',
  async ({ payload, step }) => {
    const locale = getLocale(payload);

    // In-app notification with enhanced payment details
    await step.inApp('booking-payment-pending', async () => ({
      subject: `💳 Payment required for your booking with ${payload.expertName}`,
      body: `Complete your payment using Multibanco to confirm your appointment. Reference: ${payload.multibancoReference}. Amount: ${payload.multibancoAmount}`,
      data: {
        expertName: payload.expertName,
        multibancoReference: payload.multibancoReference,
        multibancoAmount: payload.multibancoAmount,
        voucherExpiresAt: payload.voucherExpiresAt,
        hostedVoucherUrl: payload.hostedVoucherUrl,
      },
    }));

    // Email using existing beautiful MultibancoBookingPending template
    await step.email('multibanco-booking-email', async () => {
      const emailBody = await elevaEmailService.renderMultibancoBookingPending({
        customerName: payload.customerName,
        expertName: payload.expertName,
        serviceName: payload.serviceName,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        timezone: payload.timezone,
        duration: payload.duration,
        multibancoEntity: payload.multibancoEntity,
        multibancoReference: payload.multibancoReference,
        multibancoAmount: payload.multibancoAmount,
        voucherExpiresAt: payload.voucherExpiresAt,
        hostedVoucherUrl: payload.hostedVoucherUrl,
        customerNotes: payload.customerNotes,
        locale: String(locale),
      });

      return {
        subject: `💳 Payment Required - ${payload.serviceName} Booking`,
        body: emailBody,
      };
    });
  },
  {
    payloadSchema: z.object({
      customerName: z.string(),
      expertName: z.string(),
      serviceName: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      timezone: z.string(),
      duration: z.number(),
      multibancoEntity: z.string(),
      multibancoReference: z.string(),
      multibancoAmount: z.string(),
      voucherExpiresAt: z.string(),
      hostedVoucherUrl: z.string(),
      customerNotes: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
    tags: ['payments', 'email'],
    preferences: {
      all: { enabled: true },
      channels: {
        email: { enabled: true },
        inApp: { enabled: true },
      },
    },
  },
);

export const multibancoPaymentReminderWorkflow = workflow(
  'multibanco-payment-reminder',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const isUrgent = payload.reminderType === 'urgent';

    // In-app notification with enhanced urgency indicators
    await step.inApp('payment-reminder', async () => ({
      subject: isUrgent
        ? `⚠️ URGENT: Payment expires in ${payload.daysRemaining} days`
        : `💡 Payment reminder for your booking`,
      body: isUrgent
        ? `Your Multibanco payment will expire soon! Complete payment to secure your appointment with ${payload.expertName}. Amount: ${payload.multibancoAmount}`
        : `Don't forget to complete your payment for the appointment with ${payload.expertName}. Reference: ${payload.multibancoReference}`,
      data: {
        reminderType: payload.reminderType,
        daysRemaining: payload.daysRemaining,
        expertName: payload.expertName,
        multibancoAmount: payload.multibancoAmount,
        multibancoReference: payload.multibancoReference,
        hostedVoucherUrl: payload.hostedVoucherUrl,
      },
    }));

    // Email using existing beautiful MultibancoPaymentReminder template
    await step.email('multibanco-reminder-email', async () => {
      const emailBody = await elevaEmailService.renderMultibancoPaymentReminder({
        customerName: payload.customerName,
        expertName: payload.expertName,
        serviceName: payload.serviceName,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        timezone: payload.timezone,
        duration: payload.duration,
        multibancoEntity: payload.multibancoEntity,
        multibancoReference: payload.multibancoReference,
        multibancoAmount: payload.multibancoAmount,
        voucherExpiresAt: payload.voucherExpiresAt,
        hostedVoucherUrl: payload.hostedVoucherUrl,
        customerNotes: payload.customerNotes,
        reminderType: payload.reminderType,
        daysRemaining: payload.daysRemaining,
        locale: String(locale),
      });

      return {
        subject: isUrgent
          ? `⚠️ URGENT: Payment expires in ${payload.daysRemaining} days - ${payload.serviceName}`
          : `💡 Payment Reminder - ${payload.serviceName} Booking`,
        body: emailBody,
      };
    });
  },
  {
    payloadSchema: z.object({
      customerName: z.string(),
      expertName: z.string(),
      serviceName: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      timezone: z.string(),
      duration: z.number(),
      multibancoEntity: z.string(),
      multibancoReference: z.string(),
      multibancoAmount: z.string(),
      voucherExpiresAt: z.string(),
      hostedVoucherUrl: z.string(),
      customerNotes: z.string().optional(),
      reminderType: z.enum(['gentle', 'urgent']),
      daysRemaining: z.number(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
    tags: ['payments', 'email'],
    preferences: {
      all: { enabled: true },
      channels: {
        email: { enabled: true },
        inApp: { enabled: true },
      },
    },
  },
);

// 10. SYSTEM/UTILITY WORKFLOWS
export const systemHealthWorkflow = workflow(
  'system-health',
  async ({ payload, step }) => {
    const eventType = payload.eventType as string;

    if (eventType === 'health-check-failure') {
      // Send immediate notification
      await step.inApp('health-check-alert', async () => ({
        subject: `⚠️ Health Check Failure: ${payload.environment}`,
        body: `Status: ${payload.status}
Error: ${payload.error || 'Unknown error'}
Environment: ${payload.environment}
Memory: ${payload.memory.used}MB/${payload.memory.total}MB (${payload.memory.percentage}%)
Timestamp: ${payload.timestamp}`,
      }));

      // Send detailed email
      await step.email('health-check-alert-email', async () => ({
        subject: `⚠️ Eleva Care Health Check Failure - ${payload.environment}`,
        body: `
<h2>⚠️ Health Check Failure Alert</h2>
<p>A health check failure has been detected in the Eleva Care application.</p>
<h3>System Details</h3>
<ul>
  <li><strong>Status:</strong> ${payload.status}</li>
  <li><strong>Error:</strong> ${payload.error || 'Unknown error'}</li>
  <li><strong>Environment:</strong> ${payload.environment}</li>
  <li><strong>Timestamp:</strong> ${payload.timestamp}</li>
</ul>`,
      }));
    }
  },
  {
    payloadSchema: z.object({
      eventType: z.enum(['health-check-failure']),
      status: z.enum(['healthy', 'unhealthy']),
      error: z.string().optional(),
      timestamp: z.string(),
      environment: z.string(),
      memory: z.object({
        used: z.number(),
        total: z.number(),
        percentage: z.number(),
      }),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
    tags: ['system'],
  },
);

// 10. Expert Payout Notification Workflow
export const expertPayoutNotificationWorkflow = workflow(
  'expert-payout-notification',
  async ({ payload, step }) => {
    const locale = getLocale(payload);

    // In-app notification step with enhanced data
    await step.inApp('payout-sent', async () => {
      const expertName = (payload.expertName as string) || 'Expert';
      const payoutAmount = (payload.payoutAmount as string) || '0.00';
      const currency = (payload.currency as string) || 'EUR';
      const clientName = (payload.clientName as string) || 'Client';

      return {
        subject: `💰 Payout Sent: ${currency} ${payoutAmount}`,
        body: `Your earnings of ${currency} ${payoutAmount} from your appointment with ${clientName} have been sent to your bank account. Expected arrival: 1-2 business days.`,
        data: {
          payoutId: payload.payoutId,
          amount: payoutAmount,
          currency,
          expertName,
          clientName,
          appointmentDate: payload.appointmentDate,
          appointmentTime: payload.appointmentTime,
          serviceName: payload.serviceName,
          bankLastFour: payload.bankLastFour,
        },
      };
    });

    // Email notification step with production-ready template
    await step.email('payout-email', async () => {
      const expertName = (payload.expertName as string) || 'Expert';
      const payoutAmount = (payload.payoutAmount as string) || '0.00';
      const currency = (payload.currency as string) || 'EUR';
      const clientName = (payload.clientName as string) || 'Client';

      // Use the React email template directly
      const templateData = {
        expertName,
        payoutAmount,
        currency,
        appointmentDate: (payload.appointmentDate as string) || 'Recent appointment',
        appointmentTime: (payload.appointmentTime as string) || 'N/A',
        clientName,
        serviceName: (payload.serviceName as string) || 'Professional consultation',
        payoutId: (payload.payoutId as string) || 'N/A',
        expectedArrivalDate: (payload.expectedArrivalDate as string) || 'Soon',
        bankLastFour: (payload.bankLastFour as string) || '••••',
        dashboardUrl: (payload.dashboardUrl as string) || '#',
        supportUrl: (payload.supportUrl as string) || '#',
        _locale: locale,
      };

      const html = await render(
        React.createElement(ExpertPayoutNotificationTemplate, templateData),
      );
      const emailContent = { html };

      return {
        subject: `💰 Payout sent: ${currency} ${payoutAmount} for your appointment with ${clientName}`,
        body: emailContent.html,
      };
    });
  },
  {
    payloadSchema: z.object({
      expertName: z.string().optional(),
      payoutAmount: z.string(),
      currency: z.string(),
      appointmentDate: z.string().optional(),
      appointmentTime: z.string().optional(),
      clientName: z.string().optional(),
      serviceName: z.string().optional(),
      payoutId: z.string().optional(),
      expectedArrivalDate: z.string().optional(),
      bankLastFour: z.string().optional(),
      dashboardUrl: z.string().optional(),
      supportUrl: z.string().optional(),
      locale: z.string().optional(),
    }),
    tags: ['experts', 'payments', 'notifications'],
    preferences: {
      all: { enabled: true },
      channels: {
        email: { enabled: true },
        inApp: { enabled: true },
      },
    },
  },
);

// All workflows exported for the Novu framework
export const workflows = [
  userLifecycleWorkflow,
  securityAuthWorkflow,
  paymentWorkflow,
  expertManagementWorkflow,
  appointmentWorkflow,
  marketplaceWorkflow,
  appointmentConfirmationWorkflow,
  multibancoBookingPendingWorkflow,
  multibancoPaymentReminderWorkflow,
  systemHealthWorkflow,
  expertPayoutNotificationWorkflow, // Added our new workflow

  // Future slots (8 remaining for new features)
];

// Add to the existing workflow configuration
export const NOVU_WORKFLOWS = {
  // ... existing workflows ...

  // Expert payout notification
  EXPERT_PAYOUT_NOTIFICATION: {
    id: 'expert-payout-notification',
    name: 'Expert Payout Notification',
    description: 'Notifies experts when their payout has been sent to their bank account',
    triggers: ['payout.completed'],
    channels: ['email', 'in_app'],
    templateData: {
      expertName: 'string',
      payoutAmount: 'string',
      currency: 'string',
      appointmentDate: 'string',
      appointmentTime: 'string',
      clientName: 'string',
      serviceName: 'string',
      payoutId: 'string',
      expectedArrivalDate: 'string',
      bankLastFour: 'string',
      dashboardUrl: 'string',
      supportUrl: 'string',
      locale: 'string',
    },
  },
} as const;
