/**
 * Audit Event Types
 *
 * This file defines all audit event types used throughout the application
 * for consistent logging and potential future type validation.
 */

// Individual Audit Event Constants
// Medical Records
export const CREATE_MEDICAL_RECORD = 'CREATE_MEDICAL_RECORD' as const;
export const READ_MEDICAL_RECORDS_FOR_MEETING = 'READ_MEDICAL_RECORDS_FOR_MEETING' as const;
export const UPDATE_MEDICAL_RECORD = 'UPDATE_MEDICAL_RECORD' as const;
export const FAILED_CREATE_MEDICAL_RECORD = 'FAILED_CREATE_MEDICAL_RECORD' as const;
export const FAILED_CREATE_MEDICAL_RECORD_UNAUTHORIZED =
  'FAILED_CREATE_MEDICAL_RECORD_UNAUTHORIZED' as const;
export const FAILED_READ_MEDICAL_RECORDS = 'FAILED_READ_MEDICAL_RECORDS' as const;
export const FAILED_READ_MEDICAL_RECORDS_UNAUTHORIZED =
  'FAILED_READ_MEDICAL_RECORDS_UNAUTHORIZED' as const;
export const FAILED_UPDATE_MEDICAL_RECORD = 'FAILED_UPDATE_MEDICAL_RECORD' as const;
export const FAILED_UPDATE_MEDICAL_RECORD_UNAUTHORIZED =
  'FAILED_UPDATE_MEDICAL_RECORD_UNAUTHORIZED' as const;

// Payment & Meeting Events
export const MEETING_PAYMENT_FAILED = 'MEETING_PAYMENT_FAILED' as const;
export const MULTIBANCO_EXPIRY_RISK = 'MULTIBANCO_EXPIRY_RISK' as const;

// Event Management
export const EVENT_CREATED = 'EVENT_CREATED' as const;
export const EVENT_UPDATED = 'EVENT_UPDATED' as const;
export const EVENT_DELETED = 'EVENT_DELETED' as const;

// Meeting Management
export const MEETING_CREATED = 'MEETING_CREATED' as const;
export const MEETING_UPDATED = 'MEETING_UPDATED' as const;
export const MEETING_CANCELLED = 'MEETING_CANCELLED' as const;

// Schedule Management
export const SCHEDULE_UPDATED = 'SCHEDULE_UPDATED' as const;
export const BLOCKED_DATE_ADDED = 'BLOCKED_DATE_ADDED' as const;
export const BLOCKED_DATE_REMOVED = 'BLOCKED_DATE_REMOVED' as const;

// Profile & Agreement Management
export const PROFILE_PUBLISHED = 'PROFILE_PUBLISHED' as const;
export const PROFILE_UNPUBLISHED = 'PROFILE_UNPUBLISHED' as const;
export const PRACTITIONER_AGREEMENT_ACCEPTED = 'PRACTITIONER_AGREEMENT_ACCEPTED' as const;

// Security Events
export const SECURITY_ALERT_NOTIFIED = 'SECURITY_ALERT_NOTIFIED' as const;
export const SECURITY_ALERT_IGNORED = 'SECURITY_ALERT_IGNORED' as const;

// Generic failure patterns
export const FAILED_OPERATION = 'FAILED_OPERATION' as const;
export const FAILED_OPERATION_UNAUTHORIZED = 'FAILED_OPERATION_UNAUTHORIZED' as const;
export const SYSTEM_ERROR = 'SYSTEM_ERROR' as const;

export type AuditEventType =
  // Medical Records
  | typeof CREATE_MEDICAL_RECORD
  | typeof READ_MEDICAL_RECORDS_FOR_MEETING
  | typeof UPDATE_MEDICAL_RECORD
  | typeof FAILED_CREATE_MEDICAL_RECORD
  | typeof FAILED_CREATE_MEDICAL_RECORD_UNAUTHORIZED
  | typeof FAILED_READ_MEDICAL_RECORDS
  | typeof FAILED_READ_MEDICAL_RECORDS_UNAUTHORIZED
  | typeof FAILED_UPDATE_MEDICAL_RECORD
  | typeof FAILED_UPDATE_MEDICAL_RECORD_UNAUTHORIZED

  // Payment & Meeting Events
  | typeof MEETING_PAYMENT_FAILED
  | typeof MULTIBANCO_EXPIRY_RISK

  // Event Management
  | typeof EVENT_CREATED
  | typeof EVENT_UPDATED
  | typeof EVENT_DELETED

  // Meeting Management
  | typeof MEETING_CREATED
  | typeof MEETING_UPDATED
  | typeof MEETING_CANCELLED

  // Schedule Management
  | typeof SCHEDULE_UPDATED
  | typeof BLOCKED_DATE_ADDED
  | typeof BLOCKED_DATE_REMOVED

  // Profile & Agreement Management
  | typeof PROFILE_PUBLISHED
  | typeof PROFILE_UNPUBLISHED
  | typeof PRACTITIONER_AGREEMENT_ACCEPTED

  // Security Events
  | typeof SECURITY_ALERT_NOTIFIED
  | typeof SECURITY_ALERT_IGNORED

  // Generic failure patterns for future use
  | typeof FAILED_OPERATION
  | typeof FAILED_OPERATION_UNAUTHORIZED
  | typeof SYSTEM_ERROR;

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
  | 'profile'
  | 'legal_agreement'
  | 'system'
  | 'security_event';

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
