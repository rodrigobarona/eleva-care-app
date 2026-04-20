/**
 * Novu Workflow ID Constants
 *
 * This file contains all workflow IDs used in the application.
 * These MUST match the workflow IDs defined in config/novu.ts
 *
 * Usage:
 * import { WORKFLOW_IDS } from '@/config/novu-workflows';
 * await triggerWorkflow({ workflowId: WORKFLOW_IDS.PAYOUT_NOTIFICATION, ... });
 */

/**
 * Every entry MUST correspond to a `workflow(...)` definition in
 * `config/novu.ts`. Adding an ID here without a matching workflow
 * implementation is a no-op trigger at runtime — `triggerWorkflow` will
 * succeed but nothing fires.
 *
 * Removed in 2026-04 audit (no workflow implementation, no callers):
 *   - USER_LOGIN_NOTIFICATION ('user-login-notification')
 *   - PAYMENT_SUCCESS ('payment-success') — payments go through PAYMENT_UNIVERSAL
 *   - PAYMENT_FAILED ('payment-failed')   — same as above
 *   - APPOINTMENT_REMINDER_24HR ('appointment-reminder-24hr')
 *     — reminders go through APPOINTMENT_UNIVERSAL with eventType 'reminder'
 *   - EXPERT_ACCOUNT_UPDATED ('expert-account-updated')
 *     — expert account events go through EXPERT_MANAGEMENT with notificationType 'account-update'
 */
export const WORKFLOW_IDS = {
  // User & Authentication
  // NOTE: user-lifecycle handles welcome emails with idempotency via welcomeEmailSentAt field
  // Only triggers on user.created event and checks database before sending
  USER_LIFECYCLE: 'user-lifecycle', // Includes welcome email (idempotent via UserTable.welcomeEmailSentAt)
  SECURITY_AUTH: 'security-auth',

  // DEPRECATED: Use USER_LIFECYCLE instead - kept for backwards compatibility
  USER_WELCOME: 'user-lifecycle', // Maps to USER_LIFECYCLE (same workflow ID)

  // Payments & Payouts
  PAYMENT_UNIVERSAL: 'payment-universal',
  EXPERT_PAYOUT_NOTIFICATION: 'expert-payout-notification',

  // Appointments
  APPOINTMENT_UNIVERSAL: 'appointment-universal',
  APPOINTMENT_CONFIRMATION: 'appointment-confirmation',

  // Multibanco Payments
  MULTIBANCO_BOOKING_PENDING: 'multibanco-booking-pending',
  MULTIBANCO_PAYMENT_REMINDER: 'multibanco-payment-reminder',

  // Pack Purchases
  PACK_PURCHASE_CONFIRMATION: 'pack-purchase-confirmation',

  // Reservations
  RESERVATION_EXPIRED: 'reservation-expired',

  // Expert Management
  EXPERT_MANAGEMENT: 'expert-management',

  // Marketplace
  MARKETPLACE_UNIVERSAL: 'marketplace-universal',

  // System Health
  SYSTEM_HEALTH: 'system-health',
} as const;

/**
 * Type for workflow IDs - ensures only valid workflow IDs can be used
 */
export type WorkflowId = (typeof WORKFLOW_IDS)[keyof typeof WORKFLOW_IDS];

/**
 * Mapping from old/inconsistent workflow IDs to new standardized ones
 * Use this to migrate existing code gradually
 *
 * NOTE: user-welcome is DEPRECATED - it maps to user-lifecycle
 * The user-lifecycle workflow has built-in idempotency via UserTable.welcomeEmailSentAt
 */
export const WORKFLOW_ID_MAPPINGS = {
  // Old ID -> New standardized ID
  'health-check-failure': WORKFLOW_IDS.SYSTEM_HEALTH,
  'appointment-reminder': WORKFLOW_IDS.APPOINTMENT_UNIVERSAL,
  'appointment-reminder-24hr': WORKFLOW_IDS.APPOINTMENT_UNIVERSAL,
  'user-created': WORKFLOW_IDS.USER_LIFECYCLE,
  // Recent-login notifications now ride on `security-auth` (with
  // eventType: 'recent-login') rather than a dedicated workflow.
  'recent-login-v2': WORKFLOW_IDS.SECURITY_AUTH,
  'user-login-notification': WORKFLOW_IDS.SECURITY_AUTH,
  // Expert account updates now ride on `expert-management` with
  // notificationType: 'account-update'.
  'expert-account-updated': WORKFLOW_IDS.EXPERT_MANAGEMENT,
  // Payment success/failure events now ride on the universal payment
  // workflow with eventType: 'success' / 'failed'.
  'payment-success': WORKFLOW_IDS.PAYMENT_UNIVERSAL,
  'payment-failed': WORKFLOW_IDS.PAYMENT_UNIVERSAL,
  'user-welcome': WORKFLOW_IDS.USER_LIFECYCLE, // DEPRECATED: Maps to user-lifecycle
} as const;

/**
 * Validate that a workflow ID is valid
 */
export function isValidWorkflowId(id: string): id is WorkflowId {
  return Object.values(WORKFLOW_IDS).includes(id as WorkflowId);
}

/**
 * Get all workflow IDs as an array
 */
export function getAllWorkflowIds(): WorkflowId[] {
  return Object.values(WORKFLOW_IDS);
}

/**
 * Get the correct workflow ID, handling legacy mappings
 */
export function getStandardWorkflowId(workflowId: string): WorkflowId | undefined {
  // Check if it's already a standard ID
  if (Object.values(WORKFLOW_IDS).includes(workflowId as WorkflowId)) {
    return workflowId as WorkflowId;
  }

  // Check legacy mappings
  return WORKFLOW_ID_MAPPINGS[workflowId as keyof typeof WORKFLOW_ID_MAPPINGS];
}

/**
 * Workflow categories for organization
 *
 * NOTE: USER_WELCOME is deprecated and maps to USER_LIFECYCLE
 * All welcome emails use USER_LIFECYCLE with idempotency tracking
 */
export const WORKFLOW_CATEGORIES = {
  AUTH: [
    WORKFLOW_IDS.USER_LIFECYCLE, // Handles welcome emails (idempotent)
    WORKFLOW_IDS.SECURITY_AUTH,
    // USER_WELCOME is deprecated - use USER_LIFECYCLE
  ],
  PAYMENTS: [
    WORKFLOW_IDS.PAYMENT_UNIVERSAL,
    WORKFLOW_IDS.EXPERT_PAYOUT_NOTIFICATION,
    WORKFLOW_IDS.MULTIBANCO_BOOKING_PENDING,
    WORKFLOW_IDS.MULTIBANCO_PAYMENT_REMINDER,
    WORKFLOW_IDS.PACK_PURCHASE_CONFIRMATION,
    WORKFLOW_IDS.RESERVATION_EXPIRED,
  ],
  APPOINTMENTS: [WORKFLOW_IDS.APPOINTMENT_UNIVERSAL, WORKFLOW_IDS.APPOINTMENT_CONFIRMATION],
  EXPERTS: [WORKFLOW_IDS.EXPERT_MANAGEMENT, WORKFLOW_IDS.MARKETPLACE_UNIVERSAL],
  SYSTEM: [WORKFLOW_IDS.SYSTEM_HEALTH],
} as const;
