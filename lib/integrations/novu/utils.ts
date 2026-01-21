import { ENV_CONFIG } from '@/config/env';
import { Novu } from '@novu/api';
import { SubscriberPayloadDto } from '@novu/api/models/components/subscriberpayloaddto';

// Initialize Novu client with proper error handling
let novu: Novu | null = null;
let initializationError: string | null = null;

/**
 * Options for triggering a Novu workflow
 * Modern interface following latest documentation patterns
 */
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
  payload?: Record<string, unknown>;
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
  /**
   * Unique transaction ID for idempotency
   * If provided, Novu will deduplicate triggers with the same transactionId
   * Use this to prevent duplicate emails from webhook retries
   */
  transactionId?: string;
}

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
 *
 * @example
 * ```typescript
 * const result = await triggerNovuWorkflow(
 *   'welcome-email',
 *   { subscriberId: 'user_123', email: 'user@example.com', firstName: 'John' },
 *   { welcomeMessage: 'Hello!' }
 * );
 * if (result.success) console.log('Workflow triggered');
 * ```
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

/**
 * Trigger a Novu workflow using the latest API
 * This is the primary function for triggering workflows throughout the app.
 * Following @novu/api best practices from documentation
 *
 * @param options - Workflow trigger options including subscriber and payload
 * @returns Result object or null if failed
 *
 * @example
 * ```typescript
 * const result = await triggerWorkflow({
 *   workflowId: 'booking-confirmation',
 *   to: { subscriberId: 'user_123', email: 'user@example.com' },
 *   payload: { appointmentDate: '2024-01-15', expertName: 'Dr. Smith' },
 * });
 * ```
 */
export async function triggerWorkflow(options: TriggerWorkflowOptions) {
  if (!novu) {
    const errorMsg = `[Novu Utils] Cannot trigger workflow ${options.workflowId}: ${initializationError || 'client not initialized'}`;
    console.error(errorMsg);
    console.error(
      '[Novu Utils] 🔧 Check environment variables: NOVU_SECRET_KEY, NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER',
    );
    return null;
  }

  try {
    console.log(`[Novu Utils] Triggering workflow: ${options.workflowId}`, {
      subscriberId: options.to.subscriberId,
      hasPayload: !!options.payload,
      payloadKeys: options.payload ? Object.keys(options.payload) : [],
      transactionId: options.transactionId,
    });

    const result = await novu.trigger({
      workflowId: options.workflowId,
      to: options.to,
      payload: options.payload || {},
      overrides: options.overrides,
      actor: options.actor,
      // Idempotency: If transactionId is provided, Novu will deduplicate
      ...(options.transactionId && { transactionId: options.transactionId }),
    });

    console.log(`[Novu Utils] ✅ Successfully triggered workflow: ${options.workflowId}`);
    return result;
  } catch (error) {
    console.error(`[Novu Utils] ❌ Failed to trigger workflow ${options.workflowId}:`, error);

    // Provide specific error guidance
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const errorWithStatus = error as { statusCode: number };
      if (errorWithStatus.statusCode === 401) {
        console.error(
          '[Novu Utils] 🔑 Authentication error - check NOVU_SECRET_KEY environment variable',
        );
      }
    }

    return null;
  }
}

/**
 * Create or update a subscriber using modern API
 * Synchronizes user profile data with Novu following best practices
 *
 * @param subscriber - Subscriber data to create or update
 * @returns Result object or null if failed
 *
 * @example
 * ```typescript
 * await updateSubscriber({
 *   subscriberId: 'user_123',
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   lastName: 'Doe',
 * });
 * ```
 */
export async function updateSubscriber(subscriber: TriggerWorkflowOptions['to']) {
  // Check for either NOVU_SECRET_KEY or legacy NOVU_API_KEY
  const hasValidKey = ENV_CONFIG.NOVU_SECRET_KEY || ENV_CONFIG.NOVU_API_KEY;
  if (!novu || !hasValidKey) {
    console.warn(
      '[Novu Utils] Cannot update subscriber: client not initialized or missing NOVU_SECRET_KEY/NOVU_API_KEY',
    );
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

    console.log(`[Novu Utils] Subscriber updated: ${subscriber.subscriberId}`);
    return result;
  } catch (error) {
    console.error('[Novu Utils] Error updating subscriber:', error);
    return null;
  }
}

/**
 * Get Novu client status and configuration for diagnostics
 *
 * @returns Object containing initialization status and configuration details
 *
 * @example
 * ```typescript
 * const status = getNovuStatus();
 * if (!status.initialized) {
 *   console.error('Novu not initialized:', status.initializationError);
 * }
 * ```
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

/**
 * Comprehensive Novu health monitoring and diagnostics
 * Use this function to diagnose Novu configuration issues
 *
 * @returns Diagnostics object with client status, workflows, errors, and recommendations
 *
 * @example
 * ```typescript
 * const diagnostics = await runNovuDiagnostics();
 * if (!diagnostics.summary.healthy) {
 *   console.error('Issues found:', diagnostics.errors);
 * }
 * ```
 */
export async function runNovuDiagnostics() {
  console.log('\n🔍 Starting Novu Comprehensive Diagnostics...\n');

  const diagnostics = {
    client: getNovuStatus(),
    workflows: [] as Array<{ id: string; status: string; timestamp: string }>,
    errors: [] as string[],
    recommendations: [] as string[],
    summary: {
      healthy: true,
      criticalErrors: 0,
      warnings: 0,
    },
  };

  // 1. Test client initialization
  console.log('1️⃣ Testing Client Initialization');
  if (!diagnostics.client.initialized) {
    diagnostics.errors.push(`Client not initialized: ${diagnostics.client.initializationError}`);
    diagnostics.recommendations.push('Check NOVU_SECRET_KEY environment variable');
    diagnostics.summary.criticalErrors++;
  } else {
    console.log('   ✅ Client initialized successfully');
  }

  // 2. Test workflow trigger capability
  console.log('\n2️⃣ Testing Workflow Trigger Capability');
  const testWorkflowId = 'system-health';
  const testSubscriber = {
    subscriberId: ENV_CONFIG.NOVU_ADMIN_SUBSCRIBER_ID || 'test-admin',
    email: 'admin@eleva.care',
    firstName: 'System',
    lastName: 'Admin',
  };

  try {
    const testPayload = {
      eventType: 'health-check-diagnostics',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: ENV_CONFIG.NODE_ENV,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        percentage: Math.round(
          (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
        ),
      },
    };

    const result = await triggerWorkflow({
      workflowId: testWorkflowId,
      to: testSubscriber,
      payload: testPayload,
    });

    if (result) {
      console.log('   ✅ Test workflow trigger succeeded');
      diagnostics.workflows.push({
        id: testWorkflowId,
        status: 'success',
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log('   ❌ Test workflow trigger failed');
      diagnostics.errors.push('Test workflow trigger returned null');
      diagnostics.summary.criticalErrors++;
    }
  } catch (error) {
    console.log('   ❌ Test workflow trigger threw error:', error);
    diagnostics.errors.push(`Test workflow error: ${error}`);
    diagnostics.summary.criticalErrors++;
  }

  // 3. Environment variable validation
  console.log('\n3️⃣ Environment Variable Validation');
  const envChecks = [
    { name: 'NOVU_SECRET_KEY', value: !!ENV_CONFIG.NOVU_SECRET_KEY, critical: true },
    {
      name: 'NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER',
      value: !!ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER,
      critical: true,
    },
    { name: 'NOVU_BASE_URL', value: !!ENV_CONFIG.NOVU_BASE_URL, critical: false },
    {
      name: 'NOVU_ADMIN_SUBSCRIBER_ID',
      value: !!ENV_CONFIG.NOVU_ADMIN_SUBSCRIBER_ID,
      critical: false,
    },
  ];

  envChecks.forEach((check) => {
    if (check.value) {
      console.log(`   ✅ ${check.name} is set`);
    } else {
      console.log(`   ${check.critical ? '❌' : '⚠️'} ${check.name} is missing`);
      if (check.critical) {
        diagnostics.errors.push(`Missing critical environment variable: ${check.name}`);
        diagnostics.summary.criticalErrors++;
      } else {
        diagnostics.recommendations.push(`Consider setting ${check.name} for better functionality`);
        diagnostics.summary.warnings++;
      }
    }
  });

  // 4. Bridge endpoint check (opt-in, requires running application)
  console.log('\n4️⃣ Bridge Endpoint Check');
  const skipBridgeCheck = process.env.SKIP_NOVU_BRIDGE_CHECK === 'true';

  if (skipBridgeCheck) {
    console.log('   ⚠️ Bridge check skipped (SKIP_NOVU_BRIDGE_CHECK=true)');
    diagnostics.recommendations.push(
      'Bridge endpoint check was skipped. Run with SKIP_NOVU_BRIDGE_CHECK=false to verify the /api/novu endpoint.',
    );
    diagnostics.summary.warnings++;
  } else {
    try {
      const baseUrl = ENV_CONFIG.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const bridgeUrl = `${baseUrl}/api/novu`;

      const bridgeResponse = await fetch(bridgeUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (bridgeResponse.ok) {
        console.log('   ✅ Bridge endpoint is accessible');
      } else {
        console.log(`   ⚠️ Bridge endpoint returned ${bridgeResponse.status}`);
        diagnostics.recommendations.push('Check /api/novu bridge endpoint configuration');
        diagnostics.summary.warnings++;
      }
    } catch (error) {
      console.log('   ⚠️ Bridge endpoint check failed:', error);
      diagnostics.recommendations.push(
        'Bridge endpoint check failed. Ensure the application is running before running diagnostics, or set SKIP_NOVU_BRIDGE_CHECK=true to skip this check.',
      );
      diagnostics.summary.warnings++;
    }
  }

  // 5. Summary and recommendations
  console.log('\n📊 Diagnostics Summary');
  console.log(
    `   Status: ${diagnostics.summary.criticalErrors === 0 ? '✅ Healthy' : '❌ Issues Found'}`,
  );
  console.log(`   Critical Errors: ${diagnostics.summary.criticalErrors}`);
  console.log(`   Warnings: ${diagnostics.summary.warnings}`);

  if (diagnostics.errors.length > 0) {
    console.log('\n🚨 Critical Issues:');
    diagnostics.errors.forEach((err) => console.log(`   • ${err}`));
  }

  if (diagnostics.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    diagnostics.recommendations.forEach((rec) => console.log(`   • ${rec}`));
  }

  diagnostics.summary.healthy = diagnostics.summary.criticalErrors === 0;
  return diagnostics;
}

// Export client for advanced usage if needed
export { novu };

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
 *
 * @example
 * ```typescript
 * const subscriber = buildNovuSubscriberFromClerk({
 *   id: 'user_abc123',
 *   first_name: 'Jane',
 *   last_name: 'Doe',
 *   email_addresses: [{ email_address: 'jane@example.com' }],
 * });
 * // Returns: { subscriberId: 'user_abc123', firstName: 'Jane', ... }
 * ```
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
 *
 * @example
 * ```typescript
 * const subscriber = buildNovuSubscriberFromStripe({
 *   id: 'cus_xyz789',
 *   name: 'John Smith',
 *   email: 'john@example.com',
 * });
 * // Returns: { subscriberId: 'cus_xyz789', firstName: 'John', lastName: 'Smith', ... }
 * ```
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
 *
 * NOTE: payment_intent.succeeded is NOT mapped here because the confirmation email
 * is sent directly via Resend in handlePaymentSucceeded() to avoid duplicate emails.
 * The direct Resend email uses appointment-confirmation.tsx with full appointment details.
 */
export const STRIPE_EVENT_TO_WORKFLOW_MAPPINGS = {
  // Payment events - use universal workflow with eventType
  // NOTE: payment_intent.succeeded removed - email sent directly via Resend in handlePaymentSucceeded()
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

/**
 * Stripe event type → Novu payment-universal workflow eventType
 * Maps raw Stripe event types to the values expected by paymentWorkflow schema
 *
 * NOTE: payment_intent.succeeded is NOT mapped here because the confirmation email
 * is sent directly via Resend in handlePaymentSucceeded() to avoid duplicate emails.
 */
const STRIPE_TO_PAYMENT_EVENT_TYPE: Record<string, string> = {
  // NOTE: payment_intent.succeeded removed - email sent directly via Resend
  'payment_intent.payment_failed': 'failed',
  'charge.refunded': 'refunded',
  'checkout.session.completed': 'confirmed',
  'customer.subscription.created': 'confirmed',
  'customer.subscription.updated': 'confirmed',
  'customer.subscription.deleted': 'cancelled',
  'invoice.payment_succeeded': 'success',
  'invoice.payment_failed': 'failed',
  'charge.dispute.created': 'disputed',
};

/**
 * Stripe event type → Novu expert-management workflow notificationType
 * Maps raw Stripe event types to the values expected by expertManagementWorkflow schema
 */
const STRIPE_TO_EXPERT_NOTIFICATION_TYPE: Record<string, string> = {
  'account.updated': 'account-update',
  'capability.updated': 'account-update',
  'payout.paid': 'payout-processed',
  'payout.failed': 'account-update',
};

export interface ClerkEventData {
  slug?: string;
  id?: string;
  [key: string]: unknown;
}

/**
 * Appointment details extracted from Stripe metadata
 * Used for payment confirmation emails
 */
export interface AppointmentDetails {
  service: string;
  expert: string;
  // Patient-formatted (for patient emails)
  date: string;
  time: string;
  // Expert-formatted (for expert emails)
  expertDate?: string;
  expertTime?: string;
  // Common fields
  duration?: string;
  patientTimezone?: string;
  expertTimezone?: string;
  notes?: string;
}

/**
 * Raw Stripe webhook payload structure
 * Used as input for transformStripePayloadForNovu
 */
export interface StripeWebhookPayload {
  eventType: string;
  eventId: string;
  eventData: Record<string, unknown>;
  timestamp: number;
  source: string;
  amount?: number;
  currency?: string;
  /** Appointment details extracted from payment metadata */
  appointmentDetails?: AppointmentDetails;
}

/**
 * Get workflow ID from Clerk event type
 * @param eventType - Clerk webhook event type
 * @param eventData - Event data for email events with slugs
 * @returns Workflow ID or undefined if not mapped
 *
 * @example
 * ```typescript
 * const workflowId = getWorkflowFromClerkEvent('user.created');
 * // Returns: 'user-lifecycle'
 *
 * const emailWorkflow = getWorkflowFromClerkEvent('email.created', { slug: 'magic_link_sign_in' });
 * // Returns: 'security-auth'
 * ```
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
 *
 * @example
 * ```typescript
 * const workflowId = getWorkflowFromStripeEvent('payment_intent.succeeded');
 * // Returns: 'payment-universal'
 * ```
 */
export function getWorkflowFromStripeEvent(eventType: string): string | undefined {
  return STRIPE_EVENT_TO_WORKFLOW_MAPPINGS[
    eventType as keyof typeof STRIPE_EVENT_TO_WORKFLOW_MAPPINGS
  ];
}

/**
 * Transform raw Stripe webhook payload to Novu workflow-compatible format
 *
 * This function converts Stripe event data to match the expected schema
 * for each Novu workflow, handling:
 * - Event type mapping (e.g., 'payment_intent.succeeded' → 'success')
 * - Amount formatting (cents to formatted string: 7000 → "70.00")
 * - Required field extraction (customerName, expertName, etc.)
 *
 * @param workflowId - The target Novu workflow ID
 * @param stripePayload - Raw Stripe webhook payload
 * @param customer - Stripe customer object (for name/locale extraction)
 * @returns Transformed payload matching the target workflow schema
 *
 * @example
 * ```typescript
 * const payload = transformStripePayloadForNovu(
 *   'payment-universal',
 *   { eventType: 'payment_intent.succeeded', amount: 7000, ... },
 *   customer
 * );
 * // Returns: { eventType: 'success', amount: '70.00', customerName: 'John Doe', ... }
 * ```
 */
export function transformStripePayloadForNovu(
  workflowId: string,
  stripePayload: StripeWebhookPayload,
  customer: StripeCustomer | null,
): Record<string, unknown> {
  // Base payload with debugging info and locale
  const basePayload = {
    _stripeEventType: stripePayload.eventType,
    _stripeEventId: stripePayload.eventId,
    _timestamp: stripePayload.timestamp,
    locale: customer?.preferred_locales?.[0] || 'en',
  };

  switch (workflowId) {
    case 'payment-universal':
      return {
        ...basePayload,
        eventType: STRIPE_TO_PAYMENT_EVENT_TYPE[stripePayload.eventType] || 'pending',
        amount: ((stripePayload.amount || 0) / 100).toFixed(2),
        currency: (stripePayload.currency || 'eur').toUpperCase(),
        customerName: customer?.name || 'Customer',
        transactionId: String(stripePayload.eventData?.id || stripePayload.eventId),
        // Include appointment details if available (extracted from payment metadata)
        appointmentDetails: stripePayload.appointmentDetails,
      };

    case 'expert-management':
      return {
        ...basePayload,
        notificationType:
          STRIPE_TO_EXPERT_NOTIFICATION_TYPE[stripePayload.eventType] || 'account-update',
        expertName: customer?.name || 'Expert',
        amount: stripePayload.amount ? (stripePayload.amount / 100).toFixed(2) : undefined,
        currency: (stripePayload.currency || 'eur').toUpperCase(),
        message: `Account update: ${stripePayload.eventType}`,
      };

    default:
      // Passthrough for unmapped workflows - preserve original data
      return {
        ...basePayload,
        ...stripePayload,
      };
  }
}
