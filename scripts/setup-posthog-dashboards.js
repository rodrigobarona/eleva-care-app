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
    throw new Error(`PostHog API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Dashboard configurations
const dashboards = [
  {
    name: 'Application Overview',
    description: 'High-level application health and usage metrics',
    tiles: [
      {
        name: 'Daily Active Users',
        query: {
          kind: 'EventsQuery',
          select: ['count(distinct(person_id))'],
          event: '$pageview',
          interval: 'day',
          dateRange: { date_from: '-30d' },
        },
        layout: { x: 0, y: 0, w: 6, h: 4 },
      },
      {
        name: 'Page Views by Route Type',
        query: {
          kind: 'EventsQuery',
          select: ['count()'],
          event: '$pageview',
          breakdowns: ['properties.route_type'],
          interval: 'day',
          dateRange: { date_from: '-7d' },
        },
        layout: { x: 6, y: 0, w: 6, h: 4 },
      },
      {
        name: 'User Authentication Rate',
        query: {
          kind: 'EventsQuery',
          select: ['count()'],
          event: '$pageview',
          breakdowns: ['properties.user_authenticated'],
          interval: 'day',
          dateRange: { date_from: '-7d' },
        },
        layout: { x: 0, y: 4, w: 6, h: 4 },
      },
      {
        name: 'Error Rate Trends',
        query: {
          kind: 'EventsQuery',
          select: ['count()'],
          event: 'javascript_error',
          interval: 'hour',
          dateRange: { date_from: '-24h' },
        },
        layout: { x: 6, y: 4, w: 6, h: 4 },
      },
    ],
  },
  {
    name: 'Health Check Monitoring',
    description: 'System health and infrastructure monitoring',
    tiles: [
      {
        name: 'Health Check Success Rate',
        query: {
          kind: 'EventsQuery',
          select: ['count()'],
          event: ['health_check_success', 'health_check_failed'],
          breakdowns: ['event'],
          interval: 'hour',
          dateRange: { date_from: '-24h' },
        },
        layout: { x: 0, y: 0, w: 8, h: 4 },
      },
      {
        name: 'Memory Usage Distribution',
        query: {
          kind: 'EventsQuery',
          select: ['avg(toFloat64(properties.memory.percentage))'],
          event: ['health_check_success', 'health_check_failed'],
          interval: 'hour',
          dateRange: { date_from: '-24h' },
        },
        layout: { x: 8, y: 0, w: 4, h: 4 },
      },
      {
        name: 'Environment Health Status',
        query: {
          kind: 'EventsQuery',
          select: ['count()'],
          event: ['health_check_success', 'health_check_failed'],
          breakdowns: ['properties.environment', 'event'],
          dateRange: { date_from: '-24h' },
        },
        layout: { x: 0, y: 4, w: 12, h: 4 },
      },
    ],
  },
  {
    name: 'User Experience',
    description: 'User behavior and experience optimization',
    tiles: [
      {
        name: 'Page Load Performance',
        query: {
          kind: 'EventsQuery',
          select: ['avg(toFloat64(properties.load_time))'],
          event: 'page_performance',
          breakdowns: ['properties.pathname'],
          dateRange: { date_from: '-7d' },
        },
        layout: { x: 0, y: 0, w: 8, h: 4 },
      },
      {
        name: 'User Journey Flow',
        query: {
          kind: 'FunnelsQuery',
          series: [
            { event: '$pageview', name: 'Page View' },
            { event: 'user_signed_in', name: 'Sign In' },
            { event: 'business_appointment_booked', name: 'Booking' },
          ],
          dateRange: { date_from: '-30d' },
        },
        layout: { x: 8, y: 0, w: 4, h: 4 },
      },
      {
        name: 'Feature Flag Exposure',
        query: {
          kind: 'EventsQuery',
          select: ['count()'],
          event: 'feature_flag_exposure',
          breakdowns: ['properties.flag_key', 'properties.flag_value'],
          dateRange: { date_from: '-7d' },
        },
        layout: { x: 0, y: 4, w: 12, h: 4 },
      },
    ],
  },
  {
    name: 'Business Intelligence',
    description: 'Business metrics and revenue optimization',
    tiles: [
      {
        name: 'Conversion Funnel',
        query: {
          kind: 'FunnelsQuery',
          series: [
            { event: '$pageview', name: 'Page Visit' },
            { event: 'business_expert_contacted', name: 'Expert Contact' },
            { event: 'business_appointment_booked', name: 'Appointment' },
            { event: 'business_payment_completed', name: 'Payment' },
          ],
          dateRange: { date_from: '-30d' },
        },
        layout: { x: 0, y: 0, w: 12, h: 6 },
      },
      {
        name: 'Business Events Trends',
        query: {
          kind: 'EventsQuery',
          select: ['count()'],
          event: [
            'business_appointment_booked',
            'business_payment_completed',
            'business_expert_contacted',
          ],
          breakdowns: ['event'],
          interval: 'day',
          dateRange: { date_from: '-30d' },
        },
        layout: { x: 0, y: 6, w: 8, h: 4 },
      },
      {
        name: 'Revenue Metrics',
        query: {
          kind: 'EventsQuery',
          select: ['sum(toFloat64(properties.amount))'],
          event: 'business_payment_completed',
          interval: 'day',
          dateRange: { date_from: '-30d' },
        },
        layout: { x: 8, y: 6, w: 4, h: 4 },
      },
    ],
  },
  {
    name: 'Technical Performance',
    description: 'Application performance and error monitoring',
    tiles: [
      {
        name: 'JavaScript Error Rate by Page',
        query: {
          kind: 'EventsQuery',
          select: ['count()'],
          event: 'javascript_error',
          breakdowns: ['properties.pathname'],
          dateRange: { date_from: '-7d' },
        },
        layout: { x: 0, y: 0, w: 8, h: 4 },
      },
      {
        name: 'API Performance',
        query: {
          kind: 'EventsQuery',
          select: ['avg(toFloat64(properties.value))'],
          event: 'performance_metric',
          filters: [{ key: 'properties.metric', operator: 'exact', value: 'api_call_time' }],
          breakdowns: ['properties.endpoint'],
          dateRange: { date_from: '-24h' },
        },
        layout: { x: 8, y: 0, w: 4, h: 4 },
      },
      {
        name: 'Core Web Vitals',
        query: {
          kind: 'EventsQuery',
          select: ['percentile(toFloat64(properties.load_time), 0.95)'],
          event: 'page_performance',
          interval: 'hour',
          dateRange: { date_from: '-24h' },
        },
        layout: { x: 0, y: 4, w: 6, h: 4 },
      },
      {
        name: 'Error Types Distribution',
        query: {
          kind: 'EventsQuery',
          select: ['count()'],
          event: ['javascript_error', 'unhandled_promise_rejection', 'react_error_boundary'],
          breakdowns: ['event'],
          dateRange: { date_from: '-7d' },
        },
        layout: { x: 6, y: 4, w: 6, h: 4 },
      },
    ],
  },
];

// Create dashboard
async function createDashboard(dashboardConfig) {
  console.log(`📊 Creating dashboard: ${dashboardConfig.name}`);

  try {
    // Create the dashboard
    const dashboard = await postHogAPI('dashboards/', 'POST', {
      name: dashboardConfig.name,
      description: dashboardConfig.description,
      pinned: true,
      creation_mode: 'template',
    });

    console.log(`✅ Dashboard created with ID: ${dashboard.id}`);

    // Create tiles for the dashboard
    for (const tile of dashboardConfig.tiles) {
      console.log(`  📈 Adding tile: ${tile.name}`);

      const insight = await postHogAPI('insights/', 'POST', {
        name: tile.name,
        query: tile.query,
        dashboards: [dashboard.id],
      });

      // Add tile to dashboard with layout
      await postHogAPI(`dashboards/${dashboard.id}/tiles/`, 'POST', {
        insight: insight.id,
        layouts: {
          sm: tile.layout,
        },
      });
    }

    console.log(`✅ Dashboard "${dashboardConfig.name}" setup complete\n`);
    return dashboard;
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
      const dashboard = await createDashboard(dashboardConfig);
      createdDashboards.push(dashboard);
    }

    console.log('🎉 All dashboards created successfully!');
    console.log('\nCreated dashboards:');
    createdDashboards.forEach((d) => {
      console.log(`  - ${d.name}: ${POSTHOG_HOST}/project/${POSTHOG_PROJECT_ID}/dashboard/${d.id}`);
    });

    // Save dashboard URLs to a file
    const dashboardUrls = createdDashboards.map((d) => ({
      name: d.name,
      id: d.id,
      url: `${POSTHOG_HOST}/project/${POSTHOG_PROJECT_ID}/dashboard/${d.id}`,
    }));

    fs.writeFileSync(
      path.join(__dirname, '../docs/posthog-dashboard-urls.json'),
      JSON.stringify(dashboardUrls, null, 2),
    );

    console.log('\n📝 Dashboard URLs saved to docs/posthog-dashboard-urls.json');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  setupDashboards();
}

module.exports = { setupDashboards, createDashboard, postHogAPI };
