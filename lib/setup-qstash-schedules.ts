import { Client } from '@upstash/qstash';

import { isQStashAvailable, scheduleRecurringJob } from './qstash';
import { getQStashConfigMessage, initQStashClient, validateQStashConfig } from './qstash-config';

// Get the base URL for the app
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://eleva.care';

// Initialize QStash client with proper validation
const qstashClient = initQStashClient();
if (!qstashClient) {
  console.error('Failed to initialize QStash client. Check your environment variables.');
}

/**
 * Delete all existing QStash schedules
 */
async function cleanupExistingSchedules() {
  if (!qstashClient) {
    throw new Error('QStash client is not initialized. Cannot cleanup schedules.');
  }

  try {
    console.log('🧹 Cleaning up existing schedules...');
    const schedules = await qstashClient.schedules.list();

    for (const schedule of schedules) {
      console.log(`Deleting schedule ${schedule.scheduleId}...`);
      await qstashClient.schedules.delete(schedule.scheduleId);
    }

    console.log(`✅ Deleted ${schedules.length} schedules`);
  } catch (error) {
    console.error('Failed to cleanup schedules:', error);
    throw error;
  }
}

// This maps the cron jobs from vercel.json to QStash schedules
const SCHEDULE_CONFIGS = [
  {
    name: 'process-tasks',
    endpoint: '/api/cron/process-tasks',
    schedule: { cron: '0 4 * * *' }, // Daily at 4 AM
  },
  {
    name: 'process-expert-transfers',
    endpoint: '/api/cron/process-expert-transfers',
    schedule: { cron: '0 */2 * * *' }, // Every 2 hours (at minute 0)
  },
  {
    name: 'check-upcoming-payouts',
    endpoint: '/api/cron/check-upcoming-payouts',
    schedule: { cron: '0 12 * * *' }, // Daily at noon
  },
  {
    name: 'cleanup-expired-reservations',
    endpoint: '/api/cron/cleanup-expired-reservations',
    schedule: { cron: '*/15 * * * *' }, // Every 15 minutes
  },
  {
    name: 'cleanup-blocked-dates',
    endpoint: '/api/cron/cleanup-blocked-dates',
    schedule: { cron: '0 0 * * *' }, // Daily at midnight UTC
  },
];

interface ScheduleResult {
  name: string;
  endpoint: string;
  scheduleId: string;
  success: boolean;
  error?: string;
}

/**
 * Setup all QStash schedules
 * This should be run on the server once or during deployment
 */
export async function setupQStashSchedules(): Promise<ScheduleResult[]> {
  // Validate QStash configuration first
  const config = validateQStashConfig();
  const results: ScheduleResult[] = [];

  if (!config.isValid) {
    console.warn('QStash configuration is incomplete or invalid:');
    console.warn(getQStashConfigMessage());

    // Return empty results with error
    return SCHEDULE_CONFIGS.map((config) => ({
      name: config.name,
      endpoint: config.endpoint,
      scheduleId: '',
      success: false,
      error: 'QStash is not properly configured. Missing environment variables.',
    }));
  }

  // Ensure QStash client is available
  if (!isQStashAvailable()) {
    console.error('QStash client is not available. Cannot set up schedules.');

    return SCHEDULE_CONFIGS.map((config) => ({
      name: config.name,
      endpoint: config.endpoint,
      scheduleId: '',
      success: false,
      error: 'QStash client is not initialized properly.',
    }));
  }

  // First, cleanup existing schedules
  await cleanupExistingSchedules();

  // Proceed with schedule creation
  for (const config of SCHEDULE_CONFIGS) {
    try {
      // Construct the full URL for the target endpoint
      const destinationUrl = `${BASE_URL}${config.endpoint}`;

      console.log(`Setting up QStash schedule for ${config.name} at endpoint ${destinationUrl}`);

      // Schedule the job with correct parameter order and types
      const scheduleId = await scheduleRecurringJob(
        destinationUrl,
        // Merge the schedule config with other options
        {
          ...config.schedule,
          retries: 3,
        },
        // Body as the third parameter - include headers to pass through middleware
        {
          name: config.name,
          headers: {
            'x-qstash-request': 'true',
          },
        },
      );

      // Record the result
      results.push({
        name: config.name,
        endpoint: config.endpoint,
        scheduleId,
        success: true,
      });

      console.log(`Successfully scheduled ${config.name} job`, {
        scheduleId,
        endpoint: config.endpoint,
        schedule: config.schedule,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Record the failure
      results.push({
        name: config.name,
        endpoint: config.endpoint,
        scheduleId: '',
        success: false,
        error: errorMessage,
      });

      console.error(`Failed to schedule ${config.name} job:`, error);
    }
  }

  return results;
}
