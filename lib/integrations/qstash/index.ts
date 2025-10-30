/**
 * QStash Integration Module
 *
 * Provides a unified interface for QStash queue operations, scheduling,
 * and signature validation.
 *
 * @example
 * ```typescript
 * import { qstashClient, setupSchedules, validateSignature } from '@/lib/integrations/qstash';
 *
 * // Use the client
 * await qstashClient.publishJSON({
 *   url: 'https://example.com/api/webhook',
 *   body: { data: 'value' }
 * });
 *
 * // Setup schedules
 * await setupSchedules();
 * ```
 */

export { qstashClient } from './client';
export { isQStashAvailable, qstashHealthCheck } from './config';
export { setupQStashSchedules } from './schedules';
export { validateQStashSignature } from './signature-validator';
export { logQStashEvent, sendQStashMessage } from './utils';
