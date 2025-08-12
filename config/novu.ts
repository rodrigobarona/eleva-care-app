import { elevaEmailService } from '@/lib/novu-email-service';
import { workflow } from '@novu/framework';
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

// 3. Universal Payment Workflow (combines 4 payment workflows)
export const paymentWorkflow = workflow(
  'payment-universal',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const eventType = payload.eventType as string;

    // Payment success
    if (eventType === 'payment-success') {
      const content = await getLocalizedContent('paymentSuccess', locale, payload);
      await step.inApp('payment-confirmation', async () => content);
    }

    // Payment failed
    if (eventType === 'payment-failed') {
      const content = await getLocalizedContent('paymentFailed', locale, payload);
      await step.inApp('payment-failure', async () => content);
    }

    // Stripe account updates
    if (eventType === 'stripe-account-update') {
      const content = await getLocalizedContent('stripeAccountUpdate', locale, payload);
      await step.inApp('account-update', async () => content);
    }

    // Stripe payouts
    if (eventType === 'stripe-payout') {
      const content = await getLocalizedContent('stripePayout', locale, payload);
      await step.inApp('payout-notification', async () => content);
    }
  },
  {
    payloadSchema: z.object({
      eventType: z.enum([
        'payment-success',
        'payment-failed',
        'stripe-account-update',
        'stripe-payout',
      ]),
      amount: z.string().optional(),
      planName: z.string().optional(),
      reason: z.string().optional(),
      accountId: z.string().optional(),
      payoutAmount: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
    tags: ['payments'],
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

// 5. Universal Appointment Workflow (combines appointment-related workflows)
export const appointmentWorkflow = workflow(
  'appointment-universal',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const eventType = payload.eventType as string;

    // Appointment reminders
    if (eventType === 'reminder') {
      const content = await getLocalizedContent('appointmentReminder', locale, payload);
      await step.inApp('appointment-reminder', async () => content);
    }

    // Appointment cancelled
    if (eventType === 'cancelled') {
      const content = await getLocalizedContent('appointmentCancelled', locale, payload);
      await step.inApp('appointment-cancelled', async () => content);
    }

    // New booking for expert
    if (eventType === 'new-booking-expert') {
      const content = await getLocalizedContent('newBookingExpert', locale, payload);
      await step.inApp('new-booking-notification', async () => content);

      const emailContent = await getLocalizedContent('newBookingExpert', locale, payload, 'email');
      await step.email('new-booking-email', async () => ({
        subject: emailContent.subject,
        body: emailContent.body,
      }));
    }
  },
  {
    payloadSchema: z.object({
      eventType: z.enum(['reminder', 'cancelled', 'new-booking-expert']),
      expertName: z.string(),
      clientName: z.string().optional(),
      appointmentType: z.string().optional(),
      appointmentDate: z.string(),
      appointmentTime: z.string().optional(),
      clientNotes: z.string().optional(),
      appointmentDetailsLink: z.string().optional(),
      cancellationReason: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
    tags: ['appointments'],
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

    // In-app notification
    await step.inApp('appointment-confirmed', async () => ({
      subject: `Appointment confirmed with ${payload.expertName}`,
      body: `Your appointment for ${payload.eventTitle} is confirmed for ${payload.appointmentDate} at ${payload.appointmentTime}.`,
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
        subject: `Appointment Confirmed - ${payload.eventTitle}`,
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
  },
);

export const multibancoBookingPendingWorkflow = workflow(
  'multibanco-booking-pending',
  async ({ payload, step }) => {
    const locale = getLocale(payload);

    // In-app notification
    await step.inApp('booking-payment-pending', async () => ({
      subject: `Payment required for your booking with ${payload.expertName}`,
      body: `Complete your payment using Multibanco to confirm your appointment. Reference: ${payload.multibancoReference}`,
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
        subject: `Payment Required - ${payload.serviceName} Booking`,
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
  },
);

export const multibancoPaymentReminderWorkflow = workflow(
  'multibanco-payment-reminder',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const isUrgent = payload.reminderType === 'urgent';

    // In-app notification with urgency
    await step.inApp('payment-reminder', async () => ({
      subject: isUrgent
        ? `⚠️ Urgent: Payment expires in ${payload.daysRemaining} days`
        : `Payment reminder for your booking`,
      body: isUrgent
        ? `Your Multibanco payment will expire soon! Complete payment to secure your appointment with ${payload.expertName}.`
        : `Don't forget to complete your payment for the appointment with ${payload.expertName}.`,
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
          ? `⚠️ Urgent: Payment expires in ${payload.daysRemaining} days - ${payload.serviceName}`
          : `Payment Reminder - ${payload.serviceName} Booking`,
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

// Export consolidated workflows (12 total - well within free plan limit)
export const workflows = [
  // Universal workflows (6)
  userLifecycleWorkflow,
  securityAuthWorkflow,
  paymentWorkflow,
  expertManagementWorkflow,
  appointmentWorkflow,
  marketplaceWorkflow,

  // Email template workflows (3) - Core business features
  appointmentConfirmationWorkflow,
  multibancoBookingPendingWorkflow,
  multibancoPaymentReminderWorkflow,

  // System workflows (1)
  systemHealthWorkflow,

  // Future slots (9 remaining for new features)
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
