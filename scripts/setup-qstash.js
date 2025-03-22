#!/usr/bin/env node
/**
 * This script sets up QStash schedules for the application
 * It should be run once during deployment or when schedules need to be updated
 *
 * Usage:
 * node scripts/setup-qstash.js
 */
// Import required packages
import { Client } from '@upstash/qstash';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Base URL for the application
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://eleva-care-app.vercel.app';

// Check for QStash token and log warning if not present
const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
if (!QSTASH_TOKEN) {
  console.warn('⚠️  QSTASH_TOKEN not found in environment variables');
  console.log('QStash schedules will not be set up. This is normal in build environments.');
  console.log('To set up QStash schedules, run this script manually with proper credentials.');
  process.exit(0); // Exit successfully to not break the build
}

// Initialize QStash client only if token is available
const qstashClient = new Client({
  token: QSTASH_TOKEN,
});

// This maps the cron jobs to QStash schedules
const SCHEDULE_CONFIGS = [
  {
    name: 'process-tasks',
    endpoint: '/api/cron/process-tasks',
    schedule: { cron: '0 4 * * *' }, // Daily at 4 AM
  },
  {
    name: 'process-expert-transfers',
    endpoint: '/api/cron/process-expert-transfers',
    schedule: { interval: '2h' }, // Every 2 hours
  },
  {
    name: 'check-upcoming-payouts',
    endpoint: '/api/cron/check-upcoming-payouts',
    schedule: { cron: '0 12 * * *' }, // Daily at noon
  },
];

async function createSchedule(config) {
  try {
    // Construct the full URL for the target endpoint
    const destinationUrl = `${BASE_URL}${config.endpoint}`;

    // Prepare scheduling options
    const schedulingOptions = {
      retries: 3,
    };

    // Set either interval or cron
    if (config.schedule.interval) {
      schedulingOptions.interval = config.schedule.interval;
    } else if (config.schedule.cron) {
      schedulingOptions.cron = config.schedule.cron;
    } else {
      throw new Error('Either interval or cron must be provided');
    }

    // Create the schedule
    const response = await qstashClient.publishJSON({
      url: destinationUrl,
      body: { name: config.name },
      ...schedulingOptions,
    });

    console.log(`✅ Successfully scheduled ${config.name} job`, {
      scheduleId: response.messageId,
      endpoint: config.endpoint,
      schedule: config.schedule,
    });

    return {
      name: config.name,
      endpoint: config.endpoint,
      scheduleId: response.messageId,
      success: true,
    };
  } catch (error) {
    console.error(`❌ Failed to schedule ${config.name} job:`, error.message);

    return {
      name: config.name,
      endpoint: config.endpoint,
      scheduleId: '',
      success: false,
      error: error.message,
    };
  }
}

async function listSchedules() {
  try {
    const schedules = await qstashClient.schedules.list();
    console.log('Current QStash schedules:');
    for (const s of schedules) {
      console.log(`- ${s.id}: ${s.destination} (${s.cron || s.interval})`);
    }
    return schedules;
  } catch (error) {
    console.error('Error listing schedules:', error.message);
    return [];
  }
}

async function main() {
  console.log('🔄 Setting up QStash schedules...');
  console.log(`Base URL: ${BASE_URL}`);

  // List existing schedules
  await listSchedules();

  // Create each schedule
  const results = [];
  for (const config of SCHEDULE_CONFIGS) {
    const result = await createSchedule(config);
    results.push(result);
  }

  // Summarize results
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  console.log('\n📊 Summary:');
  console.log(`Created ${successCount} schedules, ${failureCount} failures.`);

  if (failureCount > 0) {
    console.error('\n❌ Failures:');
    const failures = results.filter((r) => !r.success);
    for (const r of failures) {
      console.error(`- ${r.name}: ${r.error}`);
    }
    process.exit(1);
  }

  console.log('\n✅ All schedules created successfully!');
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
