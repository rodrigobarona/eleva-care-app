import * as dotenv from 'dotenv';
import { Client } from '@upstash/qstash';

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

// Helper to ensure client exists before use
function getClient(): Client {
  if (!qstashClient) {
    throw new Error('QStash client is not initialized. Check your environment variables.');
  }
  return qstashClient;
}

// Schedule types
type ScheduleInterval = '1h' | '2h' | '6h' | '12h' | '24h';
type CronExpression = string;

interface ScheduleOptions {
  // Either interval or cron must be provided
  interval?: ScheduleInterval;
  cron?: CronExpression;
  // Optional parameters
  delay?: number; // Delay in seconds before first execution
  retries?: number; // Number of retries (default: 3)
}

/**
 * Schedule a recurring job with QStash
 * @param destination The API endpoint URL to call
 * @param options Schedule options (interval or cron expression)
 * @param body Optional body to send with the request
 * @returns The schedule ID on success
 */
export async function scheduleRecurringJob(
  destination: string,
  options: ScheduleOptions,
  body: Record<string, unknown> = {},
): Promise<string> {
  const client = getClient();
  const schedulingOptions: Record<string, unknown> = {
    retries: options.retries !== undefined ? options.retries : 3,
  };

  // Set either interval or cron
  if (options.interval) {
    schedulingOptions.interval = options.interval;
  } else if (options.cron) {
    schedulingOptions.cron = options.cron;
  } else {
    throw new Error('Either interval or cron must be provided');
  }

  // Add delay if specified
  if (options.delay !== undefined) {
    schedulingOptions.delay = options.delay;
  }

  // Create the schedule
  const response = await client.publishJSON({
    url: destination,
    body,
    ...schedulingOptions,
  });

  console.log(`Scheduled job to ${destination}`, {
    messageId: response.messageId,
    schedulingOptions,
  });

  return response.messageId;
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
