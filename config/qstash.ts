/**
 * QStash configuration
 * Centralized configuration for QStash integration
 *
 * ✅ Updated to match ALL actual cron endpoints with optimal scheduling
 */

// Get the base URL for the application
const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  ? process.env.NEXT_PUBLIC_APP_URL
  : process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

export const qstash = {
  // Application base URL for constructing webhook endpoints
  baseUrl,

  // Default retry settings
  defaultRetries: 3,

  // Default timezone for cron schedules
  defaultTimezone: 'UTC',

  // Default schedule configurations
  schedules: {
    // Note: keep-alive is handled by Vercel cron (vercel.json) for maximum reliability
    // This ensures system health checks run even if QStash service is down

    // 📅 APPOINTMENT MANAGEMENT
    appointmentReminders: {
      endpoint: '/api/cron/appointment-reminders',
      cron: '0 8,20 * * *', // Twice daily - 24-hour reminders with widened window
      description: '24-hour appointment reminders for confirmed bookings',
      priority: 'high',
    },

    appointmentReminders1Hr: {
      endpoint: '/api/cron/appointment-reminders-1hr',
      cron: '0 7,19 * * *', // Twice daily - same-half-day appointment reminders
      description: 'Same-half-day appointment reminders for upcoming sessions',
      priority: 'high',
    },

    // 💰 PAYMENT & PAYOUT PROCESSING
    processExpertTransfers: {
      endpoint: '/api/cron/process-expert-transfers',
      cron: '0 8 * * *', // Daily at 8 AM UTC - process aged payments
      description: 'Process pending expert payouts based on aging requirements',
      priority: 'critical',
    },

    processPendingPayouts: {
      endpoint: '/api/cron/process-pending-payouts',
      cron: '0 6 * * *', // Daily at 6 AM UTC - check and prepare payouts
      description: 'Check and prepare expert payouts for processing',
      priority: 'high',
    },

    checkUpcomingPayouts: {
      endpoint: '/api/cron/check-upcoming-payouts',
      cron: '0 12 * * *', // Daily at noon UTC - notify about upcoming payouts
      description: 'Notify experts about upcoming payouts and account status',
      priority: 'medium',
    },

    sendPaymentReminders: {
      endpoint: '/api/cron/send-payment-reminders',
      cron: '0 9 * * *', // Daily at 9 AM UTC - Multibanco payment reminders
      description: 'Send staged Multibanco payment reminders (Day 3 gentle, Day 6 urgent)',
      priority: 'high',
    },

    // 🧹 CLEANUP & MAINTENANCE
    cleanupExpiredReservations: {
      endpoint: '/api/cron/cleanup-expired-reservations',
      cron: '0 6,18 * * *', // Twice daily - remove expired slot reservations
      description: 'Clean up expired slot reservations and pending payments',
      priority: 'medium',
    },

    cleanupBlockedDates: {
      endpoint: '/api/cron/cleanup-blocked-dates',
      cron: '0 0 * * *', // Daily at midnight UTC - remove old blocked dates
      description: 'Remove old blocked dates and calendar conflicts',
      priority: 'low',
    },

    // ⚙️ GENERAL TASK PROCESSING
    processTasks: {
      endpoint: '/api/cron/process-tasks',
      cron: '0 4 * * *', // Daily at 4 AM UTC - general system maintenance
      description: 'General system maintenance, audit logs, and administrative tasks',
      priority: 'medium',
    },
  },

  // 🔧 Configuration helpers
  priorities: {
    critical: ['processExpertTransfers'], // keep-alive handled by Vercel cron for reliability
    high: [
      'appointmentReminders',
      'appointmentReminders1Hr',
      'processPendingPayouts',
      'sendPaymentReminders',
    ],
    medium: ['cleanupExpiredReservations', 'processTasks', 'checkUpcomingPayouts'],
    low: ['cleanupBlockedDates'],
  },

  // 📊 Monitoring configuration
  monitoring: {
    healthCheck: {
      endpoint: '/api/healthcheck',
      expectedResponse: { status: 'healthy' },
      timeout: 10000, // 10 seconds
    },
    alerting: {
      failureThreshold: 3, // Alert after 3 consecutive failures
      channels: ['email', 'in-app'], // via Novu
    },
  },

  // 🔒 Security configuration
  security: {
    requiredHeaders: ['Upstash-Signature'],
    // Match user agent case-insensitively at the edge/middleware
    allowedUserAgents: ['upstash', 'qstash'],
    fallbackAuth: process.env.NODE_ENV === 'production' ? false : true,
  },
};
