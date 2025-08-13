import { ENV_CONFIG } from '@/config/env';
import { Novu } from '@novu/api';

// Initialize Novu client following latest best practices
let novu: Novu | null = null;
let initializationError: string | null = null;

try {
  console.log('[Novu] Initializing client...');
  console.log('[Novu] Environment check:', {
    hasSecretKey: !!ENV_CONFIG.NOVU_SECRET_KEY,
    hasApiKey: !!ENV_CONFIG.NOVU_API_KEY,
    hasAppId: !!ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER,
    baseUrl: ENV_CONFIG.NOVU_BASE_URL || 'default',
    keyPrefix: ENV_CONFIG.NOVU_SECRET_KEY
      ? ENV_CONFIG.NOVU_SECRET_KEY.substring(0, 8) + '...'
      : 'none',
  });

  if (ENV_CONFIG.NOVU_SECRET_KEY) {
    novu = new Novu({
      secretKey: ENV_CONFIG.NOVU_SECRET_KEY,
      // Use EU region if configured, defaults to US
      ...(ENV_CONFIG.NOVU_BASE_URL && { apiUrl: ENV_CONFIG.NOVU_BASE_URL }),
    });
    console.log('[Novu] ✅ Client initialized successfully');
  } else if (ENV_CONFIG.NOVU_API_KEY) {
    // Legacy fallback for older API key format
    novu = new Novu({
      secretKey: ENV_CONFIG.NOVU_API_KEY,
      ...(ENV_CONFIG.NOVU_BASE_URL && { apiUrl: ENV_CONFIG.NOVU_BASE_URL }),
    });
    console.log('[Novu] ✅ Client initialized with legacy API key');
  } else {
    initializationError = 'Missing NOVU_SECRET_KEY or NOVU_API_KEY environment variable';
    console.error(`[Novu] ❌ ${initializationError}`);
    console.error('[Novu] 🔧 To fix: Set NOVU_SECRET_KEY in your environment variables');
    console.error('[Novu] 📚 See: docs/vercel-env-setup.md for setup instructions');
  }
} catch (error) {
  initializationError = `Initialization failed: ${error}`;
  console.error('[Novu] ❌ Failed to initialize:', error);
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
  if (!novu) {
    const errorMsg = `[Novu] Cannot trigger workflow ${options.workflowId}: ${initializationError || 'client not initialized'}`;
    console.error(errorMsg);
    console.error(
      '[Novu] 🔧 Check environment variables: NOVU_SECRET_KEY, NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER',
    );
    return null;
  }

  try {
    console.log(`[Novu] Triggering workflow: ${options.workflowId}`, {
      subscriberId: options.to.subscriberId,
      hasPayload: !!options.payload,
      payloadKeys: options.payload ? Object.keys(options.payload) : [],
    });

    const result = await novu.trigger({
      workflowId: options.workflowId,
      to: options.to,
      payload: options.payload || {},
      overrides: options.overrides,
      actor: options.actor,
    });

    console.log(`[Novu] ✅ Successfully triggered workflow: ${options.workflowId}`);
    return result;
  } catch (error) {
    console.error(`[Novu] ❌ Failed to trigger workflow ${options.workflowId}:`, error);

    // Provide specific error guidance
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const errorWithStatus = error as { statusCode: number };
      if (errorWithStatus.statusCode === 401) {
        console.error(
          '[Novu] 🔑 Authentication error - check NOVU_SECRET_KEY environment variable',
        );
        console.error('[Novu] 📚 Setup guide: docs/vercel-env-setup.md');
      }
    }

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

/**
 * Get Novu client status and configuration for diagnostics
 */
export function getNovuStatus() {
  return {
    initialized: !!novu,
    initializationError,
    config: {
      hasSecretKey: !!ENV_CONFIG.NOVU_SECRET_KEY,
      hasApiKey: !!ENV_CONFIG.NOVU_API_KEY,
      hasAppId: !!ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER,
      baseUrl: ENV_CONFIG.NOVU_BASE_URL,
      socketUrl: ENV_CONFIG.NOVU_SOCKET_URL,
      adminSubscriberId: ENV_CONFIG.NOVU_ADMIN_SUBSCRIBER_ID,
      keyPrefix: ENV_CONFIG.NOVU_SECRET_KEY
        ? ENV_CONFIG.NOVU_SECRET_KEY.substring(0, 8) + '...'
        : 'none',
    },
  };
}

// Export client for advanced usage if needed
export { novu };
