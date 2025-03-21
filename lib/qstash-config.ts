/**
 * QStash configuration helper that validates environment variables
 * before allowing API calls
 */
import * as dotenv from 'dotenv';
import { qstash } from '@/config/qstash';
import { Client } from '@upstash/qstash';

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
 * Schedule a recurring job with QStash
 * @param endpoint The endpoint to call
 * @param cronExpression The cron expression for scheduling
 * @param payload The payload to send
 * @returns Result of the schedule operation or undefined if not available
 */
export async function scheduleRecurringJob(
  endpoint: string,
  cronExpression: string,
  payload: Record<string, unknown> = {},
) {
  const config = validateQStashConfig();
  if (!config.isValid) {
    console.warn(config.message);
    return undefined;
  }

  const client = initQStashClient();
  if (!client) {
    return undefined;
  }

  try {
    const result = await client.schedules.create({
      destination: `${qstash.baseUrl}/api/qstash`,
      cron: cronExpression,
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'x-qstash-target-url': endpoint,
      },
    });

    return result;
  } catch (error) {
    console.error(`Failed to schedule recurring job to ${endpoint}:`, error);
    return undefined;
  }
}
