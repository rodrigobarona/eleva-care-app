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

  // Proceed with schedule creation
  for (const config of SCHEDULE_CONFIGS) {
    try {
      // Construct the full URL for the target endpoint
      const destinationUrl = `${BASE_URL}${config.endpoint}`;

      // Schedule the job with correct parameter order and types
      const scheduleId = await scheduleRecurringJob(
        destinationUrl,
        // Merge the schedule config with other options
        {
          ...config.schedule,
          retries: 3,
        },
        // Body as the third parameter
        { name: config.name },
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
