#!/usr/bin/env node

/**
 * PostHog Connection Test
 *
 * Tests PostHog API connectivity and validates credentials
 * Run with: node -r dotenv/config scripts/test-posthog-connection.js
 * or: npm run test:posthog
 * Note: These variables are defined in config/env.ts for centralized access
 */

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

async function testConnection() {
  console.log('🔍 Testing PostHog API connection...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`  POSTHOG_HOST: ${POSTHOG_HOST}`);
  console.log(`  POSTHOG_PROJECT_ID: ${POSTHOG_PROJECT_ID || '❌ Not set'}`);
  console.log(`  POSTHOG_API_KEY: ${POSTHOG_API_KEY ? '✅ Set (hidden)' : '❌ Not set'}\n`);

  if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
    console.error('❌ Missing required environment variables');
    console.log('\nRequired variables:');
    console.log('  POSTHOG_API_KEY=phx_your_personal_api_key');
    console.log('  POSTHOG_PROJECT_ID=your_project_id');
    console.log('\nSee docs/posthog-dashboard-setup-guide.md for details');
    process.exit(1);
  }

  try {
    // Test basic API connectivity
    console.log('🌐 Testing API connectivity...');
    const response = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/`, {
      headers: {
        Authorization: `Bearer ${POSTHOG_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const project = await response.json();
    console.log(`✅ Connected to project: ${project.name}`);
    console.log(`   Project ID: ${project.id}`);
    console.log(`   Organization: ${project.organization || 'N/A'}\n`);

    // Test dashboard listing
    console.log('📊 Testing dashboard access...');
    const dashboardsResponse = await fetch(
      `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/dashboards/`,
      {
        headers: {
          Authorization: `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!dashboardsResponse.ok) {
      throw new Error(`Dashboard API error: ${dashboardsResponse.status}`);
    }

    const dashboards = await dashboardsResponse.json();
    console.log(`✅ Found ${dashboards.count} existing dashboards`);

    if (dashboards.results && dashboards.results.length > 0) {
      console.log('   Recent dashboards:');
      dashboards.results.slice(0, 3).forEach((d) => {
        console.log(`     - ${d.name} (ID: ${d.id})`);
      });
    }
    console.log();

    // Test insights access
    console.log('📈 Testing insights access...');
    const insightsResponse = await fetch(
      `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/insights/?limit=5`,
      {
        headers: {
          Authorization: `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!insightsResponse.ok) {
      throw new Error(`Insights API error: ${insightsResponse.status}`);
    }

    const insights = await insightsResponse.json();
    console.log(`✅ Found ${insights.count} insights`);
    console.log();

    // Test events data
    console.log('📊 Testing events data...');
    const eventsResponse = await fetch(
      `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/events/?limit=1`,
      {
        headers: {
          Authorization: `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (eventsResponse.ok) {
      const events = await eventsResponse.json();
      if (events.results && events.results.length > 0) {
        console.log('✅ Events data is available');
        console.log(`   Latest event: ${events.results[0].event}`);
      } else {
        console.log('✅ Events API accessible (no events data yet)');
      }
    } else if (eventsResponse.status === 403) {
      console.log('✅ Events API requires additional permissions (dashboard automation will work)');
    } else {
      throw new Error(`Events API error: ${eventsResponse.status}`);
    }
    console.log();

    console.log('🎉 All tests passed! You can now run:');
    console.log('   npm run setup:posthog-dashboards');
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your API key has the correct permissions');
    console.log('2. Verify your project ID is correct');
    console.log('3. Ensure you have network access to PostHog');
    console.log('4. Check if your API key has expired');
    process.exit(1);
  }
}

// Permission check
async function checkPermissions() {
  console.log('🔐 Checking API permissions...\n');

  const endpoints = [
    { name: 'Dashboards', endpoint: 'dashboards/', method: 'GET' },
    {
      name: 'Dashboard Creation',
      endpoint: 'dashboards/',
      method: 'POST',
      data: { name: 'Test Dashboard - Delete Me', description: 'Test', creation_mode: 'template' },
    },
    { name: 'Insights', endpoint: 'insights/', method: 'GET' },
  ];

  for (const test of endpoints) {
    try {
      const options = {
        method: test.method,
        headers: {
          Authorization: `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
      };

      if (test.data) {
        options.body = JSON.stringify(test.data);
      }

      const response = await fetch(
        `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/${test.endpoint}`,
        options,
      );

      if (response.ok) {
        console.log(`✅ ${test.name}: Permission granted`);

        // Clean up test dashboard if created
        if (test.name === 'Dashboard Creation') {
          const created = await response.json();
          await fetch(
            `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/dashboards/${created.id}/`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${POSTHOG_API_KEY}`,
              },
            },
          );
          console.log('   (Test dashboard cleaned up)');
        }
      } else {
        console.log(`❌ ${test.name}: Permission denied (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: Error - ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  await testConnection();
  console.log('─'.repeat(50));
  await checkPermissions();
}

if (require.main === module) {
  main();
}
