#!/usr/bin/env node

/**
 * Novu Connection Test
 *
 * Tests Novu API connectivity and validates credentials
 * Run with: node -r dotenv/config scripts/test-novu-connection.js
 * or: npm run test:novu
 * Note: These variables are defined in config/env.ts for centralized access
 */

// Environment variables (also defined in config/env.ts)
const NOVU_SECRET_KEY = process.env.NOVU_SECRET_KEY;
const NOVU_BASE_URL = process.env.NOVU_BASE_URL || 'https://eu.api.novu.co';
const NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER = process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER;

async function testConnection() {
  console.log('🔍 Testing Novu API connection...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`  NOVU_BASE_URL: ${NOVU_BASE_URL}`);
  console.log(
    `  NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER: ${NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER || '❌ Not set'}`,
  );
  console.log(`  NOVU_SECRET_KEY: ${NOVU_SECRET_KEY ? '✅ Set (hidden)' : '❌ Not set'}`);

  const apiKey = NOVU_SECRET_KEY;

  if (!apiKey || !NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER) {
    console.error('❌ Missing required environment variables');
    console.log('\nRequired variables:');
    console.log('  NOVU_SECRET_KEY=novu_secret_key_here');
    console.log('  NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=app_identifier_here');
    console.log('\nSee docs/02-core-systems/notifications/ for setup details');
    process.exit(1);
  }

  try {
    // Test basic API connectivity - Get current user/organization
    console.log('🌐 Testing API connectivity...');
    const meResponse = await fetch(`${NOVU_BASE_URL}/v1/organizations/me`, {
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!meResponse.ok) {
      throw new Error(`HTTP ${meResponse.status}: ${meResponse.statusText}`);
    }

    const org = await meResponse.json();
    console.log(`✅ Connected to organization: ${org.data?.name || 'Unknown'}`);
    console.log(`   Organization ID: ${org.data?._id || 'N/A'}`);
    console.log(`   Environment: ${org.data?.domain || 'N/A'}\n`);

    // Test workflows access
    console.log('🔄 Testing workflows access...');
    const workflowsResponse = await fetch(`${NOVU_BASE_URL}/v1/workflows`, {
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!workflowsResponse.ok) {
      throw new Error(`Workflows API error: ${workflowsResponse.status}`);
    }

    const workflows = await workflowsResponse.json();
    console.log(`✅ Found ${workflows.data?.length || 0} existing workflows`);

    if (workflows.data && workflows.data.length > 0) {
      console.log('   Recent workflows:');
      workflows.data.slice(0, 3).forEach((w) => {
        console.log(`     - ${w.name} (ID: ${w._id})`);
      });
    }
    console.log();

    // Test subscribers access
    console.log('👥 Testing subscribers access...');
    const subscribersResponse = await fetch(`${NOVU_BASE_URL}/v1/subscribers?limit=5`, {
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!subscribersResponse.ok) {
      throw new Error(`Subscribers API error: ${subscribersResponse.status}`);
    }

    const subscribers = await subscribersResponse.json();
    console.log(`✅ Found ${subscribers.totalCount || 0} subscribers`);
    console.log();

    // Test notification templates access
    console.log('📧 Testing notification templates access...');
    const templatesResponse = await fetch(`${NOVU_BASE_URL}/v1/notification-templates?limit=5`, {
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!templatesResponse.ok) {
      throw new Error(`Templates API error: ${templatesResponse.status}`);
    }

    const templates = await templatesResponse.json();
    console.log(`✅ Found ${templates.totalCount || 0} notification templates`);

    if (templates.data && templates.data.length > 0) {
      console.log('   Recent templates:');
      templates.data.slice(0, 3).forEach((t) => {
        console.log(`     - ${t.name} (${t.triggers?.[0]?.identifier || 'No trigger'})`);
      });
    }
    console.log();

    // Test activity feed
    console.log('📊 Testing activity feed...');
    const activityResponse = await fetch(`${NOVU_BASE_URL}/v1/activity?limit=1`, {
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (activityResponse.ok) {
      const activity = await activityResponse.json();
      if (activity.data && activity.data.length > 0) {
        console.log('✅ Activity data is available');
        console.log(`   Latest activity: ${activity.data[0].template?.name || 'Unknown'}`);
      } else {
        console.log('✅ Activity feed accessible (no activity data yet)');
      }
    } else if (activityResponse.status === 404) {
      console.log('✅ Activity feed endpoint not available (expected for some accounts)');
    } else {
      throw new Error(`Activity API error: ${activityResponse.status}`);
    }
    console.log();

    console.log('🎉 All tests passed! You can now run:');
    console.log('   npm run setup:novu-workflows');
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your API key has the correct permissions');
    console.log('2. Verify your application identifier is correct');
    console.log('3. Ensure you have network access to Novu');
    console.log('4. Check if your API key has expired');
    console.log('5. Verify you are using the correct API endpoint (EU vs US)');
    process.exit(1);
  }
}

// Permission check
async function checkPermissions() {
  console.log('🔐 Checking API permissions...\n');

  const apiKey = NOVU_SECRET_KEY;

  const endpoints = [
    { name: 'Organizations', endpoint: 'organizations/me', method: 'GET' },
    { name: 'Workflows Read', endpoint: 'workflows', method: 'GET' },
    {
      name: 'Workflows Write',
      endpoint: 'workflows',
      method: 'POST',
      data: { name: 'Test Workflow - Delete Me', description: 'Permission test' },
    },
    { name: 'Subscribers Read', endpoint: 'subscribers', method: 'GET' },
    { name: 'Notification Templates', endpoint: 'notification-templates', method: 'GET' },
    { name: 'Activity Feed', endpoint: 'activity', method: 'GET' },
  ];

  for (const test of endpoints) {
    try {
      const options = {
        method: test.method,
        headers: {
          Authorization: `ApiKey ${apiKey}`,
          'Content-Type': 'application/json',
        },
      };

      if (test.data) {
        options.body = JSON.stringify(test.data);
      }

      const response = await fetch(`${NOVU_BASE_URL}/v1/${test.endpoint}`, options);

      if (response.ok) {
        console.log(`✅ ${test.name}: Permission granted`);

        // Clean up test workflow if created
        if (test.name === 'Workflows Write') {
          const created = await response.json();
          if (created.data?._id) {
            await fetch(`${NOVU_BASE_URL}/v1/workflows/${created.data._id}`, {
              method: 'DELETE',
              headers: {
                Authorization: `ApiKey ${apiKey}`,
              },
            });
            console.log('   (Test workflow cleaned up)');
          }
        }
      } else {
        console.log(`❌ ${test.name}: Permission denied (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: Error - ${error.message}`);
    }
  }
}

// Run tests
if (require.main === module) {
  if (process.argv.includes('--permissions')) {
    checkPermissions();
  } else {
    testConnection();
  }
}

module.exports = { testConnection, checkPermissions };
