import * as dotenv from 'dotenv';
import { qstash } from '@/config/qstash';
import { Client } from '@upstash/qstash';
import { isValidCron } from 'cron-validator';

import { validateQStashConfig } from './config';

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
    console.log('✅ QStash client initialized successfully');
  } else {
    console.warn('⚠️ QStash is not properly configured. Some features may not work correctly.');
    console.warn(config.message);
  }
} catch (error) {
  console.error('❌ Failed to initialize QStash client:', error);
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
    console.warn('⚠️ QStash client is not initialized. Using no-op client as fallback.');
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
  headers?: Record<string, string>; // Custom headers
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
  const headers: Record<string, string> = options.headers || {};

  // Ensure QStash request header is set for cron endpoints
  if (destination.includes('/api/cron/')) {
    headers['x-qstash-request'] = 'true';
  }

  // Add authentication headers
  if (process.env.CRON_API_KEY) {
    headers['x-api-key'] = process.env.CRON_API_KEY;
  }

  // Validate the cron expression
  validateCronExpression(options.cron);

  // Create schedule configuration
  const scheduleConfig: ScheduleConfig = {
    destination,
    retries: options.retries !== undefined ? options.retries : qstash.defaultRetries,
    headers,
    body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    cron: options.cron,
  };

  console.log(`🕐 Creating schedule for ${destination}`, {
    cron: options.cron,
    retries: scheduleConfig.retries,
    hasCustomHeaders: Object.keys(headers).length > 0,
  });

  // Create the schedule using schedules.create
  const response = await client.schedules.create(scheduleConfig);

  console.log(`✅ Created schedule: ${response.scheduleId} for ${destination}`);

  return response.scheduleId;
}

/**
 * Schedule all configured cron jobs from the qstash config
 * @returns Array of created schedule IDs
 */
export async function scheduleAllConfiguredJobs(): Promise<
  Array<{ name: string; scheduleId: string; endpoint: string }>
> {
  // 🔍 Pre-flight checks: Ensure QStash client and configuration are available
  if (!qstashClient) {
    console.error('❌ QStash client is not initialized. Cannot schedule jobs.');
    console.error('   💡 Check QSTASH_TOKEN environment variable and QStash configuration.');
    return [];
  }

  if (!qstash || typeof qstash !== 'object') {
    console.error('❌ QStash configuration object is not available. Cannot schedule jobs.');
    console.error('   💡 Check qstash configuration import and initialization.');
    return [];
  }

  if (!qstash.schedules || typeof qstash.schedules !== 'object') {
    console.error('❌ QStash schedules configuration is not available. Cannot schedule jobs.');
    console.error('   💡 Check qstash.schedules configuration in qstash config file.');
    return [];
  }

  if (!qstash.baseUrl || typeof qstash.baseUrl !== 'string') {
    console.error('❌ QStash baseUrl is not configured. Cannot schedule jobs.');
    console.error('   💡 Check qstash.baseUrl configuration in qstash config file.');
    return [];
  }

  const scheduleCount = Object.keys(qstash.schedules).length;
  if (scheduleCount === 0) {
    console.warn('⚠️ No cron jobs configured for scheduling.');
    return [];
  }

  console.log('📅 Scheduling all configured cron jobs...');
  console.log(`   🔧 QStash client: ${qstashClient ? '✅ Available' : '❌ Not available'}`);
  console.log(`   📋 Jobs to schedule: ${scheduleCount}`);
  console.log(`   🌐 Base URL: ${qstash.baseUrl}`);

  const results: Array<{ name: string; scheduleId: string; endpoint: string }> = [];
  const schedules = qstash.schedules;

  for (const [jobName, config] of Object.entries(schedules)) {
    try {
      console.log(`\n🔄 Scheduling ${jobName}...`);
      console.log(`   📍 Endpoint: ${config.endpoint}`);
      console.log(`   ⏰ Cron: ${config.cron}`);
      console.log(`   📝 Description: ${config.description}`);
      console.log(`   🎯 Priority: ${config.priority}`);

      const destination = `${qstash.baseUrl}${config.endpoint}`;

      const scheduleId = await scheduleRecurringJob(destination, {
        cron: config.cron,
        retries: qstash.defaultRetries,
        headers: {
          'Content-Type': 'application/json',
          'x-cron-job-name': jobName,
          'x-cron-priority': config.priority,
        },
      });

      results.push({
        name: jobName,
        scheduleId,
        endpoint: config.endpoint,
      });

      console.log(`   ✅ Successfully scheduled ${jobName} (ID: ${scheduleId})`);
    } catch (error) {
      console.error(`   ❌ Failed to schedule ${jobName}:`, error);
      // Continue with other jobs even if one fails
    }
  }

  console.log(`\n🎉 Scheduling complete! Created ${results.length} schedules.`);
  return results;
}

/**
 * Delete a scheduled job
 * @param scheduleId The ID of the schedule to delete
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  const client = getClient();
  await client.schedules.delete(scheduleId);
  console.log(`🗑️ Deleted schedule ${scheduleId}`);
}

/**
 * Delete all schedules (useful for cleanup/reset)
 */
export async function deleteAllSchedules(): Promise<void> {
  console.log('🧹 Deleting all QStash schedules...');

  const client = getClient();
  const schedules = await client.schedules.list();

  for (const schedule of schedules) {
    try {
      await client.schedules.delete(schedule.scheduleId);
      console.log(`🗑️ Deleted schedule: ${schedule.scheduleId}`);
    } catch (error) {
      console.error(`❌ Failed to delete schedule ${schedule.scheduleId}:`, error);
    }
  }

  console.log('✅ All schedules deleted');
}

/**
 * List all scheduled jobs with enhanced information
 */
export async function listSchedulesWithDetails() {
  const client = getClient();
  const schedules = await client.schedules.list();

  console.log(`📋 Found ${schedules.length} scheduled jobs:`);

  schedules.forEach((schedule, index) => {
    console.log(`\n${index + 1}. Schedule ID: ${schedule.scheduleId}`);
    console.log(`   🎯 Destination: ${schedule.destination}`);
    console.log(`   ⏰ Cron: ${schedule.cron}`);
    console.log(`   🔄 Retries: ${schedule.retries || 'default'}`);
    console.log(
      `   📅 Created: ${schedule.createdAt ? new Date(schedule.createdAt).toLocaleString() : 'unknown'}`,
    );
  });

  return schedules;
}

/**
 * Get schedule statistics and health information
 */
export async function getScheduleStats() {
  try {
    const schedules = await listSchedules();
    const configuredJobs = Object.keys(qstash.schedules).length;

    return {
      totalScheduled: schedules.length,
      totalConfigured: configuredJobs,
      isInSync: schedules.length === configuredJobs,
      qstashAvailable: isQStashAvailable(),
      baseUrl: qstash.baseUrl,
      priorities: qstash.priorities,
    };
  } catch (error) {
    console.error('Failed to get schedule stats:', error);
    return {
      totalScheduled: 0,
      totalConfigured: Object.keys(qstash.schedules).length,
      isInSync: false,
      qstashAvailable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
