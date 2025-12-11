// Manual mock for lib/novu-utils.ts - Vitest compatible
// Mirror: lib/novu-utils.ts exports triggerNovuWorkflow, not a `novuUtils` object
import { vi } from 'vitest';

export async function triggerNovuWorkflow(): Promise<{ success: true }> {
  return { success: true };
}

export const buildNovuSubscriberFromClerk = vi.fn().mockReturnValue({
  subscriberId: 'test-user-id',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  locale: 'en_US',
  data: {
    clerkUserId: 'test-user-id',
    username: 'testuser',
    hasPublicMetadata: false,
    hasUnsafeMetadata: false,
  },
});

export const buildNovuSubscriberFromStripe = vi.fn().mockReturnValue({
  subscriberId: 'cus_test123',
  email: 'customer@example.com',
  firstName: 'Test',
  lastName: 'Customer',
  locale: 'en',
  data: {
    stripeCustomerId: 'cus_test123',
    hasCustomerMetadata: false,
  },
});

export const CLERK_EVENT_TO_WORKFLOW_MAPPINGS = {
  'user.created': 'user-lifecycle',
  'user.updated': 'user-lifecycle',
  'user.deleted': 'user-lifecycle',
  'session.created': 'security-auth',
  'session.ended': 'security-auth',
  'email.created': {
    magic_link_sign_in: 'security-auth',
    magic_link_sign_up: 'user-lifecycle',
    reset_password_code: 'security-auth',
    verification_code: 'security-auth',
  },
} as const;

export const STRIPE_EVENT_TO_WORKFLOW_MAPPINGS = {
  'payment_intent.succeeded': 'payment-universal',
  'payment_intent.payment_failed': 'payment-universal',
  'charge.refunded': 'payment-universal',
  'customer.subscription.created': 'payment-universal',
  'customer.subscription.updated': 'payment-universal',
  'customer.subscription.deleted': 'payment-universal',
  'invoice.payment_succeeded': 'payment-universal',
  'invoice.payment_failed': 'payment-universal',
  'charge.dispute.created': 'payment-universal',
  'account.updated': 'expert-management',
  'capability.updated': 'expert-management',
} as const;

export const getWorkflowFromClerkEvent = vi.fn().mockReturnValue('user-lifecycle');

export const getWorkflowFromStripeEvent = vi.fn().mockReturnValue('payment-universal');
