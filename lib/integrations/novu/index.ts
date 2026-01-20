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
  // Primary workflow trigger function (consolidated)
  triggerWorkflow,
  // Legacy function for backward compatibility
  triggerNovuWorkflow,
  // Subscriber management
  updateSubscriber,
  // Subscriber builders
  buildNovuSubscriberFromClerk,
  buildNovuSubscriberFromStripe,
  // Event to workflow mappers
  getWorkflowFromClerkEvent,
  getWorkflowFromStripeEvent,
  // Stripe payload transformation
  transformStripePayloadForNovu,
  // Diagnostics
  getNovuStatus,
  runNovuDiagnostics,
  // Novu client (for advanced usage)
  novu,
  // Constants
  CLERK_EVENT_TO_WORKFLOW_MAPPINGS,
  STRIPE_EVENT_TO_WORKFLOW_MAPPINGS,
} from './utils';

// Type exports
export type { StripeWebhookPayload, TriggerWorkflowOptions } from './utils';
