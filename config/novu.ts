import { ExpertPayoutNotificationTemplate } from '@/emails/payments';
import { elevaEmailService } from '@/lib/integrations/novu/email-service';
import { workflow } from '@novu/framework';
import { render } from '@react-email/render';
import React from 'react';
import { z } from 'zod';

import {
  getAppointmentLinks,
  getPaymentLinks,
  getSecurityLinks,
  getUserLifecycleLinks,
} from './notification-links';

// SIMPLIFIED PRODUCTION-READY WORKFLOWS
// These workflows are designed to be simple and compatible with Novu Bridge

// 1. User Lifecycle Workflow
export const userLifecycleWorkflow = workflow(
  'user-lifecycle',
  async ({ payload, step }) => {
    await step.inApp('welcome-notification', async () => {
      const links = getUserLifecycleLinks(payload.userSegment);
      const displayName = payload.firstName || payload.userName || 'there';

      return {
        subject: `Welcome to Eleva Care! 🎉`,
        body: `Welcome ${displayName}! We're excited to have you join our healthcare community.`,
        ...links,
        data: {
          userName: payload.userName,
          firstName: payload.firstName,
          email: payload.email,
        },
      };
    });

    await step.email('welcome-email', async () => {
      const emailBody = await elevaEmailService.renderWelcomeEmail({
        userName: payload.userName || payload.firstName || 'User',
        firstName: payload.firstName || payload.userName || 'User',
        dashboardUrl: '/dashboard',
        locale: payload.locale || 'en',
        userSegment: payload.userSegment || 'patient',
        templateVariant: payload.templateVariant || 'default',
      });

      return {
        subject: `Welcome to Eleva Care - Your Healthcare Journey Starts Here! 🎉`,
        body: emailBody,
      };
    });
  },
  {
    name: 'Account & User Updates',
    description: 'Welcome messages and account-related notifications',
    payloadSchema: z.object({
      eventType: z.enum(['welcome', 'user-created']).optional(),
      userName: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      locale: z.string().optional().default('en'),
      userSegment: z.enum(['patient', 'expert', 'admin']).optional().default('patient'),
      templateVariant: z
        .enum(['default', 'urgent', 'reminder', 'minimal', 'branded'])
        .optional()
        .default('default'),
    }),
    tags: ['user-lifecycle'],
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
    await step.inApp('security-alert', async () => {
      const links = getSecurityLinks(payload.alertType || payload.eventType);

      return {
        subject: `🔒 Security Alert`,
        body: `Security alert for your account: ${payload.message || 'Unusual activity detected'}`,
        ...links,
        data: {
          alertType: payload.alertType || 'security-event',
          deviceInfo: payload.deviceInfo || 'Unknown device',
          userId: payload.userId || 'Unknown user',
          eventType: payload.eventType || 'security-alert',
          timestamp: new Date().toISOString(),
        },
      };
    });

    await step.email('security-email', async () => {
      // Import the security alert email template
      const { render } = await import('@react-email/render');
      const { SecurityAlertEmailTemplate } = await import('@/emails');

      // Render the email template with the payload data
      const emailHtml = await render(
        SecurityAlertEmailTemplate({
          userName: payload.userName,
          alertType: payload.alertType || 'Security Alert',
          message: payload.message || 'We detected unusual activity on your account.',
          deviceInfo: payload.deviceInfo || 'Unknown device',
          location: payload.location,
          timestamp: payload.timestamp || new Date().toLocaleString(),
          actionUrl: payload.actionUrl || 'https://eleva.care/account/security',
          locale: payload.locale || 'en',
        }),
      );

      return {
        subject: `🔒 Security Alert - ${payload.alertType || 'Eleva Care'}`,
        body: emailHtml,
      };
    });
  },
  {
    name: 'Security & Authentication',
    description: 'Security-related alerts and notifications',
    payloadSchema: z.object({
      eventType: z
        .enum([
          'security-alert',
          'account-verification',
          'recent-login',
          'session.created',
          'session.ended',
          'session.removed',
        ])
        .optional(),
      userId: z.string().optional(),
      userName: z.string().optional(),
      alertType: z.string().optional(),
      verificationUrl: z.string().optional(),
      deviceInfo: z.string().optional(),
      location: z.string().optional(),
      timestamp: z.string().optional(),
      actionUrl: z.string().optional(),
      message: z.string().optional(),
      locale: z.string().optional().default('en'),
      userSegment: z.enum(['patient', 'expert', 'admin']).optional().default('patient'),
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
    await step.inApp('payment-notification', async () => {
      const links = getPaymentLinks(payload.eventType || 'pending', payload.transactionId);

      return {
        subject: `💳 Payment ${payload.eventType}: ${payload.amount} ${payload.currency || 'EUR'}`,
        body: `${payload.message || `Payment ${payload.eventType} for ${payload.amount}`}`,
        ...links,
        data: {
          eventType: payload.eventType,
          amount: payload.amount,
          currency: payload.currency,
          transactionId: payload.transactionId,
          customerName: payload.customerName,
        },
      };
    });

    await step.email('payment-email', async () => {
      let emailBody: string;
      let subject: string;

      if (payload.eventType === 'success' || payload.eventType === 'confirmed') {
        // Use payment confirmation template
        emailBody = await elevaEmailService.renderPaymentConfirmation({
          customerName: payload.customerName,
          amount: payload.amount,
          currency: payload.currency || 'EUR',
          transactionId: payload.transactionId,
          appointmentDetails: payload.appointmentDetails
            ? {
                service: payload.appointmentDetails.service,
                expert: payload.appointmentDetails.expert,
                date: payload.appointmentDetails.date,
                time: payload.appointmentDetails.time,
                duration: payload.appointmentDetails.duration || '60 minutes',
              }
            : undefined,
          locale: payload.locale || 'en',
          userSegment: payload.userSegment || 'patient',
          templateVariant: payload.templateVariant || 'default',
        });
        const locale = (payload.locale || 'en').toLowerCase().split('-')[0];
        subject =
          locale === 'pt'
            ? `✅ Pagamento confirmado - ${payload.currency || 'EUR'} ${payload.amount}`
            : locale === 'es'
              ? `✅ Pago confirmado - ${payload.currency || 'EUR'} ${payload.amount}`
              : `✅ Payment Confirmed - ${payload.currency || 'EUR'} ${payload.amount}`;
      } else if (payload.eventType === 'multibanco-reminder') {
        // Use Multibanco payment reminder template
        emailBody = await elevaEmailService.renderMultibancoPaymentReminder({
          customerName: payload.customerName,
          entity: payload.multibancoEntity || '',
          reference: payload.multibancoReference || '',
          amount: payload.amount,
          expiresAt: payload.expiresAt || '',
          appointmentDetails: payload.appointmentDetails
            ? {
                service: payload.appointmentDetails.service,
                expert: payload.appointmentDetails.expert,
                date: payload.appointmentDetails.date,
                time: payload.appointmentDetails.time,
                duration: payload.appointmentDetails.duration || '60 minutes',
              }
            : undefined,
          reminderType: payload.reminderType || 'gentle',
          locale: payload.locale || 'en',
          userSegment: payload.userSegment || 'patient',
          templateVariant: payload.templateVariant || 'reminder',
        });
        subject = `Payment Reminder - ${payload.amount} ${payload.currency || 'EUR'}`;
      } else if (payload.eventType === 'refunded') {
        // Use refund notification template
        emailBody = await elevaEmailService.renderRefundNotification({
          customerName: payload.customerName,
          expertName: payload.refundDetails?.expertName || payload.appointmentDetails?.expert || '',
          serviceName: payload.refundDetails?.serviceName || payload.appointmentDetails?.service,
          appointmentDate:
            payload.refundDetails?.appointmentDate || payload.appointmentDetails?.date || '',
          appointmentTime:
            payload.refundDetails?.appointmentTime || payload.appointmentDetails?.time || '',
          originalAmount: payload.refundDetails?.originalAmount || payload.amount,
          refundAmount: payload.amount,
          currency: payload.currency || 'EUR',
          refundReason: payload.refundDetails?.refundReason || 'Appointment conflict',
          transactionId: payload.transactionId,
          locale: payload.locale || 'en',
        });
        const locale = (payload.locale || 'en').toLowerCase().split('-')[0];
        subject =
          locale === 'pt'
            ? `Conflito de Agendamento - Reembolso Total Processado`
            : locale === 'es'
              ? `Conflicto de Cita - Reembolso Total Procesado`
              : `Appointment Conflict - Full Refund Processed`;
      } else if (payload.eventType === 'failed') {
        // Use generic email for failed payments
        emailBody = await elevaEmailService.renderGenericEmail({
          templateName: 'payment-notification',
          subject: `Payment Failed`,
          templateData: {
            eventType: payload.eventType,
            amount: payload.amount,
            currency: payload.currency,
            customerName: payload.customerName,
            message:
              payload.message ||
              'Your payment could not be processed. Please try again or use a different payment method.',
          },
          locale: payload.locale || 'en',
          userSegment: payload.userSegment || 'patient',
          templateVariant: 'urgent',
        });
        const locale = (payload.locale || 'en').toLowerCase().split('-')[0];
        subject =
          locale === 'pt'
            ? `❌ Pagamento falhou - ${payload.currency || 'EUR'} ${payload.amount}`
            : locale === 'es'
              ? `❌ Pago fallido - ${payload.currency || 'EUR'} ${payload.amount}`
              : `❌ Payment Failed - ${payload.currency || 'EUR'} ${payload.amount}`;
      } else {
        // Use generic email renderer for other payment events
        emailBody = await elevaEmailService.renderGenericEmail({
          templateName: 'payment-notification',
          subject: `Payment ${payload.eventType}`,
          templateData: {
            eventType: payload.eventType,
            amount: payload.amount,
            currency: payload.currency,
            customerName: payload.customerName,
            message: payload.message,
          },
          locale: payload.locale || 'en',
          userSegment: payload.userSegment || 'patient',
          templateVariant: payload.templateVariant || 'default',
        });
        subject = `Payment ${payload.eventType} - ${payload.amount} ${payload.currency || 'EUR'}`;
      }

      return {
        subject,
        body: emailBody,
      };
    });
  },
  {
    name: 'Payment Processing',
    description: 'Payment confirmations, failures, and reminders',
    payloadSchema: z.object({
      eventType: z
        .enum([
          'success',
          'failed',
          'pending',
          'confirmed',
          'refunded',
          'cancelled',
          'disputed',
          'multibanco-reminder',
        ])
        .optional(),
      amount: z.string(),
      currency: z.string().optional().default('EUR'),
      transactionId: z.string().optional(),
      customerName: z.string(),
      message: z.string().optional(),
      // Multibanco specific fields
      multibancoEntity: z.string().optional(),
      multibancoReference: z.string().optional(),
      expiresAt: z.string().optional(),
      reminderType: z.enum(['gentle', 'urgent']).optional(),
      // Appointment details
      appointmentDetails: z
        .object({
          service: z.string(),
          expert: z.string(),
          date: z.string(),
          time: z.string(),
          duration: z.string().optional(),
        })
        .optional(),
      // Refund specific details
      refundDetails: z
        .object({
          expertName: z.string().optional(),
          serviceName: z.string().optional(),
          appointmentDate: z.string().optional(),
          appointmentTime: z.string().optional(),
          originalAmount: z.string().optional(),
          refundReason: z.string().optional(),
        })
        .optional(),
      locale: z.string().optional().default('en'),
      userSegment: z.enum(['patient', 'expert', 'admin']).optional().default('patient'),
      templateVariant: z
        .enum(['default', 'urgent', 'reminder', 'minimal', 'branded'])
        .optional()
        .default('default'),
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
      subject: `👩‍⚕️ ${payload.notificationType}: ${payload.expertName}`,
      body: `${payload.message || `Expert notification for ${payload.expertName}`}`,
      data: {
        notificationType: payload.notificationType,
        expertName: payload.expertName,
        amount: payload.amount,
        payoutDate: payload.payoutDate,
      },
    }));

    await step.email('expert-email', async () => {
      let emailBody: string;

      if (
        payload.notificationType === 'payout-processed' ||
        payload.notificationType === 'payout-notification'
      ) {
        // Use expert payout notification template
        emailBody = await elevaEmailService.renderExpertPayoutNotification({
          expertName: payload.expertName,
          amount: payload.amount || '0',
          currency: payload.currency || 'EUR',
          payoutDate: payload.payoutDate || new Date().toISOString(),
          payoutMethod: payload.payoutMethod || 'Bank Transfer',
          transactionId: payload.transactionId,
          locale: payload.locale || 'en',
          userSegment: 'expert',
          templateVariant: payload.templateVariant || 'default',
        });
      } else {
        // Use general expert notification template
        emailBody = await elevaEmailService.renderExpertNotification({
          expertName: payload.expertName,
          notificationType: payload.notificationType,
          message: payload.message || `Expert notification: ${payload.notificationType}`,
          actionUrl: payload.actionUrl,
          actionText: payload.actionText,
          locale: payload.locale || 'en',
          userSegment: 'expert',
          templateVariant: payload.templateVariant || 'default',
        });
      }

      return {
        subject: `Expert ${payload.notificationType} - ${payload.expertName}`,
        body: emailBody,
      };
    });
  },
  {
    name: 'Expert Management',
    description: 'Expert-related notifications including payouts and account updates',
    payloadSchema: z.object({
      notificationType: z.enum([
        'payout-processed',
        'payout-notification',
        'account-update',
        'verification-required',
      ]),
      expertName: z.string(),
      message: z.string().optional(),
      amount: z.string().optional(),
      currency: z.string().optional().default('EUR'),
      payoutDate: z.string().optional(),
      payoutMethod: z.string().optional(),
      transactionId: z.string().optional(),
      actionUrl: z.string().optional(),
      actionText: z.string().optional(),
      locale: z.string().optional().default('en'),
      templateVariant: z
        .enum(['default', 'urgent', 'reminder', 'minimal', 'branded'])
        .optional()
        .default('default'),
    }),
    tags: ['expert-management'],
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
    await step.inApp('appointment-notification', async () => {
      const links = getAppointmentLinks(
        payload.eventType || 'update',
        payload.meetingUrl,
        payload.appointmentId,
      );

      return {
        subject: `📅 Appointment ${payload.eventType}: ${payload.serviceName || 'Your Appointment'}`,
        body: `${payload.message || `Appointment update with ${payload.expertName}`}`,
        ...links,
        data: {
          eventType: payload.eventType,
          expertName: payload.expertName,
          customerName: payload.customerName,
          appointmentDate: payload.appointmentDate,
          appointmentTime: payload.appointmentTime,
          serviceName: payload.serviceName,
          appointmentId: payload.appointmentId,
        },
      };
    });

    await step.email('appointment-email', async () => {
      let emailBody: string;
      let subject: string;
      const isExpert = payload.userSegment === 'expert';

      if (payload.eventType === 'reminder') {
        // Use appointment reminder template
        emailBody = await elevaEmailService.renderAppointmentReminder({
          userName: isExpert ? payload.expertName : payload.customerName,
          expertName: payload.expertName,
          appointmentType: payload.serviceName || 'Consultation',
          appointmentDate: payload.appointmentDate,
          appointmentTime: payload.appointmentTime,
          meetingUrl: payload.meetingUrl,
          timeUntilAppointment: payload.timeUntilAppointment,
          locale: payload.locale || 'en',
          userSegment: payload.userSegment || 'patient',
          templateVariant: payload.templateVariant || 'reminder',
        });
        subject = isExpert
          ? `Reminder: Appointment with ${payload.customerName}`
          : `Reminder: Your appointment with ${payload.expertName}`;
      } else if (payload.eventType === 'confirmed') {
        if (isExpert) {
          // Use expert-specific appointment confirmation template
          emailBody = await elevaEmailService.renderExpertNewAppointment({
            expertName: payload.expertName,
            clientName: payload.customerName,
            appointmentDate: payload.appointmentDate,
            appointmentTime: payload.appointmentTime,
            timezone: payload.timezone || 'UTC',
            appointmentDuration: payload.appointmentDuration || '60 minutes',
            eventTitle: payload.serviceName || 'Consultation',
            meetLink: payload.meetingUrl,
            notes: payload.notes,
            locale: (payload.locale as 'en' | 'pt' | 'es') || 'en',
          });
          subject = `New appointment: ${payload.customerName} - ${payload.serviceName || 'Consultation'}`;
        } else {
          // Use patient appointment confirmation template
          emailBody = await elevaEmailService.renderAppointmentConfirmation({
            expertName: payload.expertName,
            clientName: payload.customerName,
            appointmentDate: payload.appointmentDate,
            appointmentTime: payload.appointmentTime,
            timezone: payload.timezone || 'UTC',
            appointmentDuration: payload.appointmentDuration || '60 minutes',
            eventTitle: payload.serviceName || 'Consultation',
            meetLink: payload.meetingUrl,
            notes: payload.notes,
            locale: payload.locale || 'en',
            userSegment: payload.userSegment || 'patient',
            templateVariant: payload.templateVariant || 'default',
          });
          subject = `Your appointment with ${payload.expertName} is confirmed`;
        }
      } else {
        // Use generic email renderer for other appointment events
        emailBody = await elevaEmailService.renderGenericEmail({
          templateName: 'appointment-notification',
          subject: `Appointment ${payload.eventType}`,
          templateData: {
            eventType: payload.eventType,
            expertName: payload.expertName,
            customerName: payload.customerName,
            serviceName: payload.serviceName,
            appointmentDate: payload.appointmentDate,
            appointmentTime: payload.appointmentTime,
            message: payload.message,
          },
          locale: payload.locale || 'en',
          userSegment: payload.userSegment || 'patient',
          templateVariant: payload.templateVariant || 'default',
        });
        subject = `Appointment ${payload.eventType} - ${payload.serviceName || 'Your Service'}`;
      }

      return {
        subject,
        body: emailBody,
      };
    });
  },
  {
    name: 'Appointment Updates',
    description: 'Appointment confirmations, reminders, and updates',
    payloadSchema: z.object({
      eventType: z.enum(['confirmed', 'reminder', 'cancelled', 'rescheduled', 'updated']),
      customerName: z.string(),
      expertName: z.string(),
      serviceName: z.string().optional(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      timezone: z.string().optional().default('UTC'),
      appointmentDuration: z.string().optional().default('60 minutes'),
      meetingUrl: z.string().optional(),
      timeUntilAppointment: z.string().optional(),
      notes: z.string().optional(),
      message: z.string().optional(),
      appointmentId: z.string().optional(),
      locale: z.string().optional().default('en'),
      userSegment: z.enum(['patient', 'expert', 'admin']).optional().default('patient'),
      templateVariant: z
        .enum(['default', 'urgent', 'reminder', 'minimal', 'branded'])
        .optional()
        .default('default'),
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
    name: 'Marketplace Updates',
    description: 'Notifications for marketplace account and payment status changes',
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
    name: 'System Health',
    description: 'Notifications for system health status and alerts',
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
    await step.inApp('appointment-confirmed', async () => {
      const links = getAppointmentLinks('confirmed', payload.meetLink, payload.appointmentId);

      return {
        subject: `✅ Appointment confirmed with ${payload.clientName}`,
        body: `Your appointment for ${payload.eventTitle} is confirmed for ${payload.appointmentDate} at ${payload.appointmentTime}.`,
        ...links,
        data: {
          expertName: payload.expertName,
          appointmentDate: payload.appointmentDate,
          appointmentTime: payload.appointmentTime,
          meetLink: payload.meetLink,
          timezone: payload.timezone,
          guestTimezone: payload.guestTimezone,
          appointmentId: payload.appointmentId,
        },
      };
    });

    await step.email('appointment-confirmation-email', async () => {
      // CRITICAL: This email is sent to the EXPERT
      // Use the ExpertNewAppointment template which says "Hello [expertName]"
      // and shows them the patient details (not vice versa)
      const emailBody = await elevaEmailService.renderExpertNewAppointment({
        expertName: payload.expertName,
        clientName: payload.clientName,
        appointmentDate: payload.appointmentDate,
        appointmentTime: payload.appointmentTime,
        timezone: payload.timezone, // ✅ Expert's timezone
        appointmentDuration: payload.appointmentDuration,
        eventTitle: payload.eventTitle,
        meetLink: payload.meetLink,
        notes: payload.notes,
        locale: payload.locale || 'en',
      });

      return {
        subject: `📅 New Booking: ${payload.eventTitle} with ${payload.clientName}`,
        body: emailBody,
      };
    });
  },
  {
    name: 'Appointment Confirmations',
    description: 'Notifications for confirmed appointments (sent to expert with expert timezone)',
    payloadSchema: z.object({
      expertName: z.string(),
      clientName: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      timezone: z.string(), // Expert's timezone for display
      guestTimezone: z.string().optional(), // Guest's timezone for reference
      appointmentDuration: z.string(),
      eventTitle: z.string(),
      meetLink: z.string().optional(),
      notes: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
      appointmentId: z.string().optional(),
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
    name: 'Multibanco Booking Pending',
    description: 'Notifications for pending Multibanco payments for bookings',
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
        entity: payload.multibancoEntity || '',
        reference: payload.multibancoReference || '',
        amount: payload.multibancoAmount || '',
        expiresAt: payload.voucherExpiresAt || '',
        appointmentDetails: payload.appointmentTime
          ? {
              service: payload.serviceName || '',
              expert: payload.expertName || '',
              date: payload.appointmentDate || '',
              time: payload.appointmentTime || '',
              duration: payload.duration ? `${payload.duration} minutes` : '60 minutes',
            }
          : undefined,
        reminderType: payload.reminderType || 'gentle',
        locale: payload.locale || 'en',
        userSegment: 'patient',
        templateVariant: 'reminder',
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
    name: 'Multibanco Payment Reminders',
    description: 'Notifications for upcoming Multibanco payment reminders',
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
    name: 'Expert Payout Notifications',
    description: "Notifications for when an expert's payout has been sent",
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

// Reservation Expired Workflow - Notifies when a Multibanco payment expires
// Supports both expert and patient recipients based on recipientType
export const reservationExpiredWorkflow = workflow(
  'reservation-expired',
  async ({ payload, step }) => {
    const isPatient = payload.recipientType === 'patient';
    const recipientName = isPatient ? payload.clientName : payload.expertName;

    // In-app notification
    await step.inApp('reservation-expired-inapp', async () => {
      const body = isPatient
        ? `Your booking for ${payload.serviceName} with ${payload.expertName} has been cancelled because the payment was not completed within 7 days.`
        : `A pending booking from ${payload.clientName} for ${payload.serviceName} has been cancelled because the Multibanco payment was not completed within 7 days.`;

      return {
        subject: `⏰ Booking cancelled - ${payload.serviceName}`,
        body,
        data: {
          expertName: payload.expertName,
          clientName: payload.clientName,
          serviceName: payload.serviceName,
          appointmentDate: payload.appointmentDate,
          appointmentTime: payload.appointmentTime,
          timezone: payload.timezone,
          recipientType: payload.recipientType,
        },
      };
    });

    // Email notification
    await step.email('reservation-expired-email', async () => {
      const emailBody = await elevaEmailService.renderGenericEmail({
        templateName: 'reservation-expired',
        subject: `⏰ Booking cancelled - ${payload.serviceName}`,
        templateData: {
          recipientName,
          recipientType: payload.recipientType || 'expert',
          expertName: payload.expertName,
          clientName: payload.clientName,
          serviceName: payload.serviceName,
          appointmentDate: payload.appointmentDate,
          appointmentTime: payload.appointmentTime,
          timezone: payload.timezone || 'UTC',
          locale: payload.locale || 'en',
        },
        locale: payload.locale || 'en',
      });

      // Different subjects for patient vs expert (both localized)
      let subject: string;
      if (isPatient) {
        subject =
          payload.locale === 'pt'
            ? `⏰ A sua reserva expirou - ${payload.serviceName}`
            : payload.locale === 'es'
              ? `⏰ Su reserva ha expirado - ${payload.serviceName}`
              : `⏰ Your booking has expired - ${payload.serviceName}`;
      } else {
        subject =
          payload.locale === 'pt'
            ? `⏰ Reserva pendente cancelada - ${payload.serviceName}`
            : payload.locale === 'es'
              ? `⏰ Reserva pendiente cancelada - ${payload.serviceName}`
              : `⏰ Pending booking cancelled - ${payload.serviceName}`;
      }

      return {
        subject,
        body: emailBody,
      };
    });
  },
  {
    name: 'Reservation Expired Notifications',
    description:
      'Notifies experts and patients when a Multibanco payment expires and the booking is cancelled',
    payloadSchema: z.object({
      expertName: z.string(),
      clientName: z.string(),
      serviceName: z.string(),
      appointmentDate: z.string(),
      appointmentTime: z.string(),
      timezone: z.string().optional(),
      locale: z.string().optional(),
      recipientType: z.enum(['expert', 'patient']).optional().default('expert'),
    }),
    tags: ['payments', 'reservations', 'expiration'],
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
  reservationExpiredWorkflow,
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
