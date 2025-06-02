import { Workflow, workflow } from '@novu/framework';
import { z } from 'zod';

/**
 * Multilingual Novu Workflows for Eleva Care
 * Generated with next-intl translations
 *
 * Supported languages: en, pt, es, br
 */

/**
 * EN - Welcome Workflow - Onboards new users to Eleva Care
 */
export const welcomeWorkflowEN = workflow(
  'user-welcome-en',
  async ({ step, payload }) => {
    // In-app notification
    await step.inApp('welcome-message', async () => ({
      subject: 'Welcome to Eleva Care, {userName}!',
      body: `Hi {userName}! Welcome to Eleva Care. We're excited to help you on your healthcare journey.`,
      avatar: 'https://eleva.care/logo.png',
      primaryAction: {
        label: 'Complete Your Profile',
        redirect: {
          url: payload.profileUrl,
          target: '_self',
        },
      },
    }));

    // Welcome email
    await step.email('welcome-email', async () => ({
      subject: 'Welcome to Eleva Care!',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
            <h1>Welcome to Eleva Care!</h1>
          </div>
          <div style="padding: 20px;">
          <p>Hi {firstName},{{payload.firstName}}</p>
            <p>Thank you for joining our healthcare platform. We're excited to help you on your wellness journey.</p>
            <h3>Next Steps:</h3>
            <ul>
            <li>Complete your profile</li><li>Browse available experts</li><li>Book your first consultation</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.profileUrl}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Complete Your Profile
            </a>
            </div>
            <p>Best regards,<br>The Eleva Care Team</p>
          </div>
        </div>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      firstName: z.string(),
      profileUrl: z.string().url().default('/profile'),
    }),
    name: 'Welcome Workflow (EN)',
    description: 'Welcome new users to Eleva Care platform',
    tags: ['user-onboarding', 'welcome', 'en'],
    preferences: {
      all: { enabled: true, readOnly: false },
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * EN - Payment Success Workflow - Confirms successful payments
 */
export const paymentSuccessWorkflowEN = workflow(
  'payment-success-en',
  async ({ step, payload }) => {
    // In-app confirmation
    await step.inApp('payment-confirmation', async () => ({
      subject: 'Payment successful!',
      body: `Your payment of {amount} for {planName} has been processed successfully.`,
    }));

    // Email receipt
    await step.email('payment-receipt', async () => ({
      subject: `Payment Confirmation - ${payload.amount}`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
            <h1>Payment Confirmation</h1>
          </div>
          <div style="padding: 20px;">
            <p>Your payment has been successfully processed.</p>
            <div style="background-color: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h3>Payment Details:</h3>
              <p><strong>Amount:</strong> {{payload.amount}}</p>
              <p><strong>Plan:</strong> {{payload.planName}}</p>
              <p><strong>Date:</strong> {{payload.paymentDate}}</p>
              <p><strong>Transaction ID:</strong> {{payload.transactionId}}</p>
            </div>
            <p>Thank you for your payment!</p>
          </div>
        </div>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      planName: z.string(),
      paymentDate: z.string(),
      transactionId: z.string(),
    }),
    name: 'Payment Success Workflow (EN)',
    description: 'Confirm successful payments to users',
    tags: ['payments', 'confirmation', 'en'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * EN - Payment Failed Workflow - Alerts users of failed payments
 */
export const paymentFailedWorkflowEN = workflow(
  'payment-failed-en',
  async ({ step, payload }) => {
    // In-app alert
    await step.inApp('payment-failure', async () => ({
      subject: 'Payment failed',
      body: `We couldn't process your payment of {amount}. Please check your payment method and try again.`,
      primaryAction: {
        label: 'Update Payment Method',
        redirect: {
          url: payload.billingUrl,
          target: '_self',
        },
      },
    }));

    // Email alert
    await step.email('payment-failure-email', async () => ({
      subject: 'Payment Failed - Action Required',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
            <h1>Payment Failed</h1>
          </div>
          <div style="padding: 20px;">
            <p>We were unable to process your payment of ${payload.amount}.</p>
            <p><strong>Reason:</strong> ${payload.reason}</p>
            <p>Please update your payment method and try again.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${payload.billingUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Update Payment Method</a>
            </div>
          </div>
        </div>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      reason: z.string(),
      billingUrl: z.string().url().default('/billing'),
    }),
    name: 'Payment Failed Workflow (EN)',
    description: 'Alert users of failed payments',
    tags: ['payments', 'alerts', 'en'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * EN - Appointment Reminder Workflow - 24-hour appointment reminders
 */
export const appointmentReminderWorkflowEN = workflow(
  'appointment-reminder-24hr-en',
  async ({ step, payload }) => {
    // In-app reminder
    await step.inApp('appointment-reminder-notification', async () => ({
      subject: 'Reminder: Your appointment is {timeUntilAppointment}',
      body: `Your {appointmentType} with {expertName} is {timeUntilAppointment} on {appointmentDate} at {appointmentTime}.`,
      primaryAction: {
        label: 'Join your meeting',
        redirect: {
          url: payload.meetingLink,
          target: '_blank',
        },
      },
    }));

    // Email reminder
    await step.email('appointment-reminder-email', async () => ({
      subject: `Reminder: Your Eleva Care Appointment is {timeUntilAppointment}`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
            <h1>Appointment Reminder</h1>
          </div>
          <div style="padding: 20px;">
          <p>Hi {userName},{{payload.userName}}</p>
          <p>This is a friendly reminder that your {appointmentType} with {expertName} is {timeUntilAppointment}, on {appointmentDate} at {appointmentTime}.</p>
            <div style="background-color: #e8f5f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h3>Appointment Details:</h3>
              <p><strong>Expert:</strong> {{payload.expertName}}</p>
              <p><strong>Date:</strong> {{payload.appointmentDate}}</p>
              <p><strong>Time:</strong> {{payload.appointmentTime}}</p>
              <p><strong>Type:</strong> {{payload.appointmentType}}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.meetingLink}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Join your meeting
            </a>
            </div>
            <p><small>Please ensure you are in a quiet place with a stable internet connection.</small></p>
          </div>
        </div>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
      expertName: z.string(),
      appointmentType: z.string(),
      timeUntilAppointment: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      meetingLink: z.string().url(),
    }),
    name: 'Appointment Reminder Workflow (EN)',
    description: '24-hour appointment reminders',
    tags: ['appointments', 'reminders', 'en'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * EN - Expert Onboarding Complete Workflow - Welcome experts when approved
 */
export const expertOnboardingCompleteWorkflowEN = workflow(
  'expert-onboarding-complete-en',
  async ({ step, payload }) => {
    // In-app notification
    await step.inApp('onboarding-complete', async () => ({
      subject: 'Expert setup complete!',
      body: `Congratulations {expertName}! Your expert profile is now live. You can start receiving bookings from clients.`,
      primaryAction: {
        label: 'Go to Dashboard',
        redirect: {
          url: payload.dashboardUrl,
          target: '_self',
        },
      },
    }));

    // Welcome email
    await step.email('expert-welcome-email', async () => ({
      subject: 'Welcome to the Eleva Care Expert Network!',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #006D77; color: white; padding: 20px; text-align: center;">
          <h1>Congratulations, {expertName}!</h1>
          </div>
          <div style="padding: 20px;">
            <p>Your expert profile is now active on Eleva Care.</p>
          <p><strong>Specialization: {specialization}</strong></p>
            <h3>You can now:</h3>
            <ul>
            <li>Receive client bookings</li><li>Manage your availability</li><li>Track your earnings</li><li>Build your client base</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.dashboardUrl}}" style="background-color: #006D77; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Go to Dashboard
            </a>
            </div>
          </div>
        </div>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      expertName: z.string(),
      specialization: z.string(),
      dashboardUrl: z.string().url().default('/dashboard'),
    }),
    name: 'Expert Onboarding Complete Workflow (EN)',
    description: 'Welcome experts when their profile is approved',
    tags: ['experts', 'onboarding', 'en'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

/**
 * EN - Health Check Failure Workflow - Alert administrators of system health issues
 */
export const healthCheckFailureWorkflowEN = workflow(
  'health-check-failure-en',
  async ({ step, payload }) => {
    // In-app alert for admins
    await step.inApp('health-check-alert', async () => ({
      subject: '⚠️ Health Check Failure',
      body: `⚠️ Health Check Failure: ${payload.environment} - ${payload.status}. Error: ${payload.error}`,
    }));

    // Email alert for admins
    await step.email('health-check-alert-email', async () => ({
      subject: `⚠️ Eleva Care Health Check Failure - ${payload.environment}`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
            <h1>⚠️ Health Check Failure Alert</h1>
          </div>
          <div style="padding: 20px;">
            <p>A health check failure has been detected in the Eleva Care application.</p>
            <h3>System Details</h3>
            <ul>
              <li><strong>Status:</strong> {{payload.status}}</li>
              <li><strong>Error:</strong> {{payload.error}}</li>
              <li><strong>Environment:</strong> {{payload.environment}}</li>
              <li><strong>Timestamp:</strong> {{payload.timestamp}}</li>
              <li><strong>Version:</strong> {{payload.version}}</li>
            </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{payload.monitoringUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Monitoring Dashboard</a>
          </div>
        </div>
      </div>
    `,
    }));
  },
  {
    payloadSchema: z.object({
      status: z.string(),
      error: z.string(),
      environment: z.string(),
      timestamp: z.string(),
      version: z.string(),
      memory: z.object({
        used: z.number(),
        total: z.number(),
        percentage: z.number(),
      }),
      monitoringUrl: z.string().url().default('/admin/monitoring'),
    }),
    name: 'Health Check Failure Workflow (EN)',
    description: 'Alert administrators of system health issues',
    tags: ['system', 'alerts', 'monitoring', 'en'],
    preferences: {
      all: { enabled: true, readOnly: true }, // Critical workflow
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
      },
    },
  },
);

// Define supported locales
export type SupportedLocale = 'en' | 'pt' | 'es' | 'br';

// Define all possible workflow payloads
export type WorkflowPayloads = {
  welcome: {
    userName: string;
    firstName: string;
    profileUrl?: string;
  };
  paymentSuccess: {
    amount: string;
    planName: string;
    paymentDate: string;
    transactionId: string;
  };
  paymentFailed: {
    amount: string;
    reason: string;
    billingUrl?: string;
  };
  appointmentReminder: {
    userName: string;
    expertName: string;
    appointmentType: string;
    timeUntilAppointment: string;
    appointmentDate: string;
    appointmentTime: string;
    meetingLink: string;
  };
  expertOnboarding: {
    expertName: string;
    specialization: string;
    dashboardUrl?: string;
  };
  healthCheck: {
    status: string;
    error: string;
    environment: string;
    timestamp: string;
    version: string;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    monitoringUrl?: string;
  };
};

// Type for any workflow payload
export type AnyWorkflowPayload = WorkflowPayloads[keyof WorkflowPayloads];

// Type for Novu workflow with any payload
export type NovuWorkflow = Workflow<AnyWorkflowPayload>;

// Export all workflows grouped by locale
export const workflowsByLocale: Record<SupportedLocale, Array<Workflow<AnyWorkflowPayload>>> = {
  en: [
    welcomeWorkflowEN as Workflow<AnyWorkflowPayload>,
    paymentSuccessWorkflowEN as Workflow<AnyWorkflowPayload>,
    paymentFailedWorkflowEN as Workflow<AnyWorkflowPayload>,
    appointmentReminderWorkflowEN as Workflow<AnyWorkflowPayload>,
    expertOnboardingCompleteWorkflowEN as Workflow<AnyWorkflowPayload>,
    healthCheckFailureWorkflowEN as Workflow<AnyWorkflowPayload>,
  ],
  pt: [], // PT workflows will be added later
  es: [], // ES workflows will be added later
  br: [], // BR workflows will be added later
};

// Export all workflows in a single array for easy import
export const workflows: NovuWorkflow[] = [
  welcomeWorkflowEN as Workflow<AnyWorkflowPayload>,
  paymentSuccessWorkflowEN as Workflow<AnyWorkflowPayload>,
  paymentFailedWorkflowEN as Workflow<AnyWorkflowPayload>,
  appointmentReminderWorkflowEN as Workflow<AnyWorkflowPayload>,
  expertOnboardingCompleteWorkflowEN as Workflow<AnyWorkflowPayload>,
  healthCheckFailureWorkflowEN as Workflow<AnyWorkflowPayload>,
];

// Helper function to get workflows for a specific locale
export function getWorkflowsForLocale(locale: string): NovuWorkflow[] {
  return workflowsByLocale[locale as SupportedLocale] || workflowsByLocale['en'] || [];
}

// Helper function to get workflow ID with locale suffix
export function getLocalizedWorkflowId(baseId: string, locale: SupportedLocale = 'en'): string {
  return `${baseId}-${locale}`;
}
