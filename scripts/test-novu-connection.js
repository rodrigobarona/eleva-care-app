#!/usr/bin/env node
/**
 * Novu Connection Test
 *
 * Tests Novu API connectivity and validates credentials
 * Run with: node -r dotenv/config scripts/test-novu-connection.js
 * or: npm run test:novu
 * Note: These variables are defined in config/env.ts for centralized access
 */
import { Novu } from '@novu/node';

// Environment variables (also defined in config/env.ts)
const NOVU_SECRET_KEY = process.env.NOVU_SECRET_KEY;
const NOVU_API_KEY = process.env.NOVU_API_KEY;
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
  console.log(`  NOVU_API_KEY: ${NOVU_API_KEY ? '✅ Set (hidden)' : '❌ Not set'}\n`);

  const apiKey = NOVU_SECRET_KEY || NOVU_API_KEY;

  if (!apiKey || !NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER) {
    console.error('❌ Missing required environment variables');
    console.log('\nRequired variables:');
    console.log('  NOVU_SECRET_KEY=novu_secret_key_here (or NOVU_API_KEY)');
    console.log('  NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER=app_identifier_here');
    console.log('\nSee docs/02-core-systems/notifications/ for setup details');
    process.exit(1);
  }

  try {
    // Initialize Novu client
    const novu = new Novu(apiKey, {
      backendUrl: NOVU_BASE_URL,
    });

    // Test organization access
    console.log('🌐 Testing API connectivity...');
    const org = await novu.organizations.getOrganization();
    console.log(`✅ Connected to organization: ${org.data?.name || 'Unknown'}`);
    console.log(`   Organization ID: ${org.data?._id || 'N/A'}`);
    console.log(`   Environment: ${org.data?.domain || 'N/A'}\n`);

    // Test workflows access
    console.log('🔄 Testing workflows access...');
    const workflows = await novu.notificationGroups.list();
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
    const subscribers = await novu.subscribers.list({ page: 0, limit: 5 });
    console.log(`✅ Found ${subscribers.totalCount || 0} subscribers`);
    console.log();

    // Test notification templates access
    console.log('📧 Testing notification templates access...');
    const templates = await novu.notificationTemplates.list({ page: 0, limit: 5 });
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
    const activities = await novu.activities.list({ page: 0, limit: 1 });

    if (activities.data && activities.data.length > 0) {
      console.log('✅ Activity data is available');
      console.log(`   Latest activity: ${activities.data[0].template?.name || 'Unknown'}`);
    } else {
      console.log('✅ Activity feed accessible (no activity data yet)');
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

  const apiKey = NOVU_SECRET_KEY || NOVU_API_KEY;
  const novu = new Novu(apiKey, {
    backendUrl: NOVU_BASE_URL,
  });

  const tests = [
    {
      name: 'Organizations',
      test: () => novu.organizations.getOrganization(),
    },
    {
      name: 'Workflows Read',
      test: () => novu.notificationGroups.list(),
    },
    {
      name: 'Subscribers Read',
      test: () => novu.subscribers.list({ page: 0, limit: 1 }),
    },
    {
      name: 'Notification Templates',
      test: () => novu.notificationTemplates.list({ page: 0, limit: 1 }),
    },
    {
      name: 'Activity Feed',
      test: () => novu.activities.list({ page: 0, limit: 1 }),
    },
  ];

  for (const test of tests) {
    try {
      await test.test();
      console.log(`✅ ${test.name}: Permission granted`);
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
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

export { testConnection, checkPermissions };
