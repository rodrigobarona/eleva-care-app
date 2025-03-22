/**
 * QStash configuration helper that validates environment variables
 * before allowing API calls
 */
import * as dotenv from 'dotenv';
import { qstash } from '@/config/qstash';
import { Client } from '@upstash/qstash';

import { scheduleRecurringJob as mainScheduleRecurringJob } from './qstash';

// Ensure environment variables are loaded
dotenv.config();

/**
 * Validate QStash configuration
 * @returns Object with validation result and message
 */
export function validateQStashConfig() {
  // Check for token
  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    return {
      isValid: false,
      message: 'Missing QSTASH_TOKEN environment variable',
    };
  }

  // Check for signing keys
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!currentSigningKey || !nextSigningKey) {
    return {
      isValid: false,
      message: 'Missing QStash signing keys in environment variables',
    };
  }

  return {
    isValid: true,
    message: 'QStash configuration is valid',
  };
}

/**
 * Get a message about QStash configuration status
 * @returns A message about QStash configuration
 */
export function getQStashConfigMessage(): string {
  const config = validateQStashConfig();

  if (!config.isValid) {
    return `QStash is not properly configured: ${config.message}`;
  }

  return 'QStash is properly configured';
}

/**
 * Initialize QStash client with error handling
 * @returns QStash client or undefined if not configured
 */
export function initQStashClient(): Client | undefined {
  try {
    const config = validateQStashConfig();
    if (!config.isValid) {
      console.warn(config.message);
      return undefined;
    }

    const token = process.env.QSTASH_TOKEN;
    if (!token) {
      console.warn('QSTASH_TOKEN environment variable is not set');
      return undefined;
    }

    // Create and return the QStash client
    return new Client({
      token,
    });
  } catch (error) {
    console.error('Failed to initialize QStash client:', error);
    return undefined;
  }
}

/**
 * Check if the QStash client is available
 * @returns Boolean indicating if QStash is available
 */
export async function isQStashAvailable(): Promise<boolean> {
  try {
    const client = initQStashClient();
    if (!client) {
      return false;
    }

    // Test connection by fetching the queue - this will fail if credentials are invalid
    await client.schedules.list();
    return true;
  } catch (error) {
    console.error('QStash availability check failed:', error);
    return false;
  }
}

/**
 * @deprecated Use the scheduleRecurringJob function from lib/qstash.ts instead
 * This is kept for backward compatibility
 */
export async function scheduleRecurringJob(
  endpoint: string,
  cronExpression: string,
  payload: Record<string, unknown> = {},
) {
  console.warn(
    'This scheduleRecurringJob function is deprecated. Use the one from lib/qstash.ts instead.',
  );

  try {
    // Forward to the main implementation with adapted parameters
    return await mainScheduleRecurringJob(
      `${qstash.baseUrl}/api/qstash`,
      { cron: cronExpression },
      {
        ...payload,
        headers: {
          'Content-Type': 'application/json',
          'x-qstash-target-url': endpoint,
        },
      },
    );
  } catch (error) {
    console.error(`Failed to schedule recurring job to ${endpoint}:`, error);
    return undefined;
  }
}
