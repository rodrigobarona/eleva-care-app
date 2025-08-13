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

export const WORKFLOW_IDS = {
  // User & Authentication
  USER_LIFECYCLE: 'user-lifecycle',
  SECURITY_AUTH: 'security-auth',

  // Payments & Payouts
  PAYMENT_UNIVERSAL: 'payment-universal',
  EXPERT_PAYOUT_NOTIFICATION: 'expert-payout-notification',

  // Appointments
  APPOINTMENT_UNIVERSAL: 'appointment-universal',
  APPOINTMENT_CONFIRMATION: 'appointment-confirmation',
  APPOINTMENT_REMINDER_24HR: 'appointment-reminder-24hr',

  // Multibanco Payments
  MULTIBANCO_BOOKING_PENDING: 'multibanco-booking-pending',
  MULTIBANCO_PAYMENT_REMINDER: 'multibanco-payment-reminder',

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
 * Validate that a workflow ID is valid
 */
export function isValidWorkflowId(id: string): id is WorkflowId {
  return Object.values(WORKFLOW_IDS).includes(id as WorkflowId);
}

/**
 * Get all available workflow IDs
 */
export function getAllWorkflowIds(): WorkflowId[] {
  return Object.values(WORKFLOW_IDS);
}

/**
 * Workflow categories for organization
 */
export const WORKFLOW_CATEGORIES = {
  AUTH: [WORKFLOW_IDS.USER_LIFECYCLE, WORKFLOW_IDS.SECURITY_AUTH],
  PAYMENTS: [
    WORKFLOW_IDS.PAYMENT_UNIVERSAL,
    WORKFLOW_IDS.EXPERT_PAYOUT_NOTIFICATION,
    WORKFLOW_IDS.MULTIBANCO_BOOKING_PENDING,
    WORKFLOW_IDS.MULTIBANCO_PAYMENT_REMINDER,
  ],
  APPOINTMENTS: [
    WORKFLOW_IDS.APPOINTMENT_UNIVERSAL,
    WORKFLOW_IDS.APPOINTMENT_CONFIRMATION,
    WORKFLOW_IDS.APPOINTMENT_REMINDER_24HR,
  ],
  EXPERTS: [WORKFLOW_IDS.EXPERT_MANAGEMENT, WORKFLOW_IDS.MARKETPLACE_UNIVERSAL],
  SYSTEM: [WORKFLOW_IDS.SYSTEM_HEALTH],
} as const;
