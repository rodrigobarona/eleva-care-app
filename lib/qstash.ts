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
 * Schedules a recurring job on QStash.
 *
 * This function publishes a JSON request to schedule a recurring job using the provided scheduling options.
 * The options must include either an interval or a cron expression, with optional delay and retry settings.
 * If the destination URL contains "/api/cron/", the function automatically adds a "x-qstash-request" header to
 * the request by merging it with any headers specified in the provided body.
 *
 * @param destination - The API endpoint URL to schedule the job.
 * @param options - An object specifying scheduling parameters. Must include either an interval or a cron expression,
 *                  and may include a delay and a custom number of retries.
 * @param body - An optional object representing the message body. If it includes a "headers" property, those headers
 *               will be merged with QStash-specific headers.
 * @returns A promise that resolves to the scheduled job's identifier.
 *
 * @throws {Error} If neither an interval nor a cron expression is provided in the options.
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

  // Ensure we have headers object
  const headers: Record<string, string> = (body.headers as Record<string, string>) || {};

  // Ensure QStash request header is set
  if (destination.includes('/api/cron/')) {
    headers['x-qstash-request'] = 'true';
  }

  // Update body with headers
  const updatedBody = {
    ...body,
    headers,
  };

  // Create the schedule
  const response = await client.publishJSON({
    url: destination,
    body: updatedBody,
    ...schedulingOptions,
  });

  console.log(`Scheduled job to ${destination}`, {
    messageId: response.messageId,
    schedulingOptions,
    headers,
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
