/**
 * QStash configuration
 * Centralized configuration for QStash integration
 */

// Get the base URL for the application
const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  ? process.env.NEXT_PUBLIC_APP_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

export const qstash = {
  // Application base URL for constructing webhook endpoints
  baseUrl,

  // Default retry settings
  defaultRetries: 3,

  // Default schedule configurations
  schedules: {
    processTasks: {
      endpoint: '/api/cron/process-tasks',
      cron: '0 4 * * *', // Daily at 4 AM
    },
    processExpertTransfers: {
      endpoint: '/api/cron/process-expert-transfers',
      interval: '2h', // Every 2 hours
    },
    checkUpcomingPayouts: {
      endpoint: '/api/cron/check-upcoming-payouts',
      cron: '0 12 * * *', // Daily at noon
    },
    cleanupExpiredReservations: {
      endpoint: '/api/cron/cleanup-expired-reservations',
      cron: '*/15 * * * *', // Every 15 minutes
    },
    cleanupBlockedDates: {
      endpoint: '/api/cron/cleanup-blocked-dates',
      cron: '0 0 * * *', // Daily at midnight UTC
    },
    appointmentReminders: {
      endpoint: '/api/cron/appointment-reminders',
      cron: '0 9 * * *', // Daily at 9 AM
    },
  },
};
