import { ExpertPayoutNotificationTemplate } from '@/emails/payments';
import { elevaEmailService } from '@/lib/novu-email-service';
import { workflow } from '@novu/framework';
import { render } from '@react-email/render';
import React from 'react';
import { z } from 'zod';

// SIMPLIFIED PRODUCTION-READY WORKFLOWS
// These workflows are designed to be simple and compatible with Novu Bridge

// 1. User Lifecycle Workflow
export const userLifecycleWorkflow = workflow(
  'user-lifecycle',
  async ({ payload, step }) => {
    await step.inApp('welcome-notification', async () => ({
      subject: `Welcome to Eleva Care! 🎉`,
      body: `Welcome ${payload.userName}! We're excited to have you join our healthcare community.`,
      data: {
        userName: payload.userName,
        firstName: payload.firstName,
        email: payload.email,
      },
    }));

    await step.email('welcome-email', async () => ({
      subject: `Welcome to Eleva Care - Your Healthcare Journey Starts Here! 🎉`,
      body: `
<h2>Welcome to Eleva Care! 🎉</h2>
<p>Hi ${payload.firstName || payload.userName},</p>
<p>Thank you for joining Eleva Care! We're thrilled to have you as part of our healthcare community.</p>
<h3>What's Next?</h3>
<ul>
  <li><strong>Explore Experts:</strong> Browse our network of qualified healthcare professionals</li>
  <li><strong>Book Consultation:</strong> Schedule your first appointment with an expert</li>
  <li><strong>Complete Profile:</strong> Add your health preferences and information</li>
</ul>
<p><a href="/dashboard" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Get Started</a></p>
<p>Welcome aboard!</p>
      `,
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
    tags: ['auth', 'user'],
    preferences: {
      all: { enabled: true },
      channels: {
        email: { enabled: true },
        inApp: { enabled: true },
      },
    },
  },
);

// 2. Security & Authentication Workflow
export const securityAuthWorkflow = workflow(
  'security-auth',
  async ({ payload, step }) => {
    await step.inApp('security-alert', async () => ({
      subject: `🔒 Security Alert`,
      body: `Security alert for your account: ${payload.message || 'Unusual activity detected'}`,
      data: {
        alertType: payload.alertType,
        deviceInfo: payload.deviceInfo,
        userId: payload.userId,
      },
    }));

    await step.email('security-email', async () => ({
      subject: `🔒 Security Alert - Eleva Care`,
      body: `
<h2>Security Alert</h2>
<p>Hi there,</p>
<p>We detected unusual activity on your account.</p>
<p>${payload.message || 'Please review your recent activity.'}</p>
<p>If this wasn't you, please contact support immediately.</p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      userId: z.string(),
      alertType: z.string().optional(),
      verificationUrl: z.string().optional(),
      deviceInfo: z.string().optional(),
      message: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
    tags: ['security'],
    preferences: {
      all: { enabled: true },
      channels: {
        email: { enabled: true },
        inApp: { enabled: true },
      },
    },
  },
);

// 3. Payment Universal Workflow
export const paymentWorkflow = workflow(
  'payment-universal',
  async ({ payload, step }) => {
    await step.inApp('payment-notification', async () => ({
      subject: `${payload.type === 'success' ? '✅' : payload.type === 'failed' ? '❌' : '💰'} Payment Update`,
      body: `${payload.message || 'Payment status update for your transaction'}`,
      data: {
        type: payload.type,
        amount: payload.amount,
        currency: payload.currency,
        serviceName: payload.serviceName,
        paymentId: payload.paymentId,
      },
    }));

    await step.email('payment-email', async () => ({
      subject: `Payment Update - ${payload.serviceName || 'Your Service'}`,
      body: `
<h2>Payment Update</h2>
<p>Hi ${payload.customerName || 'Valued Customer'},</p>
<p>${payload.message || 'Your payment has been processed.'}</p>
<h3>Payment Details:</h3>
<ul>
  <li><strong>Amount:</strong> ${payload.amount} ${payload.currency}</li>
  <li><strong>Service:</strong> ${payload.serviceName}</li>
  <li><strong>Status:</strong> ${payload.type}</li>
  <li><strong>Date:</strong> ${new Date().toLocaleDateString()}</li>
</ul>
<p>Thank you for choosing Eleva Care!</p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      type: z.enum(['success', 'failed', 'refund', 'payout']),
      customerName: z.string().optional(),
      serviceName: z.string().optional(),
      amount: z.string().optional(),
      currency: z.string().optional(),
      paymentId: z.string().optional(),
      message: z.string().optional(),
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

// 4. Expert Management Workflow
export const expertManagementWorkflow = workflow(
  'expert-management',
  async ({ payload, step }) => {
    await step.inApp('expert-notification', async () => ({
      subject: `Expert Update: ${payload.eventType}`,
      body: `${payload.message || `Update for expert ${payload.expertName}`}`,
      data: {
        eventType: payload.eventType,
        expertId: payload.expertId,
        expertName: payload.expertName,
        status: payload.status,
      },
    }));

    await step.email('expert-email', async () => ({
      subject: `Expert Account Update`,
      body: `
<h2>Expert Account Update</h2>
<p>Hi ${payload.expertName},</p>
<p>${payload.message || 'Your expert account has been updated.'}</p>
<p>Thank you for being part of Eleva Care!</p>
      `,
    }));
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
    preferences: {
      all: { enabled: true },
      channels: {
        email: { enabled: true },
        inApp: { enabled: true },
      },
    },
  },
);

// 5. Appointment Universal Workflow
export const appointmentWorkflow = workflow(
  'appointment-universal',
  async ({ payload, step }) => {
    await step.inApp('appointment-notification', async () => ({
      subject: `📅 Appointment ${payload.eventType}: ${payload.serviceName || 'Your Appointment'}`,
      body: `${payload.message || `Appointment update with ${payload.expertName}`}`,
      data: {
        eventType: payload.eventType,
        expertName: payload.expertName,
        customerName: payload.customerName,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        serviceName: payload.serviceName,
      },
    }));

    await step.email('appointment-email', async () => ({
      subject: `Appointment ${payload.eventType} - ${payload.serviceName || 'Your Service'}`,
      body: `
<h2>Appointment ${payload.eventType}</h2>
<p>Hi ${payload.customerName || 'there'},</p>
<p>${payload.message || 'Your appointment has been updated.'}</p>
<h3>Appointment Details:</h3>
<ul>
  <li><strong>Expert:</strong> ${payload.expertName}</li>
  <li><strong>Service:</strong> ${payload.serviceName}</li>
  <li><strong>Date:</strong> ${payload.appointmentDate}</li>
  <li><strong>Time:</strong> ${payload.appointmentTime}</li>
</ul>
<p>Thank you for choosing Eleva Care!</p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      eventType: z.enum(['reminder', 'cancelled', 'confirmed', 'rescheduled', 'completed']),
      expertName: z.string(),
      customerName: z.string().optional(),
      serviceName: z.string().optional(),
      appointmentDate: z.string(),
      appointmentTime: z.string().optional(),
      timezone: z.string().optional(),
      duration: z.number().optional(),
      message: z.string().optional(),
      meetLink: z.string().optional(),
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

// 6. Marketplace Universal Workflow
export const marketplaceWorkflow = workflow(
  'marketplace-universal',
  async ({ payload, step }) => {
    await step.inApp('marketplace-notification', async () => ({
      subject: `💰 Marketplace Update`,
      body: `${payload.message || 'Marketplace update for your account'}`,
      data: {
        eventType: payload.eventType,
        amount: payload.amount,
        expertName: payload.expertName,
        accountStatus: payload.accountStatus,
      },
    }));

    await step.email('marketplace-email', async () => ({
      subject: `💰 Marketplace Update - Eleva Care`,
      body: `
<h2>Marketplace Update</h2>
<p>Hi ${payload.expertName || 'there'},</p>
<p>${payload.message || 'Your marketplace account has been updated.'}</p>
<p>Thank you for being part of our marketplace!</p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      eventType: z.enum(['payment-received', 'payout-processed', 'connect-account-status']),
      amount: z.string().optional(),
      expertName: z.string().optional(),
      accountStatus: z.string().optional(),
      message: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
    }),
    tags: ['marketplace'],
    preferences: {
      all: { enabled: true },
      channels: {
        email: { enabled: true },
        inApp: { enabled: true },
      },
    },
  },
);

// 7. System Health Workflow
export const systemHealthWorkflow = workflow(
  'system-health',
  async ({ payload, step }) => {
    await step.inApp('health-alert', async () => ({
      subject: `⚠️ System Alert - ${payload.environment}`,
      body: `System status: ${payload.status}. ${payload.error || 'Please investigate.'}`,
      data: {
        status: payload.status,
        environment: payload.environment,
        error: payload.error,
        timestamp: payload.timestamp,
      },
    }));

    await step.email('health-email', async () => ({
      subject: `⚠️ System Health Alert - ${payload.environment}`,
      body: `
<h2>System Health Alert</h2>
<p>Status: ${payload.status}</p>
<p>Environment: ${payload.environment}</p>
<p>Error: ${payload.error || 'Unknown error'}</p>
<p>Timestamp: ${payload.timestamp}</p>
<p>Please investigate immediately.</p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      eventType: z.enum(['health-check-failure']).optional(),
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
    preferences: {
      all: { enabled: true },
      channels: {
        email: { enabled: true },
        inApp: { enabled: true },
      },
    },
  },
);

// EXISTING EMAIL TEMPLATE WORKFLOWS (Keep these working as they are)
export const appointmentConfirmationWorkflow = workflow(
  'appointment-confirmation',
  async ({ payload, step }) => {
    await step.inApp('appointment-confirmed', async () => ({
      subject: `✅ Appointment confirmed with ${payload.expertName}`,
      body: `Your appointment for ${payload.eventTitle} is confirmed for ${payload.appointmentDate} at ${payload.appointmentTime}.`,
      data: {
        expertName: payload.expertName,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        meetLink: payload.meetLink,
        timezone: payload.timezone,
      },
    }));

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
        locale: payload.locale || 'en',
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
    await step.inApp('booking-payment-pending', async () => ({
      subject: `💳 Payment required for your booking with ${payload.expertName}`,
      body: `Complete your payment using Multibanco to confirm your appointment. Reference: ${payload.multibancoReference}`,
      data: {
        expertName: payload.expertName,
        multibancoReference: payload.multibancoReference,
        multibancoAmount: payload.multibancoAmount,
        voucherExpiresAt: payload.voucherExpiresAt,
        hostedVoucherUrl: payload.hostedVoucherUrl,
      },
    }));

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
        locale: payload.locale || 'en',
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
    const isUrgent = payload.reminderType === 'urgent';

    await step.inApp('payment-reminder', async () => ({
      subject: isUrgent
        ? `⚠️ URGENT: Payment expires in ${payload.daysRemaining} days`
        : `💡 Payment reminder for your booking`,
      body: isUrgent
        ? `Your Multibanco payment will expire soon! Complete payment to secure your appointment with ${payload.expertName}.`
        : `Don't forget to complete your payment for the appointment with ${payload.expertName}.`,
      data: {
        reminderType: payload.reminderType,
        daysRemaining: payload.daysRemaining,
        expertName: payload.expertName,
        multibancoAmount: payload.multibancoAmount,
        multibancoReference: payload.multibancoReference,
        hostedVoucherUrl: payload.hostedVoucherUrl,
      },
    }));

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
        locale: payload.locale || 'en',
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

// Expert Payout Notification Workflow
export const expertPayoutNotificationWorkflow = workflow(
  'expert-payout-notification',
  async ({ payload, step }) => {
    await step.inApp('payout-sent', async () => ({
      subject: `💰 Payout Sent: ${payload.currency} ${payload.payoutAmount}`,
      body: `Your earnings of ${payload.currency} ${payload.payoutAmount} from your appointment with ${payload.clientName || 'a client'} have been sent to your bank account.`,
      data: {
        payoutId: payload.payoutId,
        payoutAmount: payload.payoutAmount,
        currency: payload.currency,
        expertName: payload.expertName,
        clientName: payload.clientName,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        serviceName: payload.serviceName,
        bankLastFour: payload.bankLastFour,
      },
    }));

    await step.email('payout-email', async () => {
      const templateData = {
        expertName: payload.expertName || 'Expert',
        payoutAmount: payload.payoutAmount || '0.00',
        currency: payload.currency || 'EUR',
        appointmentDate: payload.appointmentDate || 'Recent appointment',
        appointmentTime: payload.appointmentTime || 'N/A',
        clientName: payload.clientName || 'Client',
        serviceName: payload.serviceName || 'Professional consultation',
        payoutId: payload.payoutId || 'N/A',
        expectedArrivalDate: payload.expectedArrivalDate || 'Soon',
        bankLastFour: payload.bankLastFour || '••••',
        dashboardUrl: payload.dashboardUrl || '#',
        supportUrl: payload.supportUrl || '#',
        _locale: payload.locale || 'en',
      };

      const html = await render(
        React.createElement(ExpertPayoutNotificationTemplate, templateData),
      );

      return {
        subject: `💰 Payout sent: ${payload.currency} ${payload.payoutAmount} for your appointment`,
        body: html,
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
  systemHealthWorkflow,
  appointmentConfirmationWorkflow,
  multibancoBookingPendingWorkflow,
  multibancoPaymentReminderWorkflow,
  expertPayoutNotificationWorkflow,
];

// Add to the existing workflow configuration
export const NOVU_WORKFLOWS = {
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
