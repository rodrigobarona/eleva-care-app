import { workflow } from '@novu/framework';
import { z } from 'zod';

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

    // Simple template replacement
    const replaceVars = (
      text: string,
      vars: Record<string, string | number | boolean | undefined>,
    ) => {
      return text.replace(/\{(\w+)\}/g, (match, key) => String(vars[key] || match));
    };

    if (type === 'email' && notificationData.email) {
      const email = notificationData.email;
      let body = '';

      if (email.title) body += `<h2>${replaceVars(email.title, params)}</h2>\n`;
      if (email.greeting) body += `<p>${replaceVars(email.greeting, params)}</p>\n`;
      if (email.body) body += `<p>${replaceVars(email.body, params)}</p>\n`;

      if (email.detailsTitle) {
        body += `<h3>${replaceVars(email.detailsTitle, params)}</h3>\n<ul>\n`;
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
            body += `  <li><strong>${replaceVars(email[key], params)}</strong></li>\n`;
        });
        body += `</ul>\n`;
      }

      if (email.footer) body += `<p>${replaceVars(email.footer, params)}</p>\n`;
      if (email.cta) {
        const ctaUrl = params.dashboardUrl || params.actionUrl || '/account';
        body += `<p><a href="${String(ctaUrl)}">${replaceVars(email.cta, params)}</a></p>\n`;
      }

      return {
        subject: replaceVars(email.subject, params),
        body: body.trim(),
      };
    }

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

// Define notification workflows with next-intl integration
export const welcomeWorkflow = workflow(
  'user-welcome',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const content = await getLocalizedContent('welcome', locale, payload);

    await step.inApp('welcome-message', async () => content);

    const emailContent = await getLocalizedContent('welcome', locale, payload, 'email');
    await step.email('welcome-email', async () => ({
      subject: emailContent.subject,
      body: emailContent.body,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      clerkUserId: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
  },
);

export const accountVerificationWorkflow = workflow(
  'account-verification',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const content = await getLocalizedContent('accountVerification', locale, payload);

    await step.inApp('verification-reminder', async () => content);
  },
  {
    payloadSchema: z.object({
      userId: z.string(),
      verificationUrl: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
  },
);

export const paymentSuccessWorkflow = workflow(
  'payment-success',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const content = await getLocalizedContent('paymentSuccess', locale, payload);

    await step.inApp('payment-confirmation', async () => content);
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      planName: z.string(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
  },
);

export const paymentFailedWorkflow = workflow(
  'payment-failed',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const content = await getLocalizedContent('paymentFailed', locale, payload);

    await step.inApp('payment-failure', async () => content);
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      reason: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
  },
);

export const securityAlertWorkflow = workflow(
  'security-alert',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const content = await getLocalizedContent('securityAlert', locale, payload);

    await step.inApp('security-notification', async () => content);
  },
  {
    payloadSchema: z.object({
      message: z.string(),
      alertType: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
  },
);

// New Stripe-specific workflows
export const stripeAccountUpdateWorkflow = workflow(
  'stripe-account-update',
  async ({ payload, step }) => {
    await step.inApp('account-status-change', async () => ({
      subject: 'Account Status Updated',
      body: payload.message,
    }));
  },
  {
    payloadSchema: z.object({
      message: z.string(),
      accountId: z.string(),
      statusType: z.string().optional(),
    }),
  },
);

export const stripePayoutWorkflow = workflow(
  'stripe-payout',
  async ({ payload, step }) => {
    await step.inApp('payout-notification', async () => ({
      subject: `Payout ${payload.status}: ${payload.amount}`,
      body: payload.message,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      status: z.string(),
      message: z.string(),
      payoutId: z.string(),
    }),
  },
);

// Enhanced Marketplace Payment Workflows
export const marketplacePaymentReceivedWorkflow = workflow(
  'marketplace-payment-received',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const content = await getLocalizedContent('marketplacePaymentReceived', locale, payload);

    await step.inApp('payment-received-notification', async () => content);

    const emailContent = await getLocalizedContent(
      'marketplacePaymentReceived',
      locale,
      payload,
      'email',
    );
    await step.email('payment-received-email', async () => ({
      subject: emailContent.subject,
      body: emailContent.body,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      clientName: z.string().optional(),
      sessionDate: z.string(),
      transactionId: z.string(),
      dashboardUrl: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
  },
);

export const marketplacePayoutProcessedWorkflow = workflow(
  'marketplace-payout-processed',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const content = await getLocalizedContent('marketplacePayoutProcessed', locale, payload);

    await step.inApp('payout-processed-notification', async () => content);

    const emailContent = await getLocalizedContent(
      'marketplacePayoutProcessed',
      locale,
      payload,
      'email',
    );
    await step.email('payout-processed-email', async () => ({
      subject: emailContent.subject,
      body: emailContent.body,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      payoutId: z.string(),
      expectedArrival: z.string(),
      bankAccount: z.string(),
      dashboardUrl: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
  },
);

export const marketplaceConnectAccountStatusWorkflow = workflow(
  'marketplace-connect-status',
  async ({ payload, step }) => {
    await step.inApp('connect-status-notification', async () => ({
      subject: payload.title,
      body: payload.message,
    }));

    if (payload.requiresAction) {
      await step.email('connect-status-email', async () => ({
        subject: payload.title,
        body: `
          <h2>${payload.title}</h2>
          <p>${payload.message}</p>
          ${payload.actionRequired ? `<p><strong>Action Required:</strong> ${payload.actionRequired}</p>` : ''}
          <p><a href="${payload.actionUrl || '/account/connect'}">Complete Setup</a></p>
        `,
      }));
    }
  },
  {
    payloadSchema: z.object({
      title: z.string(),
      message: z.string(),
      requiresAction: z.boolean().default(false),
      actionRequired: z.string().optional(),
      actionUrl: z.string().optional(),
    }),
  },
);

// Clerk-specific workflows
export const userCreatedWorkflow = workflow(
  'user-created',
  async ({ payload, step }) => {
    await step.inApp('welcome-new-user', async () => ({
      subject: `Welcome to Eleva Care, ${payload.firstName || 'there'}!`,
      body: `Thank you for joining Eleva Care. Complete your profile to get started with personalized healthcare recommendations.`,
    }));

    await step.email('welcome-email', async () => ({
      subject: 'Welcome to Eleva Care!',
      body: `
        <h2>Welcome to Eleva Care!</h2>
        <p>Hi ${payload.firstName || 'there'},</p>
        <p>Thank you for joining our healthcare platform. We're excited to help you on your wellness journey.</p>
        <h3>Next Steps:</h3>
        <ul>
          <li>Complete your profile</li>
          <li>Browse available experts</li>
          <li>Book your first consultation</li>
        </ul>
        <p><a href="/profile">Complete Your Profile</a></p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email(),
      clerkUserId: z.string(),
    }),
  },
);

export const recentLoginWorkflow = workflow(
  'recent-login-v2',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const content = await getLocalizedContent('recentLogin', locale, payload);

    await step.inApp('login-notification', async () => content);
  },
  {
    payloadSchema: z.object({
      location: z.string().optional(),
      timestamp: z.string(),
      ipAddress: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
  },
);

// Expert-specific workflows
export const expertOnboardingCompleteWorkflow = workflow(
  'expert-onboarding-complete',
  async ({ payload, step }) => {
    await step.inApp('onboarding-complete', async () => ({
      subject: 'Expert setup complete!',
      body: `Congratulations ${payload.expertName}! Your expert profile is now live. You can start receiving bookings from clients.`,
    }));

    await step.email('expert-welcome-email', async () => ({
      subject: 'Welcome to the Eleva Care Expert Network!',
      body: `
        <h2>Congratulations, ${payload.expertName}!</h2>
        <p>Your expert profile is now active on Eleva Care.</p>
        ${payload.specialization ? `<p><strong>Specialization:</strong> ${payload.specialization}</p>` : ''}
        <h3>You can now:</h3>
        <ul>
          <li>Receive client bookings</li>
          <li>Manage your availability</li>
          <li>Track your earnings</li>
          <li>Build your client base</li>
        </ul>
        <p><a href="/dashboard">Go to Dashboard</a></p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      expertName: z.string(),
      specialization: z.string().optional(),
    }),
  },
);

// Appointment Management Workflows
export const appointmentReminderWorkflow = workflow(
  'appointment-reminder-24hr',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const content = await getLocalizedContent('appointmentReminder', locale, payload);

    await step.inApp('appointment-reminder-notification', async () => content);

    const emailContent = await getLocalizedContent('appointmentReminder', locale, payload, 'email');
    await step.email('appointment-reminder-email', async () => ({
      subject: emailContent.subject,
      body: emailContent.body,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      expertName: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      appointmentType: z.string(),
      timeUntilAppointment: z.string(),
      meetingLink: z.string(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
  },
);

export const appointmentCancelledWorkflow = workflow(
  'appointment-cancelled',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const content = await getLocalizedContent('appointmentCancelled', locale, payload);

    await step.inApp('appointment-cancelled-notification', async () => content);

    const emailContent = await getLocalizedContent(
      'appointmentCancelled',
      locale,
      payload,
      'email',
    );
    await step.email('appointment-cancelled-email', async () => ({
      subject: emailContent.subject,
      body: emailContent.body,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      expertName: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      appointmentType: z.string(),
      reasonForCancellation: z.string().optional(),
      refundStatusMessage: z.string().optional(),
      rebookingLink: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
  },
);

// Expert Business Workflows
export const expertPayoutSetupReminderWorkflow = workflow(
  'expert-payout-setup-reminder',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const content = await getLocalizedContent('expertPayoutSetup', locale, payload);

    await step.inApp('payout-setup-reminder', async () => content);

    const emailContent = await getLocalizedContent('expertPayoutSetup', locale, payload, 'email');
    await step.email('payout-setup-reminder-email', async () => ({
      subject: emailContent.subject,
      body: emailContent.body,
    }));
  },
  {
    payloadSchema: z.object({
      expertName: z.string(),
      stripeConnectSetupLink: z.string(),
      deadlineText: z.string().optional(),
      supportContactLink: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
  },
);

export const expertProfileActionRequiredWorkflow = workflow(
  'expert-profile-action-required',
  async ({ payload, step }) => {
    await step.inApp('profile-action-notification', async () => ({
      subject: payload.statusMessage,
      body: payload.message,
    }));

    await step.email('profile-action-email', async () => ({
      subject: 'Update Regarding Your Eleva Care Expert Profile',
      body: `
        <h2>Profile Update Required</h2>
        <p>Hi ${payload.expertName},</p>
        <p><strong>Status:</strong> ${payload.statusMessage}</p>
        ${payload.specificFeedback ? `<p><strong>Details:</strong> ${payload.specificFeedback}</p>` : ''}
        <p>Please review and update your profile to continue receiving bookings.</p>
        <p><a href="${payload.profileEditLink}">Update Your Profile</a></p>
        <p>Questions? <a href="${payload.supportContactLink || '/support'}">Contact Support</a></p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      expertName: z.string(),
      statusMessage: z.string(),
      message: z.string(),
      specificFeedback: z.string().optional(),
      profileEditLink: z.string(),
      supportContactLink: z.string().optional(),
    }),
  },
);

export const newBookingExpertWorkflow = workflow(
  'new-booking-expert',
  async ({ payload, step }) => {
    const locale = getLocale(payload);
    const content = await getLocalizedContent('newBookingExpert', locale, payload);

    await step.inApp('new-booking-notification', async () => content);

    const emailContent = await getLocalizedContent('newBookingExpert', locale, payload, 'email');
    await step.email('new-booking-email', async () => ({
      subject: emailContent.subject,
      body: emailContent.body,
    }));
  },
  {
    payloadSchema: z.object({
      expertName: z.string(),
      clientName: z.string(),
      appointmentType: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      clientNotes: z.string().optional(),
      appointmentDetailsLink: z.string(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
  },
);

// Health Check Failure Workflow
export const healthCheckFailureWorkflow = workflow(
  'health-check-failure',
  async ({ payload, step }) => {
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
  <li><strong>Version:</strong> ${payload.version}</li>
  <li><strong>Node Version:</strong> ${payload.nodeVersion}</li>
</ul>

<h3>Memory Usage</h3>
<ul>
  <li><strong>Used:</strong> ${payload.memory.used}MB</li>
  <li><strong>Total:</strong> ${payload.memory.total}MB</li>
  <li><strong>Usage:</strong> ${payload.memory.percentage}%</li>
</ul>

<h3>System Information</h3>
<ul>
  <li><strong>Uptime:</strong> ${payload.uptime} seconds</li>
  <li><strong>Platform:</strong> ${payload.platform}</li>
  <li><strong>Architecture:</strong> ${payload.arch}</li>
</ul>

<h3>Environment Configuration</h3>
<ul>
  <li><strong>Database:</strong> ${payload.config?.hasDatabase ? 'Connected✅' : 'Disconnected❌'}</li>
  <li><strong>Auth:</strong> ${payload.config?.hasAuth ? 'Enabled✅' : 'Disabled❌'}</li>
  <li><strong>Stripe:</strong> ${payload.config?.hasStripe ? 'Connected✅' : 'Disconnected❌'}</li>
  <li><strong>Redis:</strong> ${payload.config?.hasRedis ? `Connected✅ (${payload.config.redisMode})` : 'Disconnected❌'}</li>
  <li><strong>QStash:</strong> ${payload.config?.hasQStash ? 'Connected✅' : 'Disconnected❌'}</li>
  <li><strong>Email:</strong> ${payload.config?.hasEmail ? 'Configured✅' : 'Not Configured❌'}</li>
  <li><strong>Novu:</strong> ${payload.config?.hasNovu ? 'Connected✅' : 'Disconnected❌'}</li>
</ul>

<p><a href="${payload.config?.baseUrl}/admin/monitoring">View Monitoring Dashboard</a></p>`,
    }));
  },
  {
    payloadSchema: z.object({
      status: z.enum(['healthy', 'unhealthy']),
      error: z.string().optional(),
      timestamp: z.string(),
      environment: z.string(),
      version: z.string(),
      nodeVersion: z.string(),
      memory: z.object({
        used: z.number(),
        total: z.number(),
        percentage: z.number(),
      }),
      uptime: z.number(),
      platform: z.string().optional(),
      arch: z.string().optional(),
      config: z
        .object({
          hasDatabase: z.boolean(),
          hasAuth: z.boolean(),
          hasStripe: z.boolean(),
          hasRedis: z.boolean(),
          redisMode: z.string(),
          hasQStash: z.boolean(),
          hasEmail: z.boolean(),
          hasNovu: z.boolean(),
          baseUrl: z.string(),
        })
        .optional(),
    }),
  },
);

// Export all workflows
export const workflows = [
  welcomeWorkflow,
  accountVerificationWorkflow,
  paymentSuccessWorkflow,
  paymentFailedWorkflow,
  securityAlertWorkflow,
  stripeAccountUpdateWorkflow,
  stripePayoutWorkflow,
  // Marketplace workflows
  marketplacePaymentReceivedWorkflow,
  marketplacePayoutProcessedWorkflow,
  marketplaceConnectAccountStatusWorkflow,
  // Clerk workflows
  userCreatedWorkflow,
  recentLoginWorkflow,
  expertOnboardingCompleteWorkflow,
  appointmentReminderWorkflow,
  appointmentCancelledWorkflow,
  // Expert Business Workflows
  expertPayoutSetupReminderWorkflow,
  expertProfileActionRequiredWorkflow,
  newBookingExpertWorkflow,
  healthCheckFailureWorkflow,
];
