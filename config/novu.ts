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

// Export all workflows
export const workflows = [
  welcomeWorkflow,
  accountVerificationWorkflow,
  paymentSuccessWorkflow,
  paymentFailedWorkflow,
  securityAlertWorkflow,
  stripeAccountUpdateWorkflow,
  stripePayoutWorkflow,
];
