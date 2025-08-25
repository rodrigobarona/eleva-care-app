#!/usr/bin/env node

/**
 * 📅 QStash Schedule Manager
 *
 * This script helps manage QStash scheduled cron jobs.
 * It can schedule all configured jobs, list existing schedules,
 * clean up old schedules, and monitor health.
 *
 * Usage:
 *   node scripts/qstash-manager.js <command>
 *
 * Commands:
 *   schedule  - Schedule all configured cron jobs
 *   list      - List all existing schedules
 *   cleanup   - Delete all existing schedules
 *   stats     - Show schedule statistics and health
 *   help      - Show this help message
 */

require('dotenv').config();

// Since we can't import ES modules easily in Node.js script,
// we'll make direct API calls to QStash
const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const QSTASH_BASE_URL = 'https://qstash.upstash.io/v2';

if (!QSTASH_TOKEN) {
  console.error('❌ QSTASH_TOKEN environment variable is required');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${QSTASH_TOKEN}`,
  'Content-Type': 'application/json',
};

async function makeQStashRequest(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    };

    const response = await fetch(`${QSTASH_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
      throw new Error(`QStash API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ QStash request failed:`, error);
    throw error;
  }
}

async function listSchedules() {
  console.log('📋 Fetching existing schedules...\n');

  const schedules = await makeQStashRequest('/schedules');

  if (schedules.length === 0) {
    console.log('📭 No schedules found');
    return schedules;
  }

  console.log(`📋 Found ${schedules.length} existing schedules:\n`);

  schedules.forEach((schedule, index) => {
    console.log(`${index + 1}. ${schedule.scheduleId}`);
    console.log(`   🎯 ${schedule.destination}`);
    console.log(`   ⏰ ${schedule.cron}`);
    console.log(`   🔄 Retries: ${schedule.retries || 'default'}`);
    console.log(
      `   📅 Created: ${schedule.createdAt ? new Date(schedule.createdAt * 1000).toLocaleString() : 'unknown'}\n`,
    );
  });

  return schedules;
}

async function scheduleAllJobs() {
  console.log('📅 Scheduling all configured cron jobs...\n');

  // Get the base URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    ? process.env.NEXT_PUBLIC_BASE_URL
    : process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

  // Define all schedule configurations (mirroring config/qstash.ts)
  const schedules = {
    // Note: keep-alive is handled by Vercel cron (vercel.json) for maximum reliability
    // This ensures system health checks run even if QStash service is down

    appointmentReminders: {
      endpoint: '/api/cron/appointment-reminders',
      cron: '0 9 * * *',
      description: '24-hour appointment reminders for confirmed bookings',
      priority: 'high',
    },
    appointmentReminders1Hr: {
      endpoint: '/api/cron/appointment-reminders-1hr',
      cron: '*/15 * * * *',
      description: '1-hour appointment reminders for upcoming sessions',
      priority: 'high',
    },
    processExpertTransfers: {
      endpoint: '/api/cron/process-expert-transfers',
      cron: '0 */2 * * *',
      description: 'Process pending expert payouts based on aging requirements',
      priority: 'critical',
    },
    processPendingPayouts: {
      endpoint: '/api/cron/process-pending-payouts',
      cron: '0 6 * * *',
      description: 'Check and prepare expert payouts for processing',
      priority: 'high',
    },
    checkUpcomingPayouts: {
      endpoint: '/api/cron/check-upcoming-payouts',
      cron: '0 12 * * *',
      description: 'Notify experts about upcoming payouts and account status',
      priority: 'medium',
    },
    sendPaymentReminders: {
      endpoint: '/api/cron/send-payment-reminders',
      cron: '0 */6 * * *',
      description: 'Send staged Multibanco payment reminders (Day 3 gentle, Day 6 urgent)',
      priority: 'high',
    },
    cleanupExpiredReservations: {
      endpoint: '/api/cron/cleanup-expired-reservations',
      cron: '*/15 * * * *',
      description: 'Clean up expired slot reservations and pending payments',
      priority: 'medium',
    },
    cleanupBlockedDates: {
      endpoint: '/api/cron/cleanup-blocked-dates',
      cron: '0 0 * * *',
      description: 'Remove old blocked dates and calendar conflicts',
      priority: 'low',
    },
    processTasks: {
      endpoint: '/api/cron/process-tasks',
      cron: '0 4 * * *',
      description: 'General system maintenance, audit logs, and administrative tasks',
      priority: 'medium',
    },
  };

  const results = [];

  for (const [jobName, config] of Object.entries(schedules)) {
    try {
      console.log(`🔄 Scheduling ${jobName}...`);
      console.log(`   📍 Endpoint: ${config.endpoint}`);
      console.log(`   ⏰ Cron: ${config.cron}`);
      console.log(`   📝 Description: ${config.description}`);
      console.log(`   🎯 Priority: ${config.priority}`);

      const destination = `${baseUrl}${config.endpoint}`;

      const scheduleConfig = {
        destination,
        cron: config.cron,
        retries: 3,
        headers: {
          'Content-Type': 'application/json',
          'x-qstash-request': 'true',
          'x-cron-job-name': jobName,
          'x-cron-priority': config.priority,
          ...(process.env.CRON_API_KEY && { 'x-api-key': process.env.CRON_API_KEY }),
        },
      };

      const response = await makeQStashRequest('/schedules', 'POST', scheduleConfig);

      results.push({
        name: jobName,
        scheduleId: response.scheduleId,
        endpoint: config.endpoint,
        success: true,
      });

      console.log(`   ✅ Successfully scheduled ${jobName} (ID: ${response.scheduleId})\n`);
    } catch (error) {
      console.error(`   ❌ Failed to schedule ${jobName}:`, error.message);
      results.push({
        name: jobName,
        endpoint: config.endpoint,
        success: false,
        error: error.message,
      });
    }
  }

  console.log(`🎉 Scheduling complete!`);
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`✅ Successfully scheduled: ${successful}`);
  if (failed > 0) {
    console.log(`❌ Failed to schedule: ${failed}`);
  }

  return results;
}

async function deleteAllSchedules() {
  console.log('🧹 Deleting all QStash schedules...\n');

  const schedules = await makeQStashRequest('/schedules');

  if (schedules.length === 0) {
    console.log('📭 No schedules to delete');
    return;
  }

  console.log(`Found ${schedules.length} schedules to delete...\n`);

  for (const schedule of schedules) {
    try {
      await makeQStashRequest(`/schedules/${schedule.scheduleId}`, 'DELETE');
      console.log(`🗑️ Deleted: ${schedule.scheduleId} (${schedule.destination})`);
    } catch (error) {
      console.error(`❌ Failed to delete ${schedule.scheduleId}:`, error.message);
    }
  }

  console.log('\n✅ Cleanup complete');
}

async function showStats() {
  console.log('📊 QStash Schedule Statistics\n');

  try {
    const schedules = await makeQStashRequest('/schedules');

    // Count schedules by priority (extracted from headers)
    const priorityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0,
    };

    schedules.forEach((schedule) => {
      // Try to extract priority from destination URL or use unknown
      const priority = 'unknown'; // We can't easily get headers from list response
      priorityCounts[priority]++;
    });

    console.log(`📋 Total Schedules: ${schedules.length}`);
    console.log(`📋 Total Configured: 10 (from config)`); // Hard-coded for now
    console.log(`🔄 QStash Available: ${QSTASH_TOKEN ? '✅' : '❌'}`);
    // Compute baseUrl using the same precedence as elsewhere
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      ? process.env.NEXT_PUBLIC_BASE_URL
      : process.env.NEXT_PUBLIC_APP_URL
        ? process.env.NEXT_PUBLIC_APP_URL
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000';

    console.log(`🌐 Base URL: ${baseUrl}`);

    console.log('\n📊 Schedule Breakdown:');
    Object.entries(priorityCounts).forEach(([priority, count]) => {
      if (count > 0) {
        const emoji =
          priority === 'critical'
            ? '🔴'
            : priority === 'high'
              ? '🟠'
              : priority === 'medium'
                ? '🟡'
                : priority === 'low'
                  ? '🟢'
                  : '⚪';
        console.log(`   ${emoji} ${priority}: ${count}`);
      }
    });

    // Check if all configured jobs are scheduled
    const isInSync = schedules.length === 10;
    console.log(`\n🔄 Sync Status: ${isInSync ? '✅ In sync' : '⚠️ Out of sync'}`);

    if (!isInSync) {
      console.log('💡 Run "node scripts/qstash-manager.js schedule" to sync all jobs');
    }
  } catch (error) {
    console.error('❌ Failed to get statistics:', error.message);
  }
}

function showHelp() {
  console.log(`
📅 QStash Schedule Manager

Usage:
  node scripts/qstash-manager.js <command>

Commands:
  schedule  - Schedule all configured cron jobs
  list      - List all existing schedules  
  cleanup   - Delete all existing schedules
  stats     - Show schedule statistics and health
  help      - Show this help message

Examples:
  node scripts/qstash-manager.js schedule
  node scripts/qstash-manager.js list
  node scripts/qstash-manager.js cleanup
  node scripts/qstash-manager.js stats

Environment Variables Required:
  QSTASH_TOKEN                    - QStash API token
  NEXT_PUBLIC_APP_URL            - Application base URL
  CRON_API_KEY                   - Optional cron authentication key
`);
}

async function main() {
  const command = process.argv[2];

  console.log('📅 QStash Schedule Manager\n');

  switch (command) {
    case 'schedule':
      await scheduleAllJobs();
      break;
    case 'list':
      await listSchedules();
      break;
    case 'cleanup':
      await deleteAllSchedules();
      break;
    case 'stats':
      await showStats();
      break;
    case 'help':
    case undefined:
      showHelp();
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('💡 Use "help" to see available commands');
      process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
