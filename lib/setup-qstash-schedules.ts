import { isQStashAvailable, scheduleRecurringJob } from './qstash';
import { getQStashConfigMessage, validateQStashConfig } from './qstash-config';

// Get the base URL for the app
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://eleva.care';

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
    schedule: { interval: '2h' as const }, // Every 2 hours - use const assertion for ScheduleInterval type
  },
  {
    name: 'check-upcoming-payouts',
    endpoint: '/api/cron/check-upcoming-payouts',
    schedule: { cron: '0 12 * * *' }, // Daily at noon
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
 * Sets up all QStash schedules.
 *
 * This asynchronous function initializes recurring jobs defined in the schedule configuration by first validating the
 * QStash setup and checking the availability of the QStash client. If the configuration is invalid or the client is unavailable,
 * it returns a failure result for each schedule along with an explanatory error message. When both checks pass, it constructs
 * the full destination URL for each job, logs the scheduling process, and attempts to create the schedule while including
 * middleware headers.
 *
 * @returns A Promise that resolves to an array of ScheduleResult objects indicating the success or failure of each scheduled job.
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
