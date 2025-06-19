import { ENV_CONFIG } from '@/config/env';
import { Novu } from '@novu/api';
import type { SubscriberPayloadDto } from '@novu/api/models/components';

// Initialize Novu using the latest API with proper configuration
let novu: Novu | null = null;

try {
  if (ENV_CONFIG.NOVU_SECRET_KEY) {
    novu = new Novu({
      secretKey: ENV_CONFIG.NOVU_SECRET_KEY,
      // Use EU region if configured, otherwise default to US
      serverURL: ENV_CONFIG.NOVU_BASE_URL || 'https://eu.api.novu.co',
    });
  } else {
    console.warn('[Novu] Secret key not available, some functionality will be limited');
  }
} catch (error) {
  console.error('[Novu] Failed to initialize:', error);
}

// Modern type definitions aligned with Novu API v2
export interface NovuTriggerPayload {
  [key: string]: string | number | boolean | Record<string, unknown> | string[] | undefined;
}

export interface NovuSubscriber extends SubscriberPayloadDto {
  subscriberId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  data?: { [k: string]: string | number | boolean | string[] };
}

export interface NovuTriggerOptions {
  workflowId: string;
  to: string | NovuSubscriber;
  payload?: NovuTriggerPayload;
  overrides?: {
    email?: {
      from?: string;
      subject?: string;
      customData?: Record<string, unknown>;
      integrationIdentifier?: string;
    };
    sms?: {
      integrationIdentifier?: string;
    };
    push?: {
      integrationIdentifier?: string;
    };
  };
  actor?: {
    subscriberId: string;
    data?: { [k: string]: string | number | boolean | string[] };
  };
  tenant?: string;
}

// Specialized payload interfaces for different notification types
export interface PayoutNotificationPayload extends NovuTriggerPayload {
  amount: string;
  expertName: string;
  clientName?: string;
  sessionDate: string;
  transactionId: string;
  dashboardUrl?: string;
}

export interface AppointmentReminderPayload extends NovuTriggerPayload {
  userName: string;
  expertName: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  timeUntilAppointment: string;
  meetingLink: string;
}

export interface BookingNotificationPayload extends NovuTriggerPayload {
  expertName: string;
  clientName: string;
  appointmentType: string;
  appointmentDate: string;
  appointmentTime: string;
  clientNotes?: string;
  appointmentDetailsLink: string;
}

export interface PayoutSetupReminderPayload extends NovuTriggerPayload {
  expertName: string;
  stripeConnectSetupLink: string;
  deadlineText?: string;
  supportContactLink?: string;
}

/**
 * Check if Novu is properly initialized and available
 */
function isNovuAvailable(): boolean {
  return novu !== null && !!ENV_CONFIG.NOVU_SECRET_KEY;
}

/**
 * Generate HMAC hash for subscriber authentication using Web Crypto API
 * This prevents unauthorized access to notification feeds
 *
 * @param subscriberId - Unique identifier for the subscriber (usually Clerk user ID)
 * @returns Promise<string> HMAC hash for secure authentication
 */
export async function generateSubscriberHash(subscriberId: string): Promise<string> {
  if (!ENV_CONFIG.NOVU_SECRET_KEY) {
    throw new Error('NOVU_SECRET_KEY is required for HMAC authentication');
  }

  // Use Web Crypto API for Edge Runtime compatibility
  const encoder = new TextEncoder();
  const keyData = encoder.encode(ENV_CONFIG.NOVU_SECRET_KEY);
  const messageData = encoder.encode(subscriberId);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));

  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get secure subscriber data for Novu authentication
 * Includes both the subscriber ID and the HMAC hash
 *
 * @param subscriberId - Unique identifier for the subscriber
 * @returns Promise<object> Object containing subscriber ID and hash for secure authentication
 */
export async function getSecureSubscriberData(subscriberId: string) {
  try {
    const subscriberHash = await generateSubscriberHash(subscriberId);
    return {
      subscriberId,
      subscriberHash,
    };
  } catch (error) {
    console.error('[Novu] Failed to generate secure subscriber data:', error);
    throw error;
  }
}

/**
 * Modern trigger workflow function with enhanced features and retry logic
 * Follows the latest Novu API v2 best practices
 *
 * @param options - Complete trigger options including workflowId, subscriber, payload, and overrides
 * @returns Promise resolving to the trigger result or null on failure
 */
export async function triggerWorkflow(options: NovuTriggerOptions) {
  if (!isNovuAvailable()) {
    console.warn(`[Novu] Cannot trigger workflow ${options.workflowId}: Novu not initialized`);
    return null;
  }

  try {
    console.log(`[Novu] Triggering workflow: ${options.workflowId}`, {
      subscriberId: typeof options.to === 'string' ? options.to : options.to.subscriberId,
      hasPayload: !!options.payload,
      hasOverrides: !!options.overrides,
    });

    const result = await novu!.trigger({
      workflowId: options.workflowId,
      to: options.to,
      payload: options.payload || {},
      overrides: options.overrides,
      actor: options.actor,
      tenant: options.tenant,
    });

    const subscriberId = typeof options.to === 'string' ? options.to : options.to.subscriberId;
    console.log(
      `[Novu] Successfully triggered workflow ${options.workflowId} for subscriber ${subscriberId}`,
    );
    return result;
  } catch (error) {
    console.error(`[Novu] Failed to trigger workflow ${options.workflowId}:`, error);

    // Enhanced error logging
    if (error instanceof Error) {
      console.error(`[Novu] Error details:`, {
        message: error.message,
        stack: error.stack,
        workflowId: options.workflowId,
      });
    }

    return null;
  }
}

/**
 * Legacy compatibility function for existing code
 * @deprecated Use triggerWorkflow with NovuTriggerOptions instead
 */
export async function triggerWorkflowLegacy(
  workflowId: string,
  payload: NovuTriggerPayload,
  subscriberId: string,
) {
  return triggerWorkflow({
    workflowId,
    to: { subscriberId },
    payload,
  });
}

/**
 * Trigger a workflow with multiple subscribers using batch processing
 *
 * @param workflowId - The Novu workflow identifier
 * @param payload - Notification payload data
 * @param subscriberIds - Array of target subscriber IDs
 * @param overrides - Optional overrides for customization
 * @returns Promise resolving to array of results
 */
export async function triggerWorkflowBatch(
  workflowId: string,
  payload: NovuTriggerPayload,
  subscriberIds: string[],
  overrides?: NovuTriggerOptions['overrides'],
) {
  if (!isNovuAvailable()) {
    console.warn(`[Novu] Cannot trigger batch workflow ${workflowId}: Novu not initialized`);
    return [];
  }

  console.log(
    `[Novu] Starting batch trigger for workflow ${workflowId} with ${subscriberIds.length} subscribers`,
  );

  const results = await Promise.allSettled(
    subscriberIds.map((subscriberId) =>
      triggerWorkflow({
        workflowId,
        to: { subscriberId },
        payload,
        overrides,
      }),
    ),
  );

  const successful = results.filter((result) => result.status === 'fulfilled').length;
  const failed = results.length - successful;

  console.log(`[Novu] Batch workflow ${workflowId}: ${successful} successful, ${failed} failed`);

  if (failed > 0) {
    const failedResults = results.filter((result) => result.status === 'rejected');
    console.error(`[Novu] Failed batch triggers:`, failedResults);
  }

  return results;
}

/**
 * Create or update a Novu subscriber with comprehensive profile data
 * Uses the modern Novu API for subscriber management
 *
 * @param data - Complete subscriber data including identification and metadata
 */
export async function createOrUpdateNovuSubscriber(
  data: NovuSubscriber & {
    role?: 'customer' | 'expert' | 'admin';
    timezone?: string;
  },
) {
  if (!isNovuAvailable()) {
    console.warn('[Novu] Not available - skipping subscriber update:', data.subscriberId);
    return null;
  }

  try {
    const result = await novu!.subscribers.create({
      subscriberId: data.subscriberId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      avatar: data.avatar,
      locale: data.locale || 'en-US',
      data: {
        // Spread custom data first
        ...(data.data || {}),
        // Then set explicit fields to ensure they take precedence
        role: data.role || 'customer',
        timezone: data.timezone || 'UTC',
        lastUpdated: new Date().toISOString(),
      },
    });

    console.log(`[Novu] Subscriber updated: ${data.subscriberId}`);
    return result;
  } catch (error) {
    console.error('[Novu] Error updating subscriber:', error);
    throw error;
  }
}

/**
 * Trigger marketplace payment received notification
 */
export async function triggerPaymentReceivedNotification(
  subscriberId: string,
  payload: PayoutNotificationPayload,
  overrides?: NovuTriggerOptions['overrides'],
) {
  return triggerWorkflow({
    workflowId: 'marketplace-payment-received',
    to: { subscriberId },
    payload,
    overrides,
  });
}

/**
 * Trigger appointment reminder notification
 */
export async function triggerAppointmentReminder(
  subscriberId: string,
  payload: AppointmentReminderPayload,
  overrides?: NovuTriggerOptions['overrides'],
) {
  return triggerWorkflow({
    workflowId: 'appointment-reminder-24hr',
    to: { subscriberId },
    payload,
    overrides,
  });
}

/**
 * Trigger expert payout setup reminder
 */
export async function triggerPayoutSetupReminder(
  subscriberId: string,
  payload: PayoutSetupReminderPayload,
  overrides?: NovuTriggerOptions['overrides'],
) {
  return triggerWorkflow({
    workflowId: 'expert-payout-setup-reminder',
    to: { subscriberId },
    payload,
    overrides,
  });
}

/**
 * Trigger new booking notification for expert
 */
export async function triggerNewBookingExpert(
  subscriberId: string,
  payload: BookingNotificationPayload,
  overrides?: NovuTriggerOptions['overrides'],
) {
  return triggerWorkflow({
    workflowId: 'new-booking-expert',
    to: { subscriberId },
    payload,
    overrides,
  });
}

/**
 * Advanced notification with subscriber sync
 * This function ensures the subscriber is up-to-date before sending a notification
 */
export async function triggerNotificationWithSync(
  workflowId: string,
  subscriber: NovuSubscriber & { role?: 'customer' | 'expert' | 'admin'; timezone?: string },
  payload: NovuTriggerPayload,
  overrides?: NovuTriggerOptions['overrides'],
) {
  try {
    // First, sync the subscriber data
    await createOrUpdateNovuSubscriber(subscriber);

    // Then trigger the notification
    return await triggerWorkflow({
      workflowId,
      to: subscriber,
      payload,
      overrides,
    });
  } catch (error) {
    console.error('[Novu] Error in notification with sync:', error);
    return null;
  }
}

/**
 * Get notification preferences for a subscriber
 * Note: This functionality may need to be implemented using REST API calls
 * until the SDK methods are clarified
 */
export async function getSubscriberPreferences(_subscriberId: string) {
  console.warn('[Novu] Preferences API not yet implemented in current SDK version');
  return null;
}

/**
 * Update notification preferences for a subscriber
 * Note: This functionality may need to be implemented using REST API calls
 * until the SDK methods are clarified
 */
export async function updateSubscriberPreferences(
  _subscriberId: string,
  _workflowId: string,
  _preferences: {
    enabled?: boolean;
    channels?: {
      email?: boolean;
      sms?: boolean;
      in_app?: boolean;
      push?: boolean;
    };
  },
) {
  console.warn('[Novu] Preferences API not yet implemented in current SDK version');
  return null;
}

// Export the novu client instance for advanced usage
export { novu };
