import * as dotenv from 'dotenv';
import { Client } from '@upstash/qstash';
import { isValidCron } from 'cron-validator';

import { validateQStashConfig } from './qstash-config';

// Ensure environment variables are loaded
dotenv.config();

// Debug loaded environment variables
if (process.env.NODE_ENV !== 'production') {
  console.log('QStash environment variables:');
  console.log(`QSTASH_TOKEN exists: ${!!process.env.QSTASH_TOKEN}`);
  console.log(`QSTASH_CURRENT_SIGNING_KEY exists: ${!!process.env.QSTASH_CURRENT_SIGNING_KEY}`);
  console.log(`QSTASH_NEXT_SIGNING_KEY exists: ${!!process.env.QSTASH_NEXT_SIGNING_KEY}`);
}

// Initialize QStash client
let qstashClient: Client | null = null;

try {
  // Check if QStash is properly configured
  const config = validateQStashConfig();

  if (config.isValid) {
    qstashClient = new Client({
      token: process.env.QSTASH_TOKEN || '',
    });
  } else {
    console.warn('QStash is not properly configured. Some features may not work correctly.');
    console.warn(config.message);
  }
} catch (error) {
  console.error('Failed to initialize QStash client:', error);
}

/**
 * No-op QStash client that logs warnings instead of throwing errors
 * This allows the application to continue functioning with degraded QStash functionality
 */
const noopClient = {
  publishJSON: async () => {
    console.warn('QStash operation skipped: publishJSON (client not initialized)');
    return { messageId: 'noop-message-id' };
  },
  schedules: {
    create: async () => {
      console.warn('QStash operation skipped: schedules.create (client not initialized)');
      return { scheduleId: 'noop-schedule-id' };
    },
    delete: async () => {
      console.warn('QStash operation skipped: schedules.delete (client not initialized)');
    },
    list: async () => {
      console.warn('QStash operation skipped: schedules.list (client not initialized)');
      return [];
    },
  },
} as unknown as Client;

// Helper to ensure client exists before use
function getClient(): Client {
  if (!qstashClient) {
    console.warn('QStash client is not initialized. Using no-op client as fallback.');
    return noopClient;
  }
  return qstashClient;
}

// Schedule types
type CronExpression = string;

interface ScheduleOptions {
  cron: CronExpression;
  // Optional parameters
  delay?: number; // Delay in seconds before first execution
  retries?: number; // Number of retries (default: 3)
}

interface ScheduleConfig {
  destination: string;
  retries?: number;
  headers?: Record<string, string>;
  body?: string;
  cron: string;
}

/**
 * Validate a cron expression with detailed error messages
 * @param cronExpression The cron expression to validate
 * @throws Error if the cron expression is invalid
 */
function validateCronExpression(cronExpression: string): void {
  // First check if we have exactly 5 fields
  const cronFields = cronExpression.trim().split(/\s+/);
  if (cronFields.length !== 5) {
    throw new Error(
      `Invalid cron expression. Expected 5 fields, got ${cronFields.length}. Format: "minute hour day month weekday"`,
    );
  }

  // Then use cron-validator for thorough validation
  if (!isValidCron(cronExpression)) {
    throw new Error(
      'Invalid cron expression. Please ensure each field is valid:\n' +
        '- Minutes: 0-59\n' +
        '- Hours: 0-23\n' +
        '- Day of month: 1-31\n' +
        '- Month: 1-12 or JAN-DEC\n' +
        '- Day of week: 0-7 (0 or 7 is Sunday) or SUN-SAT',
    );
  }
}

/**
 * Schedule a recurring job with QStash
 * @param destination The API endpoint URL to call
 * @param options Schedule options (cron expression)
 * @param body Optional body to send with the request
 * @returns The schedule ID on success
 */
export async function scheduleRecurringJob(
  destination: string,
  options: ScheduleOptions,
  body: Record<string, unknown> = {},
): Promise<string> {
  const client = getClient();

  // Ensure we have headers object
  const headers: Record<string, string> = (body.headers as Record<string, string>) || {};

  // Ensure QStash request header is set
  if (destination.includes('/api/cron/')) {
    headers['x-qstash-request'] = 'true';
  }

  // Validate the cron expression
  validateCronExpression(options.cron);

  // Create schedule configuration
  const scheduleConfig: ScheduleConfig = {
    destination,
    retries: options.retries !== undefined ? options.retries : 3,
    headers,
    body: JSON.stringify(body),
    cron: options.cron,
  };

  // Create the schedule using schedules.create
  const response = await client.schedules.create(scheduleConfig);

  console.log(`Created schedule for ${destination}`, {
    scheduleId: response.scheduleId,
    options,
    headers,
  });

  return response.scheduleId;
}

/**
 * Delete a scheduled job
 * @param scheduleId The ID of the schedule to delete
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  const client = getClient();
  await client.schedules.delete(scheduleId);
  console.log(`Deleted schedule ${scheduleId}`);
}

/**
 * List all scheduled jobs
 */
export async function listSchedules() {
  const client = getClient();
  return await client.schedules.list();
}

/**
 * Check if QStash is available
 */
export function isQStashAvailable(): boolean {
  return qstashClient !== null;
}

// Export the client for direct use
export { qstashClient };
