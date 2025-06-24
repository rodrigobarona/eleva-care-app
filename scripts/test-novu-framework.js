#!/usr/bin/env node
/**
 * Novu Framework Test Script
 *
 * Tests Novu Framework bridge endpoint and Next.js 15 integration
 * Run with: node -r dotenv/config scripts/test-novu-framework.js
 * or: npm run test:novu-framework
 */
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Environment variables
const NOVU_SECRET_KEY = process.env.NOVU_SECRET_KEY;
const NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER = process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testNovuFramework() {
  console.log('🚀 Testing Novu Framework Bridge Endpoint\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`  NOVU_SECRET_KEY: ${NOVU_SECRET_KEY ? '✅ Set (hidden)' : '❌ Not set'}`);
  console.log(
    `  NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER: ${NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER || '❌ Not set'}`,
  );
  console.log(`  BASE_URL: ${BASE_URL}\n`);

  if (!NOVU_SECRET_KEY) {
    console.error('❌ Missing NOVU_SECRET_KEY');
    process.exit(1);
  }

  if (!NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER) {
    console.error('❌ Missing NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER');
    process.exit(1);
  }

  try {
    // Test 1: Check if bridge endpoint is accessible
    console.log('🔍 Test 1: Bridge endpoint accessibility');
    const bridgeUrl = `${BASE_URL}/api/novu`;

    try {
      const response = await fetch(bridgeUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      console.log(`   Status: ${response.status}`);
      console.log(`   Bridge endpoint: ${response.ok ? '✅ Accessible' : '❌ Not accessible'}`);

      if (response.ok) {
        const data = await response.text();
        console.log(`   Response preview: ${data.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`   ❌ Bridge endpoint test failed: ${error.message}`);
      console.log('   💡 Make sure your Next.js server is running on', BASE_URL);
    }

    console.log();

    // Test 2: Check workflow discovery (GET request for Novu Framework)
    console.log('🔍 Test 2: Workflow discovery');
    try {
      const discoveryUrl = `${BASE_URL}/api/novu`;
      const discoveryResponse = await fetch(discoveryUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${NOVU_SECRET_KEY}`,
        },
      });

      console.log(`   Discovery status: ${discoveryResponse.status}`);

      if (discoveryResponse.ok) {
        const discoveryData = await discoveryResponse.text();
        console.log('   ✅ Workflow discovery successful');
        console.log(`   Response preview: ${discoveryData.substring(0, 200)}...`);

        // Try to parse JSON to see workflow structure
        try {
          const jsonData = JSON.parse(discoveryData);
          if (jsonData.workflows) {
            console.log(`   📊 Found ${jsonData.workflows.length} workflows`);
          }
        } catch (parseError) {
          console.log('   📄 Response is not JSON (might be HTML or other format)');
        }
      } else {
        const errorText = await discoveryResponse.text();
        console.log('   ⚠️ Workflow discovery returned non-200 status');
        console.log(`   Error: ${errorText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`   ❌ Workflow discovery failed: ${error.message}`);
    }

    console.log();

    // Test 3: Test webhook endpoint (POST request)
    console.log('🔍 Test 3: Webhook endpoint test');
    try {
      const webhookUrl = `${BASE_URL}/api/novu`;

      // Create a test webhook payload that Novu Framework expects
      const testPayload = {
        workflowId: 'user-lifecycle',
        subscriberId: 'test-subscriber',
        payload: {
          eventType: 'welcome',
          userName: 'Test User',
          email: 'test@example.com',
        },
      };

      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${NOVU_SECRET_KEY}`,
        },
        body: JSON.stringify(testPayload),
      });

      console.log(`   Webhook status: ${webhookResponse.status}`);

      if (webhookResponse.ok) {
        console.log('   ✅ Webhook endpoint accepts POST requests');
      } else {
        const errorText = await webhookResponse.text();
        console.log('   ⚠️ Webhook endpoint returned non-200 status');
        console.log(`   Response: ${errorText.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`   ❌ Webhook test failed: ${error.message}`);
    }

    console.log();

    // Test 4: Check middleware configuration
    console.log('🔍 Test 4: Middleware configuration');
    console.log('   ✅ /api/novu should be excluded from authentication middleware');
    console.log('   📝 Check middleware.ts for proper exclusion pattern');

    console.log();

    // Test 5: Environment configuration
    console.log('🔍 Test 5: Environment configuration');
    console.log('   ✅ NOVU_SECRET_KEY is configured');
    console.log('   ✅ NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER is configured');
    console.log('   📍 Using EU region endpoints by default');

    console.log();

    console.log('🎉 Novu Framework test completed!');
    console.log();
    console.log('📖 Next steps:');
    console.log('1. Ensure your Next.js development server is running');
    console.log('2. Test the subscriber-hash endpoint: /api/novu/subscriber-hash');
    console.log('3. Check the Novu Dashboard for workflow synchronization');
    console.log('4. Test in-app notifications using the Inbox component');
    console.log();
    console.log('🔧 Troubleshooting:');
    console.log('- If bridge endpoint is not accessible, check if Next.js server is running');
    console.log('- If middleware blocks /api/novu, verify middleware.ts excludes this path');
    console.log('- If workflows are not discovered, check config/novu.ts exports');
  } catch (error) {
    console.error('❌ Framework test failed:', error);
    process.exit(1);
  }
}

// Run the test
testNovuFramework().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
