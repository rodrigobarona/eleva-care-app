/**
 * Novu Integration Module
 *
 * Provides a unified interface for Novu notifications, email service,
 * and workflow triggers.
 *
 * @example
 * ```typescript
 * // Modern API (recommended)
 * import { triggerWorkflow, updateSubscriber } from '@/lib/integrations/novu';
 *
 * await triggerWorkflow({
 *   workflowId: 'booking-confirmation',
 *   to: { subscriberId: 'user_123', email: 'user@example.com' },
 *   payload: { appointmentDate: '2024-01-15' },
 * });
 *
 * // Legacy API (still supported)
 * import { triggerNovuWorkflow } from '@/lib/integrations/novu';
 *
 * await triggerNovuWorkflow(
 *   'booking-confirmation',
 *   { subscriberId: 'user_123' },
 *   { appointmentDate: '2024-01-15' }
 * );
 * ```
 */

// Email service exports
export * from './email-service';

// Utils exports - Modern API
export {
  // Primary workflow trigger (modern API - recommended)
  triggerWorkflow,
  // Legacy workflow trigger (still supported)
  triggerNovuWorkflow,
  // Subscriber management
  updateSubscriber,
  // Stripe payload transformation
  transformStripePayloadForNovu,
  // Diagnostics and health checks
  getNovuStatus,
  runNovuDiagnostics,
  // Novu client (for advanced usage)
  novu,
  // Subscriber builders
  buildNovuSubscriberFromClerk,
  buildNovuSubscriberFromStripe,
  // Workflow mappings
  getWorkflowFromClerkEvent,
  getWorkflowFromStripeEvent,
  CLERK_EVENT_TO_WORKFLOW_MAPPINGS,
  STRIPE_EVENT_TO_WORKFLOW_MAPPINGS,
} from './utils';

// Type exports
export type { StripeWebhookPayload, TriggerWorkflowOptions } from './utils';
