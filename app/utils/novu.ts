import { ENV_CONFIG } from '@/config/env';
import { Novu } from '@novu/api';

// Initialize Novu client following latest best practices
let novu: Novu | null = null;

try {
  if (ENV_CONFIG.NOVU_SECRET_KEY) {
    novu = new Novu({
      secretKey: ENV_CONFIG.NOVU_SECRET_KEY,
      // Use EU region if configured, defaults to US
      ...(ENV_CONFIG.NOVU_BASE_URL && { apiUrl: ENV_CONFIG.NOVU_BASE_URL }),
    });
  } else {
    console.warn('[Novu] Secret key not available');
  }
} catch (error) {
  console.error('[Novu] Failed to initialize:', error);
}

// Modern interface following latest documentation patterns
export interface TriggerWorkflowOptions {
  workflowId: string;
  to: {
    subscriberId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
    data?: Record<string, string | number | boolean>;
  };
  payload?: Record<string, string | number | boolean | null | undefined>;
  overrides?: {
    email?: {
      from?: string;
      subject?: string;
    };
    sms?: Record<string, unknown>;
    push?: Record<string, unknown>;
  };
  actor?: {
    subscriberId: string;
    data?: Record<string, string | number | boolean>;
  };
}

/**
 * Trigger a Novu workflow using the latest API
 * Following @novu/api best practices from documentation
 */
export async function triggerWorkflow(options: TriggerWorkflowOptions) {
  if (!novu || !ENV_CONFIG.NOVU_SECRET_KEY) {
    console.warn(`[Novu] Cannot trigger workflow ${options.workflowId}: not initialized`);
    return null;
  }

  try {
    console.log(`[Novu] Triggering workflow: ${options.workflowId}`, {
      subscriberId: options.to.subscriberId,
    });

    const result = await novu.trigger({
      workflowId: options.workflowId,
      to: options.to,
      payload: options.payload || {},
      overrides: options.overrides,
      actor: options.actor,
    });

    console.log(`[Novu] Successfully triggered workflow: ${options.workflowId}`);
    return result;
  } catch (error) {
    console.error(`[Novu] Failed to trigger workflow ${options.workflowId}:`, error);
    return null;
  }
}

/**
 * Create or update a subscriber using modern API
 * Synchronizes user profile data with Novu following best practices
 */
export async function updateSubscriber(subscriber: TriggerWorkflowOptions['to']) {
  if (!novu || !ENV_CONFIG.NOVU_SECRET_KEY) {
    console.warn('[Novu] Cannot update subscriber: not initialized');
    return null;
  }

  try {
    const result = await novu.subscribers.create({
      subscriberId: subscriber.subscriberId,
      firstName: subscriber.firstName,
      lastName: subscriber.lastName,
      email: subscriber.email,
      phone: subscriber.phone,
      avatar: subscriber.avatar,
      data: subscriber.data,
    });

    console.log(`[Novu] Subscriber updated: ${subscriber.subscriberId}`);
    return result;
  } catch (error) {
    console.error('[Novu] Error updating subscriber:', error);
    return null;
  }
}

// Export client for advanced usage if needed
export { novu };
