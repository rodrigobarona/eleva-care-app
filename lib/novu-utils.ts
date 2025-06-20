import { Novu } from '@novu/api';
import { SubscriberPayloadDto } from '@novu/api/models/components/subscriberpayloaddto';

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY!,
});

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
  try {
    console.log('🔔 Triggering Novu workflow:', {
      workflowId,
      subscriberId: subscriber.subscriberId,
      payload: Object.keys(payload),
    });

    await novu.trigger({
      workflowId,
      to: subscriber,
      payload,
    });

    console.log('✅ Successfully triggered Novu workflow:', workflowId);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to trigger Novu workflow:', {
      workflowId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { success: false, error };
  }
}

interface ClerkUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email_addresses?: Array<{ email_address: string }>;
  email?: string;
  phone_numbers?: Array<{ phone_number: string }>;
  image_url?: string;
  username?: string;
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
    firstName: user.first_name || undefined,
    lastName: user.last_name || undefined,
    email: user.email_addresses?.[0]?.email_address || user.email || undefined,
    phone: user.phone_numbers?.[0]?.phone_number || undefined,
    locale: 'en_US', // Can be enhanced with user preferences
    avatar: user.image_url || undefined,
    data: {
      clerkUserId: user.id,
      username: user.username || '',
      publicMetadata: user.public_metadata || {},
      unsafeMetadata: user.unsafe_metadata || {},
    },
  };
}

interface StripeCustomer {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  preferred_locales?: string[];
  metadata?: Record<string, string>;
}

/**
 * Build subscriber data from Stripe customer data
 * @param customer - Stripe customer object
 * @returns Formatted subscriber data for Novu
 */
export function buildNovuSubscriberFromStripe(customer: StripeCustomer): SubscriberPayloadDto {
  // Split the full name into first and last name
  const [firstName = '', lastName = ''] = (customer.name || '').split(' ');

  return {
    subscriberId: customer.id,
    email: customer.email || undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    phone: customer.phone || undefined,
    locale: customer.preferred_locales?.[0] || 'en',
    avatar: undefined, // Stripe doesn't provide avatar
    data: {
      stripeCustomerId: customer.id,
      customerMetadata: customer.metadata || {},
    },
  };
}

/**
 * Mapping of Clerk events to Novu workflow IDs
 */
export const CLERK_EVENT_TO_WORKFLOW_MAPPINGS = {
  // User lifecycle events
  'user.created': 'user-welcome',
  'user.updated': 'user-profile-updated',
  'user.deleted': 'user-account-deleted',

  // Session events
  'session.created': 'user-login-notification',
  'session.ended': 'user-logout-notification',

  // Email events (if you want to track these)
  'email.created': {
    magic_link_sign_in: 'auth-magic-link-login',
    magic_link_sign_up: 'auth-magic-link-registration',
    reset_password_code: 'password-reset-notification',
    verification_code: 'email-verification-notification',
  },
} as const;

/**
 * Mapping of Stripe events to Novu workflow IDs
 */
export const STRIPE_EVENT_TO_WORKFLOW_MAPPINGS = {
  // Payment events
  'payment_intent.succeeded': 'payment-success',
  'payment_intent.payment_failed': 'payment-failed',
  'charge.refunded': 'payment-refunded',

  // Subscription events
  'customer.subscription.created': 'subscription-created',
  'customer.subscription.updated': 'subscription-updated',
  'customer.subscription.deleted': 'subscription-cancelled',

  // Invoice events
  'invoice.payment_succeeded': 'invoice-paid',
  'invoice.payment_failed': 'invoice-payment-failed',

  // Dispute events
  'charge.dispute.created': 'payment-dispute-created',

  // Connect account events
  'account.updated': 'expert-account-updated',
  'capability.updated': 'expert-capability-updated',
} as const;

interface ClerkEventData {
  slug?: string;
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
