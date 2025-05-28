/**
 * Audit Event Types
 *
 * This file defines all audit event types used throughout the application
 * for consistent logging and potential future type validation.
 */

export type AuditEventType =
  // Medical Records
  | 'CREATE_MEDICAL_RECORD'
  | 'READ_MEDICAL_RECORDS_FOR_MEETING'
  | 'UPDATE_MEDICAL_RECORD'
  | 'FAILED_CREATE_MEDICAL_RECORD'
  | 'FAILED_CREATE_MEDICAL_RECORD_UNAUTHORIZED'
  | 'FAILED_READ_MEDICAL_RECORDS'
  | 'FAILED_READ_MEDICAL_RECORDS_UNAUTHORIZED'
  | 'FAILED_UPDATE_MEDICAL_RECORD'
  | 'FAILED_UPDATE_MEDICAL_RECORD_UNAUTHORIZED'

  // Payment & Meeting Events
  | 'MEETING_PAYMENT_FAILED'
  | 'MULTIBANCO_EXPIRY_RISK'

  // Event Management
  | 'EVENT_CREATED'
  | 'EVENT_UPDATED'
  | 'EVENT_DELETED'

  // Meeting Management
  | 'MEETING_CREATED'
  | 'MEETING_UPDATED'
  | 'MEETING_CANCELLED'

  // Schedule Management
  | 'SCHEDULE_UPDATED'
  | 'BLOCKED_DATE_ADDED'
  | 'BLOCKED_DATE_REMOVED'

  // Generic failure patterns for future use
  | 'FAILED_OPERATION'
  | 'FAILED_OPERATION_UNAUTHORIZED'
  | 'SYSTEM_ERROR';

/**
 * Audit Resource Types
 *
 * Defines the types of resources that can be audited
 */
export type AuditResourceType =
  | 'medical_record'
  | 'meeting'
  | 'event'
  | 'schedule'
  | 'payment_intent'
  | 'user'
  | 'system';

/**
 * Type for audit event metadata
 */
export type AuditEventMetadata = Record<string, unknown> | string;

/**
 * Interface for audit log entry
 */
export interface AuditLogEntry {
  clerkUserId: string;
  action: AuditEventType;
  resourceType: AuditResourceType;
  resourceId: string;
  oldValues: Record<string, unknown> | null;
  newValues: AuditEventMetadata;
  ipAddress: string;
  userAgent: string;
}
