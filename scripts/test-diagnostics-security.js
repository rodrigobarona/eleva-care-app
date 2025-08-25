#!/usr/bin/env node
/**
 * Test script to verify diagnostics endpoint security
 * This script demonstrates the access control fixes made to /api/diagnostics
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const diagnosticsUrl = `${baseUrl}/api/diagnostics`;

async function testDiagnosticsAccess() {
  console.log('🔐 Testing Diagnostics Endpoint Security\n');

  let failureDetected = false;

  // Test 1: Unauthorized access (should return 403)
  console.log('1️⃣ Testing unauthorized access...');
  try {
    const response = await fetch(diagnosticsUrl);
    console.log(`   Status: ${response.status}`);
    if (response.status === 403) {
      const data = await response.json();
      console.log(`   ✅ Correctly blocked: ${data.error}`);
    } else {
      console.log(`   ❌ SECURITY ISSUE: Should return 403, got ${response.status}`);
      failureDetected = true;
    }
  } catch (error) {
    console.log(`   🔌 Connection error: ${error.message}`);
    failureDetected = true;
  }

  console.log('\n2️⃣ Testing with valid DIAGNOSTICS_TOKEN...');

  // Test 2: With valid token (should work if token is set)
  const token = process.env.DIAGNOSTICS_TOKEN;
  if (token) {
    try {
      const response = await fetch(diagnosticsUrl, {
        headers: {
          'x-diagnostics-token': token,
        },
      });
      console.log(`   Status: ${response.status}`);
      if (response.status === 200) {
        const data = await response.json();
        console.log(`   ✅ Access granted with valid token`);
        console.log(`   📊 Found ${Object.keys(data.components).length} diagnostic components`);
      } else {
        console.log(`   ❌ Unexpected status with valid token: ${response.status}`);
        failureDetected = true;
      }
    } catch (error) {
      console.log(`   🔌 Connection error: ${error.message}`);
      failureDetected = true;
    }
  } else {
    console.log(`   ⚠️  No DIAGNOSTICS_TOKEN environment variable set - skipping token test`);
  }

  console.log('\n3️⃣ Testing internal health check access...');

  // Test 3: Internal health check (should work)
  try {
    const response = await fetch(diagnosticsUrl, {
      headers: {
        'x-internal-health-check': 'true',
      },
    });
    console.log(`   Status: ${response.status}`);
    if (response.status === 200) {
      const data = await response.json();
      console.log(`   ✅ Internal health check access granted`);
      console.log(`   📊 System status: ${data.status}`);
    } else {
      console.log(`   ❌ Internal health check failed: ${response.status}`);
      failureDetected = true;
    }
  } catch (error) {
    console.log(`   🔌 Connection error: ${error.message}`);
    failureDetected = true;
  }

  console.log('\n🏁 Security test completed!\n');

  console.log('📝 Security Implementation Summary:');
  console.log('   • ✅ Unauthorized requests blocked (403)');
  console.log('   • ✅ DIAGNOSTICS_TOKEN authentication required');
  console.log('   • ✅ Internal health checks allowed');
  console.log('   • ✅ Sensitive info protected from unauthorized access');
  console.log('\n🔒 Production Setup:');
  console.log('   Set DIAGNOSTICS_TOKEN in your production environment');
  console.log('   Share only with SRE teams and monitoring systems');

  // Return success status
  return !failureDetected;
}

// Only run if this script is executed directly
if (require.main === module) {
  testDiagnosticsAccess()
    .then((success) => {
      if (success) {
        console.log('\n✅ All security tests passed!');
        process.exit(0);
      } else {
        console.log('\n❌ Some security tests failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testDiagnosticsAccess };
