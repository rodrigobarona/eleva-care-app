import { workflow } from '@novu/framework';
import { z } from 'zod';

// Define notification workflows
export const welcomeWorkflow = workflow(
  'user-welcome',
  async ({ payload, step }) => {
    await step.inApp('welcome-message', async () => ({
      subject: `Welcome to Eleva Care, ${payload.userName}!`,
      body: `Hi ${payload.userName}! Welcome to Eleva Care. We're excited to help you on your healthcare journey.`,
    }));
  },
  {
    payloadSchema: z.object({
      userName: z.string(),
    }),
  },
);

export const accountVerificationWorkflow = workflow(
  'account-verification',
  async ({ payload: _payload, step }) => {
    await step.inApp('verification-reminder', async () => ({
      subject: 'Please verify your account',
      body: 'To get the most out of Eleva Care, please verify your account.',
    }));
  },
  {
    payloadSchema: z.object({
      userId: z.string(),
      verificationUrl: z.string().optional(),
    }),
  },
);

export const paymentSuccessWorkflow = workflow(
  'payment-success',
  async ({ payload, step }) => {
    await step.inApp('payment-confirmation', async () => ({
      subject: 'Payment successful!',
      body: `Your payment of ${payload.amount} for ${payload.planName} has been processed successfully.`,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      planName: z.string(),
    }),
  },
);

export const paymentFailedWorkflow = workflow(
  'payment-failed',
  async ({ payload, step }) => {
    await step.inApp('payment-failure', async () => ({
      subject: 'Payment failed',
      body: `We couldn't process your payment of ${payload.amount}. Please check your payment method and try again.`,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      reason: z.string().optional(),
    }),
  },
);

export const securityAlertWorkflow = workflow(
  'security-alert',
  async ({ payload, step }) => {
    await step.inApp('security-notification', async () => ({
      subject: 'Security Alert',
      body: payload.message,
    }));
  },
  {
    payloadSchema: z.object({
      message: z.string(),
      alertType: z.string().optional(),
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
    await step.inApp('payment-received-notification', async () => ({
      subject: `Payment Received: €${payload.amount}`,
      body: `You've received a payment of €${payload.amount} from ${payload.clientName || 'a client'} for your session on ${payload.sessionDate}. Transfer will be processed according to your payout schedule.`,
    }));

    await step.email('payment-received-email', async () => ({
      subject: `Payment Received - €${payload.amount}`,
      body: `
        <h2>Payment Received!</h2>
        <p>Great news! You've received a payment for your services.</p>
        <h3>Payment Details:</h3>
        <ul>
          <li><strong>Amount:</strong> €${payload.amount}</li>
          <li><strong>Client:</strong> ${payload.clientName || 'Client'}</li>
          <li><strong>Session Date:</strong> ${payload.sessionDate}</li>
          <li><strong>Transaction ID:</strong> ${payload.transactionId}</li>
        </ul>
        <p>This payment will be transferred to your account according to your payout schedule.</p>
        <p><a href="${payload.dashboardUrl || '/account/billing'}">View Payment Details</a></p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      clientName: z.string().optional(),
      sessionDate: z.string(),
      transactionId: z.string(),
      dashboardUrl: z.string().optional(),
    }),
  },
);

export const marketplacePayoutProcessedWorkflow = workflow(
  'marketplace-payout-processed',
  async ({ payload, step }) => {
    await step.inApp('payout-processed-notification', async () => ({
      subject: `Payout Processed: €${payload.amount}`,
      body: `Your payout of €${payload.amount} has been processed and sent to your bank account. Expected arrival: ${payload.expectedArrival}.`,
    }));

    await step.email('payout-processed-email', async () => ({
      subject: `Payout Processed - €${payload.amount}`,
      body: `
        <h2>Payout Processed</h2>
        <p>Your earnings have been transferred to your bank account.</p>
        <h3>Payout Details:</h3>
        <ul>
          <li><strong>Amount:</strong> €${payload.amount}</li>
          <li><strong>Payout ID:</strong> ${payload.payoutId}</li>
          <li><strong>Expected Arrival:</strong> ${payload.expectedArrival}</li>
          <li><strong>Bank Account:</strong> ${payload.bankAccount}</li>
        </ul>
        <p><a href="${payload.dashboardUrl || '/account/billing'}">View Payout History</a></p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      amount: z.string(),
      payoutId: z.string(),
      expectedArrival: z.string(),
      bankAccount: z.string(),
      dashboardUrl: z.string().optional(),
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
    await step.inApp('login-notification', async () => ({
      subject: 'New login detected',
      body: `We detected a new login to your account from ${payload.location || 'a new device'} at ${payload.timestamp}.`,
    }));
  },
  {
    payloadSchema: z.object({
      location: z.string().optional(),
      timestamp: z.string(),
      ipAddress: z.string().optional(),
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
];
