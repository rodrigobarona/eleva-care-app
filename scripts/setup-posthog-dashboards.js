#!/usr/bin/env node

/**
 * PostHog Dashboard Setup Script
 *
 * Creates the comprehensive dashboard suite for Eleva Care
 * Run with: node -r dotenv/config scripts/setup-posthog-dashboards.js
 * or: npm run setup:posthog-dashboards
 * Note: These variables are also defined in config/env.ts for centralized access
 */

const fs = require('fs');
const path = require('path');

// PostHog API configuration
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
  console.error('❌ Missing required environment variables: POSTHOG_API_KEY, POSTHOG_PROJECT_ID');
  process.exit(1);
}

// API helper function
async function postHogAPI(endpoint, method = 'GET', data = null) {
  const url = `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/${endpoint}`;

  const options = {
    method,
    headers: {
      Authorization: `Bearer ${POSTHOG_API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PostHog API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// Updated dashboard configurations with legacy filter structures that the PostHog API expects
const dashboards = [
  {
    name: 'Application Overview',
    description: 'High-level application health and usage metrics',
    insights: [
      {
        name: 'Daily Active Users',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: '$pageview',
              name: '$pageview',
              type: 'events',
              order: 0,
              math: 'dau',
            },
          ],
          interval: 'day',
          date_from: '-30d',
          date_to: null,
        },
      },
      {
        name: 'Total Page Views',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: '$pageview',
              name: '$pageview',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          interval: 'day',
          date_from: '-7d',
          date_to: null,
        },
      },
      {
        name: 'Weekly Active Users',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: '$pageview',
              name: '$pageview',
              type: 'events',
              order: 0,
              math: 'weekly_active',
            },
          ],
          interval: 'day',
          date_from: '-30d',
          date_to: null,
        },
      },
      {
        name: 'Error Events',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: '$exception',
              name: '$exception',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          interval: 'hour',
          date_from: '-24h',
          date_to: null,
        },
      },
    ],
  },
  {
    name: 'Health Check Monitoring',
    description: 'System health and infrastructure monitoring',
    insights: [
      {
        name: 'Health Check Success',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'health_check_success',
              name: 'health_check_success',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          interval: 'hour',
          date_from: '-24h',
          date_to: null,
        },
      },
      {
        name: 'Health Check Failures',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'health_check_failed',
              name: 'health_check_failed',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          interval: 'hour',
          date_from: '-24h',
          date_to: null,
        },
      },
      {
        name: 'System Uptime',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'health_check_success',
              name: 'health_check_success',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          interval: 'hour',
          date_from: '-24h',
          date_to: null,
        },
      },
    ],
  },
  {
    name: 'User Experience',
    description: 'User behavior and experience optimization',
    insights: [
      {
        name: 'Page Performance Events',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'page_performance',
              name: 'page_performance',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-7d',
          date_to: null,
        },
      },
      {
        name: 'User Journey Funnel',
        filters: {
          insight: 'FUNNELS',
          events: [
            {
              id: '$pageview',
              name: 'Page View',
              type: 'events',
              order: 0,
            },
            {
              id: 'user_signed_in',
              name: 'Sign In',
              type: 'events',
              order: 1,
            },
            {
              id: 'business_appointment_booked',
              name: 'Booking',
              type: 'events',
              order: 2,
            },
          ],
          date_from: '-30d',
          date_to: null,
        },
      },
      {
        name: 'Feature Flag Events',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: '$feature_flag_called',
              name: '$feature_flag_called',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-7d',
          date_to: null,
        },
      },
    ],
  },
  {
    name: 'Business Intelligence',
    description: 'Business metrics and revenue optimization',
    insights: [
      {
        name: 'Conversion Funnel',
        filters: {
          insight: 'FUNNELS',
          events: [
            {
              id: '$pageview',
              name: 'Page Visit',
              type: 'events',
              order: 0,
            },
            {
              id: 'business_expert_contacted',
              name: 'Expert Contact',
              type: 'events',
              order: 1,
            },
            {
              id: 'business_appointment_booked',
              name: 'Appointment',
              type: 'events',
              order: 2,
            },
            {
              id: 'business_payment_completed',
              name: 'Payment',
              type: 'events',
              order: 3,
            },
          ],
          date_from: '-30d',
          date_to: null,
        },
      },
      {
        name: 'Appointment Bookings',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'business_appointment_booked',
              name: 'business_appointment_booked',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          interval: 'day',
          date_from: '-30d',
          date_to: null,
        },
      },
      {
        name: 'Payment Completions',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'business_payment_completed',
              name: 'business_payment_completed',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          interval: 'day',
          date_from: '-30d',
          date_to: null,
        },
      },
      {
        name: 'Expert Contacts',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'business_expert_contacted',
              name: 'business_expert_contacted',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          interval: 'day',
          date_from: '-30d',
          date_to: null,
        },
      },
    ],
  },
  {
    name: 'Technical Performance',
    description: 'Application performance and error monitoring',
    insights: [
      {
        name: 'JavaScript Errors',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: '$exception',
              name: '$exception',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-7d',
          date_to: null,
        },
      },
      {
        name: 'API Calls',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'api_call',
              name: 'api_call',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          date_from: '-24h',
          date_to: null,
        },
      },
      {
        name: 'Page Performance',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: 'page_performance',
              name: 'page_performance',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          interval: 'hour',
          date_from: '-24h',
          date_to: null,
        },
      },
      {
        name: 'Error Rate Trend',
        filters: {
          insight: 'TRENDS',
          events: [
            {
              id: '$exception',
              name: '$exception',
              type: 'events',
              order: 0,
              math: 'total',
            },
          ],
          interval: 'hour',
          date_from: '-24h',
          date_to: null,
        },
      },
    ],
  },
];

// Create insights first, then dashboard
async function createInsight(insightConfig) {
  console.log(`  📈 Creating insight: ${insightConfig.name}`);

  try {
    const insight = await postHogAPI('insights/', 'POST', {
      name: insightConfig.name,
      filters: insightConfig.filters,
      description: `Insight for ${insightConfig.name}`,
    });

    console.log(`  ✅ Insight created with ID: ${insight.id}`);
    return insight;
  } catch (error) {
    console.error(`  ❌ Error creating insight "${insightConfig.name}":`, error.message);
    throw error;
  }
}

// Create dashboard and add insights to it
async function createDashboard(dashboardConfig) {
  console.log(`📊 Creating dashboard: ${dashboardConfig.name}`);

  try {
    // Create the dashboard first
    const dashboard = await postHogAPI('dashboards/', 'POST', {
      name: dashboardConfig.name,
      description: dashboardConfig.description,
      pinned: true,
    });

    console.log(`✅ Dashboard created with ID: ${dashboard.id}`);

    // Create insights and add them to the dashboard
    const createdInsights = [];
    for (const insightConfig of dashboardConfig.insights) {
      const insight = await createInsight(insightConfig);

      // Add insight to dashboard by updating the insight's dashboards array
      try {
        await postHogAPI(`insights/${insight.id}/`, 'PATCH', {
          dashboards: [dashboard.id],
        });
        console.log(`  📌 Added insight "${insight.name}" to dashboard`);
        createdInsights.push(insight);
      } catch (error) {
        console.warn(`  ⚠️ Warning: Could not add insight to dashboard: ${error.message}`);
        // Continue with other insights
      }
    }

    console.log(
      `✅ Dashboard "${dashboardConfig.name}" setup complete with ${createdInsights.length} insights\n`,
    );
    return { dashboard, insights: createdInsights };
  } catch (error) {
    console.error(`❌ Error creating dashboard "${dashboardConfig.name}":`, error.message);
    throw error;
  }
}

// Main setup function
async function setupDashboards() {
  console.log('🚀 Setting up PostHog dashboards for Eleva Care...\n');

  try {
    const createdDashboards = [];

    for (const dashboardConfig of dashboards) {
      const result = await createDashboard(dashboardConfig);
      createdDashboards.push(result);
    }

    console.log('🎉 All dashboards created successfully!');
    console.log('\nCreated dashboards:');
    createdDashboards.forEach((result) => {
      const d = result.dashboard;
      console.log(`  - ${d.name}: ${POSTHOG_HOST}/project/${POSTHOG_PROJECT_ID}/dashboard/${d.id}`);
      console.log(`    Insights: ${result.insights.length}`);
    });

    // Save dashboard URLs to a file
    const dashboardUrls = createdDashboards.map((result) => ({
      name: result.dashboard.name,
      id: result.dashboard.id,
      url: `${POSTHOG_HOST}/project/${POSTHOG_PROJECT_ID}/dashboard/${result.dashboard.id}`,
      insights: result.insights.length,
    }));

    fs.writeFileSync(
      path.join(__dirname, '../docs/posthog-dashboard-urls.json'),
      JSON.stringify(dashboardUrls, null, 2),
    );

    console.log('\n📝 Dashboard URLs saved to docs/posthog-dashboard-urls.json');
    console.log(
      '🎯 Total insights created:',
      createdDashboards.reduce((sum, d) => sum + d.insights.length, 0),
    );
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your PostHog API key has dashboard and insight permissions');
    console.log('2. Verify your project ID is correct');
    console.log('3. Ensure your PostHog instance URL is correct');
    console.log('4. Check if you have network access to PostHog');
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  setupDashboards();
}

module.exports = { setupDashboards, createDashboard, createInsight, postHogAPI };
