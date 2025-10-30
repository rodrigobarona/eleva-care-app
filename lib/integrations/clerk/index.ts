/**
 * Clerk Integration Module
 *
 * Provides utilities for Clerk authentication security features,
 * including security notifications and preferences.
 *
 * @example
 * ```typescript
 * import { shouldSendSecurityNotification } from '@/lib/integrations/clerk';
 *
 * const shouldSend = await shouldSendSecurityNotification(userId);
 * ```
 */

export * from './security-utils';
