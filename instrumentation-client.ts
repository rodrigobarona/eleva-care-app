import { initBotId } from 'botid/client/core';

/**
 * BotID Client Configuration for Eleva Care
 *
 * This configuration protects high-value routes from bot attacks:
 * - Payment processing endpoints
 * - Meeting booking flows
 * - User registration and profile management
 * - File uploads and sensitive operations
 *
 * Routes are configured with appropriate protection levels:
 * - deepAnalysis: For critical payment and booking operations
 * - basic: For general form submissions and user operations
 */

initBotId({
  protect: [
    // 🔥 CRITICAL: Payment & Booking Endpoints (Deep Analysis)
    {
      path: '/api/create-payment-intent',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'deepAnalysis',
      },
    },

    // 🎯 HIGH PRIORITY: Meeting Creation Server Actions
    // Note: Server actions are invoked from pages, so we protect the pages that use them
    {
      path: '/*/booking',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'deepAnalysis',
      },
    },
    {
      path: '/*/booking/*',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'deepAnalysis',
      },
    },

    // 📁 File Upload Protection
    {
      path: '/api/upload',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'deepAnalysis',
      },
    },

    // 👤 User Profile & Account Management
    {
      path: '/account',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },
    {
      path: '/setup',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },
    {
      path: '/setup/*',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },

    // 💳 Billing & Stripe Operations
    {
      path: '/api/user/billing',
      method: 'GET',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },
    {
      path: '/api/stripe/dashboard',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },

    // 🛠️ Administrative Operations
    {
      path: '/api/admin/*',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },
    {
      path: '/admin/*',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },

    // 📅 Appointments & Events Management
    {
      path: '/appointments',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },
    {
      path: '/dashboard',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },

    // 🔧 Categories and Settings
    {
      path: '/api/categories',
      method: 'POST',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },

    // 📧 Email Testing (Development/Admin)
    {
      path: '/api/test-email',
      method: 'GET',
      advancedOptions: {
        checkLevel: 'basic',
      },
    },
  ],
});
