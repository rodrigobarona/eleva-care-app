import { ENV_CONFIG } from '@/config/env';
import { getLocalizedWorkflowId } from '@/config/novu';
import { Novu } from '@novu/api';
import { createHmac } from 'crypto';

// Initialize Novu defensively - handle missing secret key during build
let novu: Novu | null = null;

try {
  if (ENV_CONFIG.NOVU_SECRET_KEY) {
    novu = new Novu({
      secretKey: ENV_CONFIG.NOVU_SECRET_KEY,
      serverURL: ENV_CONFIG.NOVU_BASE_URL || 'https://eu.api.novu.co',
    });
  } else {
    console.warn('[Novu] Secret key not available, some functionality will be limited');
  }
} catch (error) {
  console.error('[Novu] Failed to initialize:', error);
}

// Type definition for notification payload to ensure compatibility with Novu
export type NovuPayload = Record<
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
 * Generate HMAC hash for subscriber authentication
 * This prevents unauthorized access to notification feeds
 *
 * @param subscriberId - Unique identifier for the subscriber (usually Clerk user ID)
 * @returns HMAC hash for secure authentication
 */
export function generateSubscriberHash(subscriberId: string): string {
  if (!ENV_CONFIG.NOVU_SECRET_KEY) {
    throw new Error('NOVU_SECRET_KEY is required for HMAC authentication');
  }

  return createHmac('sha256', ENV_CONFIG.NOVU_SECRET_KEY).update(subscriberId).digest('hex');
}

/**
 * Get secure subscriber data for Novu authentication
 * Includes both the subscriber ID and the HMAC hash
 *
 * @param subscriberId - Unique identifier for the subscriber
 * @returns Object containing subscriber ID and hash for secure authentication
 */
export function getSecureSubscriberData(subscriberId: string) {
  try {
    const subscriberHash = generateSubscriberHash(subscriberId);
    return {
      subscriberId,
      subscriberHash,
    };
  } catch (error) {
    console.error('Failed to generate secure subscriber data:', error);
    throw error;
  }
}

/**
 * Helper function to normalize locale for Novu workflow IDs
 * Maps common locale formats to our supported locales
 *
 * @param locale - Locale string (e.g., 'en-US', 'pt-PT', 'pt-BR', 'es-ES')
 * @returns Normalized locale for workflow ID (e.g., 'en', 'pt', 'br', 'es')
 */
export function normalizeLocaleForWorkflow(locale?: string): string {
  if (!locale) return 'en';

  const normalizedLocale = locale.toLowerCase();

  // Map specific locales to our workflow locales
  const localeMap: Record<string, string> = {
    en: 'en',
    'en-us': 'en',
    'en-gb': 'en',
    pt: 'pt',
    'pt-pt': 'pt',
    'pt-br': 'br',
    es: 'es',
    'es-es': 'es',
    'es-mx': 'es',
    'es-ar': 'es',
    br: 'br', // Direct Brazilian Portuguese
  };

  return localeMap[normalizedLocale] || 'en';
}

/**
 * Trigger a localized workflow with enhanced error handling and type safety
 *
 * @param baseWorkflowId - The base Novu workflow identifier (without locale suffix)
 * @param payload - Notification payload data (type-safe)
 * @param subscriberId - Target subscriber ID
 * @param locale - User's locale (optional, defaults to 'en')
 * @returns Promise resolving to the trigger result or null on failure
 */
export async function triggerLocalizedWorkflow(
  baseWorkflowId: string,
  payload: NovuPayload,
  subscriberId: string,
  locale?: string,
) {
  if (!novu) {
    console.warn(`[Novu] Cannot trigger workflow ${baseWorkflowId}: Novu not initialized`);
    return null;
  }

  try {
    const normalizedLocale = normalizeLocaleForWorkflow(locale);
    const workflowId = getLocalizedWorkflowId(baseWorkflowId, normalizedLocale);

    const result = await novu.trigger({
      workflowId,
      to: {
        subscriberId,
      },
      payload,
    });

    console.log(
      `[Novu] Successfully triggered localized workflow ${workflowId} for subscriber ${subscriberId} (locale: ${normalizedLocale})`,
    );
    return result;
  } catch (error) {
    console.error(`[Novu] Failed to trigger localized workflow ${baseWorkflowId}:`, error);
    return null;
  }
}

/**
 * Trigger a workflow with enhanced error handling and type safety
 * (Legacy method for backward compatibility)
 *
 * @param workflowId - The Novu workflow identifier
 * @param payload - Notification payload data (type-safe)
 * @param subscriberId - Target subscriber ID
 * @returns Promise resolving to the trigger result or null on failure
 */
export async function triggerWorkflow(
  workflowId: string,
  payload: NovuPayload,
  subscriberId: string,
) {
  if (!novu) {
    console.warn(`[Novu] Cannot trigger workflow ${workflowId}: Novu not initialized`);
    return null;
  }

  try {
    const result = await novu.trigger({
      workflowId,
      to: {
        subscriberId,
      },
      payload,
    });

    console.log(
      `[Novu] Successfully triggered workflow ${workflowId} for subscriber ${subscriberId}`,
    );
    return result;
  } catch (error) {
    console.error(`[Novu] Failed to trigger workflow ${workflowId}:`, error);
    return null;
  }
}

/**
 * Trigger a workflow with multiple subscribers
 *
 * @param workflowId - The Novu workflow identifier
 * @param payload - Notification payload data
 * @param subscriberIds - Array of target subscriber IDs
 * @returns Promise resolving to array of results
 */
export async function triggerWorkflowBatch(
  workflowId: string,
  payload: NovuPayload,
  subscriberIds: string[],
) {
  if (!novu) {
    console.warn(`[Novu] Cannot trigger batch workflow ${workflowId}: Novu not initialized`);
    return [];
  }

  const results = await Promise.allSettled(
    subscriberIds.map((subscriberId) => triggerWorkflow(workflowId, payload, subscriberId)),
  );

  const successful = results.filter((result) => result.status === 'fulfilled').length;
  const failed = results.length - successful;

  console.log(`[Novu] Batch workflow ${workflowId}: ${successful} successful, ${failed} failed`);

  return results;
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
    await novu!.subscribers.create({
      subscriberId: data.subscriberId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      avatar: data.avatar,
      locale: data.locale || 'en-US', // Default to English
      data: {
        // Spread custom data first
        ...(data.data || {}),
        // Then set explicit fields to ensure they take precedence
        role: data.role,
        timezone: data.timezone,
      },
    });
    console.log(`Novu subscriber updated: ${data.subscriberId}`);
  } catch (error) {
    console.error('Error updating Novu subscriber:', error);
    throw error;
  }
}

/**
 * Trigger marketplace payment received notification (localized)
 */
export async function triggerPaymentReceivedNotification(
  subscriberId: string,
  payload: PayoutNotificationPayload,
  locale?: string,
) {
  if (!isNovuAvailable()) {
    console.warn('Novu not available - skipping payment notification for:', subscriberId);
    return;
  }

  try {
    await triggerLocalizedWorkflow('marketplace-payment-received', payload, subscriberId, locale);
    console.log(`Payment received notification sent to: ${subscriberId} (locale: ${locale})`);
  } catch (error) {
    console.error('Error sending payment notification:', error);
    throw error;
  }
}

/**
 * Trigger appointment reminder notification (localized)
 */
export async function triggerAppointmentReminder(
  subscriberId: string,
  payload: AppointmentReminderPayload,
  locale?: string,
) {
  if (!isNovuAvailable()) {
    console.warn('Novu not available - skipping appointment reminder for:', subscriberId);
    return;
  }

  try {
    await triggerLocalizedWorkflow('appointment-reminder-24hr', payload, subscriberId, locale);
    console.log(`Appointment reminder sent to: ${subscriberId} (locale: ${locale})`);
  } catch (error) {
    console.error('Error sending appointment reminder:', error);
    throw error;
  }
}

/**
 * Trigger welcome workflow for new users (localized)
 */
export async function triggerWelcomeWorkflow(
  subscriberId: string,
  payload: {
    userName: string;
    firstName: string;
    profileUrl?: string;
  },
  locale?: string,
) {
  if (!isNovuAvailable()) {
    console.warn('Novu not available - skipping welcome notification for:', subscriberId);
    return;
  }

  try {
    await triggerLocalizedWorkflow(
      'user-welcome',
      {
        ...payload,
        profileUrl: payload.profileUrl || '/profile',
      },
      subscriberId,
      locale,
    );
    console.log(`Welcome notification sent to: ${subscriberId} (locale: ${locale})`);
  } catch (error) {
    console.error('Error sending welcome notification:', error);
    throw error;
  }
}

/**
 * Trigger payment success workflow (localized)
 */
export async function triggerPaymentSuccessWorkflow(
  subscriberId: string,
  payload: {
    amount: string;
    planName: string;
    paymentDate: string;
    transactionId: string;
  },
  locale?: string,
) {
  if (!isNovuAvailable()) {
    console.warn('Novu not available - skipping payment success notification for:', subscriberId);
    return;
  }

  try {
    await triggerLocalizedWorkflow('payment-success', payload, subscriberId, locale);
    console.log(`Payment success notification sent to: ${subscriberId} (locale: ${locale})`);
  } catch (error) {
    console.error('Error sending payment success notification:', error);
    throw error;
  }
}

/**
 * Trigger payment failed workflow (localized)
 */
export async function triggerPaymentFailedWorkflow(
  subscriberId: string,
  payload: {
    amount: string;
    reason: string;
    billingUrl?: string;
  },
  locale?: string,
) {
  if (!isNovuAvailable()) {
    console.warn('Novu not available - skipping payment failed notification for:', subscriberId);
    return;
  }

  try {
    await triggerLocalizedWorkflow(
      'payment-failed',
      {
        ...payload,
        billingUrl: payload.billingUrl || '/billing',
      },
      subscriberId,
      locale,
    );
    console.log(`Payment failed notification sent to: ${subscriberId} (locale: ${locale})`);
  } catch (error) {
    console.error('Error sending payment failed notification:', error);
    throw error;
  }
}

/**
 * Trigger expert onboarding complete workflow (localized)
 */
export async function triggerExpertOnboardingCompleteWorkflow(
  subscriberId: string,
  payload: {
    expertName: string;
    specialization: string;
    dashboardUrl?: string;
  },
  locale?: string,
) {
  if (!isNovuAvailable()) {
    console.warn('Novu not available - skipping expert onboarding notification for:', subscriberId);
    return;
  }

  try {
    await triggerLocalizedWorkflow(
      'expert-onboarding-complete',
      {
        ...payload,
        dashboardUrl: payload.dashboardUrl || '/dashboard',
      },
      subscriberId,
      locale,
    );
    console.log(`Expert onboarding notification sent to: ${subscriberId} (locale: ${locale})`);
  } catch (error) {
    console.error('Error sending expert onboarding notification:', error);
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
    await novu!.trigger({
      workflowId: 'expert-payout-setup-reminder',
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
    await novu!.trigger({
      workflowId: 'new-booking-expert',
      to: { subscriberId },
      payload,
    });
    console.log(`New booking notification sent to expert: ${subscriberId}`);
  } catch (error) {
    console.error('Error sending new booking notification:', error);
    throw error;
  }
}

// Export the novu client instance (could be null)
export { novu as novu };
