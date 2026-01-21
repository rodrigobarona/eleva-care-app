/**
 * Debug Telemetry Utility
 *
 * Provides a centralized, secure way to send debug telemetry data during development.
 * All telemetry is gated behind environment flags and sensitive data is automatically redacted.
 *
 * @example
 * ```typescript
 * import { sendDebugTelemetry, redactSensitiveData } from '@/lib/utils/debug-telemetry';
 *
 * // Simple usage - automatically redacts and gates
 * await sendDebugTelemetry({
 *   location: 'api/user/billing:auth',
 *   message: 'Auth result',
 *   data: { userId, hasId: !!userId },
 * });
 * ```
 */

/**
 * Environment flag to enable debug telemetry.
 * Set DEBUG_TELEMETRY=true or NODE_ENV=development to enable.
 */
const isDebugTelemetryEnabled = (): boolean => {
  return process.env.DEBUG_TELEMETRY === 'true' || process.env.NODE_ENV === 'development';
};

/**
 * Telemetry endpoint - defaults to local agent ingest.
 * Can be overridden via DEBUG_TELEMETRY_ENDPOINT env var.
 */
const getTelemetryEndpoint = (): string => {
  return (
    process.env.DEBUG_TELEMETRY_ENDPOINT ||
    'http://127.0.0.1:7245/ingest/5ec49622-4f23-4e7d-b9b7-b1ff787148b0'
  );
};

/**
 * Patterns for sensitive field names that should be redacted
 */
const SENSITIVE_PATTERNS = [
  /^user.?id$/i,
  /clerk.?id$/i,
  /stripe.*(id|key|secret)/i,
  /customer.?id$/i,
  /email$/i,
  /token$/i,
  /password$/i,
  /secret$/i,
  /api.?key$/i,
  /session.?id$/i,
  /^id$/i,
];

/**
 * Fields that should be converted to boolean presence indicators
 */
const PRESENCE_ONLY_FIELDS = [
  'userId',
  'clerkId',
  'stripeCustomerId',
  'stripeConnectAccountId',
  'email',
  'guestEmail',
  'expertEmail',
  'token',
  'sessionId',
];

/**
 * Redacts sensitive data from a payload object.
 * Converts sensitive IDs to boolean presence indicators.
 *
 * @param data - The data object to redact
 * @returns A redacted copy of the data
 */
export function redactSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Check if this is a presence-only field
    if (PRESENCE_ONLY_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      redacted[`has${key.charAt(0).toUpperCase()}${key.slice(1)}`] = !!value;
      continue;
    }

    // Check if field matches sensitive patterns
    if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))) {
      redacted[key] = value ? '[REDACTED]' : null;
      continue;
    }

    // Recursively redact nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactSensitiveData(value as Record<string, unknown>);
      continue;
    }

    // Redact arrays of objects
    if (Array.isArray(value)) {
      redacted[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? redactSensitiveData(item as Record<string, unknown>)
          : item,
      );
      continue;
    }

    // Remove stack traces
    if (key === 'errorStack' || key === 'stack') {
      redacted[key] = value ? '[STACK_REDACTED]' : null;
      continue;
    }

    // Keep non-sensitive data as-is
    redacted[key] = value;
  }

  return redacted;
}

/**
 * Redacts a full response payload, keeping only safe diagnostic info.
 *
 * @param payload - The full response payload
 * @returns A safe diagnostic summary
 */
export function redactResponsePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return {
    hasUser: !!payload?.user,
    hasCustomer: !!payload?.customer,
    hasAccountStatus: !!payload?.accountStatus,
    hasDefaultPaymentMethod: !!(payload?.customer as Record<string, unknown>)?.defaultPaymentMethod,
    userKeys: payload?.user ? Object.keys(payload.user as object) : [],
    customerKeys: payload?.customer ? Object.keys(payload.customer as object) : [],
  };
}

/**
 * Telemetry payload interface
 */
export interface DebugTelemetryPayload {
  location: string;
  message: string;
  data?: Record<string, unknown>;
  hypothesisId?: string;
}

/**
 * Sends debug telemetry data to the configured endpoint.
 * Automatically gates behind environment flags and redacts sensitive data.
 *
 * @param payload - The telemetry payload to send
 * @returns Promise that resolves when telemetry is sent (or skipped)
 *
 * @example
 * ```typescript
 * await sendDebugTelemetry({
 *   location: 'api/user/billing:auth',
 *   message: 'Auth result',
 *   data: { userId: 'user_123', email: 'test@example.com' },
 * });
 * // Sends: { data: { hasUserId: true, email: '[REDACTED]' } }
 * ```
 */
export async function sendDebugTelemetry(payload: DebugTelemetryPayload): Promise<void> {
  // Gate behind environment flag
  if (!isDebugTelemetryEnabled()) {
    return;
  }

  try {
    const endpoint = getTelemetryEndpoint();
    const redactedData = payload.data ? redactSensitiveData(payload.data) : {};

    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: payload.location,
        message: payload.message,
        data: redactedData,
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: payload.hypothesisId,
      }),
    });
  } catch {
    // Silently fail - telemetry should never break the app
  }
}

/**
 * Synchronous version for use in non-async contexts.
 * Fire-and-forget pattern.
 */
export function sendDebugTelemetrySync(payload: DebugTelemetryPayload): void {
  sendDebugTelemetry(payload).catch(() => {});
}
