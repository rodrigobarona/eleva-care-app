import { ENV_CONFIG } from '@/config/env';
import { Novu } from '@novu/node';
import { createHmac } from 'crypto';

// Initialize Novu defensively - handle missing secret key during build
let novu: Novu | null = null;

try {
  if (ENV_CONFIG.NOVU_SECRET_KEY) {
    novu = new Novu(ENV_CONFIG.NOVU_SECRET_KEY);
  } else {
    console.warn('NOVU_SECRET_KEY not found - Novu functionality will be disabled');
  }
} catch (error) {
  console.warn('Failed to initialize Novu:', error);
}

// Novu-compatible payload type that matches ITriggerPayload requirements
type NovuPayload = Record<
  string,
  string | number | boolean | Record<string, unknown> | string[] | undefined
>;

interface SubscriberData {
  subscriberId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  locale?: string; // en-US, pt-PT, pt-BR, es-ES
  role?: 'customer' | 'expert' | 'admin';
  timezone?: string;
  data?: Record<string, unknown>;
}

interface PayoutNotificationPayload extends NovuPayload {
  amount: string;
  expertName: string;
  clientName?: string;
  sessionDate: string;
  transactionId: string;
  dashboardUrl?: string;
}

interface AppointmentReminderPayload extends NovuPayload {
  userName: string;
  expertName: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  timeUntilAppointment: string;
  meetingLink: string;
}

/**
 * Check if Novu is properly initialized
 */
function isNovuAvailable(): boolean {
  return novu !== null && !!ENV_CONFIG.NOVU_SECRET_KEY;
}

/**
 * Generate HMAC hash for secure subscriber authentication
 * This prevents malicious actors from accessing other users' notification feeds
 * Uses the same NOVU_SECRET_KEY that's used for API operations
 *
 * @param subscriberId The Clerk user ID to hash
 * @returns HMAC SHA-256 hash for secure frontend authentication
 */
export function generateSubscriberHash(subscriberId: string): string {
  if (!ENV_CONFIG.NOVU_SECRET_KEY) {
    throw new Error('NOVU_SECRET_KEY is required for HMAC generation');
  }

  return createHmac('sha256', ENV_CONFIG.NOVU_SECRET_KEY).update(subscriberId).digest('hex');
}

/**
 * Get secure subscriber data for frontend Inbox component
 * Includes HMAC hash for production security
 *
 * @param subscriberId The Clerk user ID
 * @returns Object with subscriberId and secure hash for frontend use
 */
export function getSecureSubscriberData(subscriberId: string) {
  return {
    subscriberId,
    subscriberHash: generateSubscriberHash(subscriberId),
  };
}

/**
 * Generic function to trigger any Novu workflow - used by webhooks
 */
export async function triggerWorkflow(
  workflowId: string,
  subscriber: SubscriberData,
  payload: NovuPayload,
) {
  if (!isNovuAvailable()) {
    console.warn('Novu not available - skipping workflow trigger:', workflowId);
    return;
  }

  try {
    // Ensure subscriber exists/is updated first
    await createOrUpdateNovuSubscriber(subscriber);

    // Trigger the workflow
    await novu!.trigger(workflowId, {
      to: { subscriberId: subscriber.subscriberId },
      payload,
    });

    console.log(
      `Workflow triggered successfully: ${workflowId} for subscriber: ${subscriber.subscriberId}`,
    );
  } catch (error) {
    console.error(`Error triggering workflow ${workflowId}:`, error);
    throw error;
  }
}

/**
 * Create or update a Novu subscriber with comprehensive profile data
 */
export async function createOrUpdateNovuSubscriber(data: SubscriberData) {
  if (!isNovuAvailable()) {
    console.warn('Novu not available - skipping subscriber update:', data.subscriberId);
    return;
  }

  try {
    await novu!.subscribers.identify(data.subscriberId, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      avatar: data.avatar,
      locale: data.locale || 'en-US', // Default to English
      data: {
        role: data.role,
        timezone: data.timezone,
        ...data.data,
      },
    });
    console.log(`Novu subscriber updated: ${data.subscriberId}`);
  } catch (error) {
    console.error('Error updating Novu subscriber:', error);
    throw error;
  }
}

/**
 * Trigger marketplace payment received notification
 */
export async function triggerPaymentReceivedNotification(
  subscriberId: string,
  payload: PayoutNotificationPayload,
) {
  if (!isNovuAvailable()) {
    console.warn('Novu not available - skipping payment notification for:', subscriberId);
    return;
  }

  try {
    await novu!.trigger('marketplace-payment-received', {
      to: { subscriberId },
      payload,
    });
    console.log(`Payment received notification sent to: ${subscriberId}`);
  } catch (error) {
    console.error('Error sending payment notification:', error);
    throw error;
  }
}

/**
 * Trigger appointment reminder notification
 */
export async function triggerAppointmentReminder(
  subscriberId: string,
  payload: AppointmentReminderPayload,
) {
  if (!isNovuAvailable()) {
    console.warn('Novu not available - skipping appointment reminder for:', subscriberId);
    return;
  }

  try {
    await novu!.trigger('appointment-reminder-24hr', {
      to: { subscriberId },
      payload,
    });
    console.log(`Appointment reminder sent to: ${subscriberId}`);
  } catch (error) {
    console.error('Error sending appointment reminder:', error);
    throw error;
  }
}

/**
 * Trigger expert payout setup reminder
 */
export async function triggerPayoutSetupReminder(
  subscriberId: string,
  payload: {
    expertName: string;
    stripeConnectSetupLink: string;
    deadlineText?: string;
    supportContactLink?: string;
  },
) {
  if (!isNovuAvailable()) {
    console.warn('Novu not available - skipping payout setup reminder for:', subscriberId);
    return;
  }

  try {
    await novu!.trigger('expert-payout-setup-reminder', {
      to: { subscriberId },
      payload,
    });
    console.log(`Payout setup reminder sent to: ${subscriberId}`);
  } catch (error) {
    console.error('Error sending payout setup reminder:', error);
    throw error;
  }
}

/**
 * Trigger new booking notification for expert
 */
export async function triggerNewBookingExpert(
  subscriberId: string,
  payload: {
    expertName: string;
    clientName: string;
    appointmentType: string;
    appointmentDate: string;
    appointmentTime: string;
    clientNotes?: string;
    appointmentDetailsLink: string;
  },
) {
  if (!isNovuAvailable()) {
    console.warn('Novu not available - skipping new booking notification for:', subscriberId);
    return;
  }

  try {
    await novu!.trigger('new-booking-expert', {
      to: { subscriberId },
      payload,
    });
    console.log(`New booking notification sent to expert: ${subscriberId}`);
  } catch (error) {
    console.error('Error sending new booking notification:', error);
    throw error;
  }
}

// Export the novu instance (could be null)
export { novu };
