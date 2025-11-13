/**
 * Novu Integration Module
 *
 * Provides a unified interface for Novu notifications, email service,
 * and workflow triggers.
 */

// Email service exports
export * from './email-service';

// Utils exports
export {
  triggerNovuWorkflow,
  buildNovuSubscriberFromClerk,
  buildNovuSubscriberFromStripe,
  getWorkflowFromClerkEvent,
  getWorkflowFromStripeEvent,
  CLERK_EVENT_TO_WORKFLOW_MAPPINGS,
  STRIPE_EVENT_TO_WORKFLOW_MAPPINGS,
} from './utils';
