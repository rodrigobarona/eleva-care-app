import { ENV_CONFIG } from '@/config/env';
import { Novu } from '@novu/api';
import { SubscriberPayloadDto } from '@novu/api/models/components/subscriberpayloaddto';

// Initialize Novu client with proper error handling
let novu: Novu | null = null;
let initializationError: string | null = null;

try {
  console.log('[Novu Utils] Initializing client...');
  console.log('[Novu Utils] Environment check:', {
    hasSecretKey: !!ENV_CONFIG.NOVU_SECRET_KEY,
    hasAppId: !!ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER,
    baseUrl: ENV_CONFIG.NOVU_BASE_URL || 'default',
    keyPrefix: ENV_CONFIG.NOVU_SECRET_KEY
      ? ENV_CONFIG.NOVU_SECRET_KEY.substring(0, 8) + '...'
      : 'none',
  });

  if (ENV_CONFIG.NOVU_SECRET_KEY) {
    novu = new Novu({
      secretKey: ENV_CONFIG.NOVU_SECRET_KEY,
      ...(ENV_CONFIG.NOVU_BASE_URL && { serverURL: ENV_CONFIG.NOVU_BASE_URL }),
    });
    console.log('[Novu Utils] ✅ Client initialized successfully');
  } else if (ENV_CONFIG.NOVU_API_KEY) {
    // Legacy fallback
    novu = new Novu({
      secretKey: ENV_CONFIG.NOVU_API_KEY,
      ...(ENV_CONFIG.NOVU_BASE_URL && { serverURL: ENV_CONFIG.NOVU_BASE_URL }),
    });
    console.log('[Novu Utils] ✅ Client initialized with legacy API key');
  } else {
    initializationError = 'Missing NOVU_SECRET_KEY or NOVU_API_KEY environment variable';
    console.error(`[Novu Utils] ❌ ${initializationError}`);
  }
} catch (error) {
  initializationError = `Initialization failed: ${error}`;
  console.error('[Novu Utils] ❌ Failed to initialize:', error);
}

/**
 * Trigger a Novu workflow with subscriber and payload data
 * @param workflowId - The Novu workflow identifier
 * @param subscriber - Subscriber data for the notification target
 * @param payload - Custom payload data for the workflow
 * @returns Promise with success/error response
 */
export async function triggerNovuWorkflow(
  workflowId: string,
  subscriber: SubscriberPayloadDto,
  payload: object,
) {
  if (!novu) {
    const errorMsg = `[Novu Utils] Cannot trigger workflow ${workflowId}: ${initializationError || 'client not initialized'}`;
    console.error(errorMsg);
    console.error(
      '[Novu Utils] 🔧 Check environment variables: NOVU_SECRET_KEY, NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER',
    );
    return { success: false, error: initializationError || 'Client not initialized' };
  }

  try {
    console.log('[Novu Utils] 🔔 Triggering workflow:', {
      workflowId,
      subscriberId: subscriber.subscriberId,
      payload: Object.keys(payload),
    });

    await novu.trigger({
      workflowId,
      to: subscriber,
      payload,
    });

    console.log('[Novu Utils] ✅ Successfully triggered workflow:', workflowId);
    return { success: true };
  } catch (error) {
    console.error('[Novu Utils] ❌ Failed to trigger workflow:', {
      workflowId,
      error: error instanceof Error ? error.message : 'Unknown error',
      fullError: error,
    });

    // Provide specific error guidance
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const errorWithStatus = error as { statusCode: number };
      if (errorWithStatus.statusCode === 401) {
        console.error(
          '[Novu Utils] 🔑 Authentication error - check NOVU_SECRET_KEY environment variable',
        );
      }
    }

    return { success: false, error };
  }
}

interface ClerkUser {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email_addresses?: Array<{ email_address: string }>;
  email?: string;
  phone_numbers?: Array<{ phone_number: string }>;
  image_url?: string;
  username?: string | null;
  public_metadata?: Record<string, unknown>;
  unsafe_metadata?: Record<string, unknown>;
}

/**
 * Build subscriber data from Clerk user data
 * @param user - Clerk user object from webhook
 * @returns Formatted subscriber data for Novu
 */
export function buildNovuSubscriberFromClerk(user: ClerkUser): SubscriberPayloadDto {
  return {
    subscriberId: user.id,
    firstName: user.first_name ?? undefined,
    lastName: user.last_name ?? undefined,
    email: user.email_addresses?.[0]?.email_address || user.email || undefined,
    phone: user.phone_numbers?.[0]?.phone_number || undefined,
    locale: 'en_US', // Can be enhanced with user preferences
    avatar: user.image_url || undefined,
    data: {
      clerkUserId: user.id,
      username: user.username ?? '',
      hasPublicMetadata: Boolean(user.public_metadata),
      hasUnsafeMetadata: Boolean(user.unsafe_metadata),
    },
  };
}

interface StripeCustomer {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  preferred_locales?: string[] | null;
  metadata?: Record<string, string>;
}

/**
 * Build subscriber data from Stripe customer data
 * @param customer - Stripe customer object
 * @returns Formatted subscriber data for Novu
 */
export function buildNovuSubscriberFromStripe(customer: StripeCustomer): SubscriberPayloadDto {
  // Split the full name into first and last name
  const [firstName = '', lastName = ''] = (customer.name ?? '').split(' ');

  return {
    subscriberId: customer.id,
    email: customer.email ?? undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    phone: customer.phone ?? undefined,
    locale: customer.preferred_locales?.[0] || 'en',
    avatar: undefined, // Stripe doesn't provide avatar
    data: {
      stripeCustomerId: customer.id,
      hasCustomerMetadata: Boolean(customer.metadata && Object.keys(customer.metadata).length > 0),
    },
  };
}

/**
 * Mapping of Clerk events to Novu workflow IDs
 * Updated to use standardized workflow IDs from config/novu-workflows.ts
 */
export const CLERK_EVENT_TO_WORKFLOW_MAPPINGS = {
  // User lifecycle events
  // CRITICAL: Only trigger welcome workflow on user creation, NOT on updates
  // user.updated events happen frequently (profile changes, metadata updates, etc.)
  // and should NOT re-trigger welcome emails
  'user.created': 'user-lifecycle', // Uses eventType: 'welcome'
  // ❌ REMOVED: 'user.updated': 'user-lifecycle' - was causing duplicate welcome emails!
  // 'user.deleted': 'user-lifecycle', // Commented out - no need to notify on deletion

  // Session events
  'session.created': 'security-auth', // Uses eventType: 'recent-login'
  // Note: session.removed and session.ended are filtered out to avoid notification spam

  // Email events (if you want to track these)
  'email.created': {
    magic_link_sign_in: 'security-auth', // Uses eventType: 'magic-link-login'
    magic_link_sign_up: 'user-lifecycle', // Uses eventType: 'magic-link-registration'
    reset_password_code: 'security-auth', // Uses eventType: 'password-reset'
    verification_code: 'security-auth', // Uses eventType: 'email-verification'
  },
} as const;

/**
 * Mapping of Stripe events to Novu workflow IDs
 * Updated to use standardized workflow IDs from config/novu-workflows.ts
 */
export const STRIPE_EVENT_TO_WORKFLOW_MAPPINGS = {
  // Payment events - use universal workflow with eventType
  'payment_intent.succeeded': 'payment-universal', // Uses eventType: 'success'
  'payment_intent.payment_failed': 'payment-universal', // Uses eventType: 'failed'
  'charge.refunded': 'payment-universal', // Uses eventType: 'refund'

  // Subscription events - use payment universal workflow
  'customer.subscription.created': 'payment-universal', // Uses eventType: 'success'
  'customer.subscription.updated': 'payment-universal', // Uses eventType: 'success'
  'customer.subscription.deleted': 'payment-universal', // Uses eventType: 'cancelled'

  // Invoice events - use payment universal workflow
  'invoice.payment_succeeded': 'payment-universal', // Uses eventType: 'success'
  'invoice.payment_failed': 'payment-universal', // Uses eventType: 'failed'

  // Dispute events - use payment universal workflow
  'charge.dispute.created': 'payment-universal', // Uses eventType: 'dispute'

  // Connect account events - use expert management workflow
  'account.updated': 'expert-management', // Uses eventType: 'connect-account-status'
  'capability.updated': 'expert-management', // Uses eventType: 'capability-updated'
} as const;

export interface ClerkEventData {
  slug?: string;
  id?: string;
  [key: string]: unknown;
}

/**
 * Get workflow ID from Clerk event type
 * @param eventType - Clerk webhook event type
 * @param eventData - Event data for email events with slugs
 * @returns Workflow ID or undefined if not mapped
 */
export function getWorkflowFromClerkEvent(
  eventType: string,
  eventData?: ClerkEventData,
): string | undefined {
  const mapping =
    CLERK_EVENT_TO_WORKFLOW_MAPPINGS[eventType as keyof typeof CLERK_EVENT_TO_WORKFLOW_MAPPINGS];

  if (!mapping) return undefined;

  // Handle email events with slugs
  if (eventType === 'email.created' && eventData?.slug && typeof mapping === 'object') {
    return mapping[eventData.slug as keyof typeof mapping];
  }

  return typeof mapping === 'string' ? mapping : undefined;
}

/**
 * Get workflow ID from Stripe event type
 * @param eventType - Stripe webhook event type
 * @returns Workflow ID or undefined if not mapped
 */
export function getWorkflowFromStripeEvent(eventType: string): string | undefined {
  return STRIPE_EVENT_TO_WORKFLOW_MAPPINGS[
    eventType as keyof typeof STRIPE_EVENT_TO_WORKFLOW_MAPPINGS
  ];
}
