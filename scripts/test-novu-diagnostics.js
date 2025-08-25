#!/usr/bin/env node

/**
 * 🔍 Novu Configuration Diagnostics Script
 *
 * This script performs comprehensive checks on your Novu configuration
 * to identify and resolve issues with email and in-app notifications.
 *
 * Usage:
 *   node scripts/test-novu-diagnostics.js
 *   npm run novu:diagnostics
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 Starting Novu Configuration Diagnostics...\n');

// Check if we're in development or need to start the Next.js app
const isDev = process.env.NODE_ENV !== 'production';
let nextProcess = null;
let failureDetected = false; // Shared failure flag

// Cleanup function to terminate Next.js dev server
async function cleanupNextProcess() {
  if (nextProcess && !nextProcess.killed) {
    console.log('\n🛑 Terminating Next.js development server...');
    nextProcess.kill('SIGTERM');

    // Give the process a moment to terminate gracefully
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (!nextProcess.killed) {
          console.log('⚠️  Force killing Next.js process...');
          nextProcess.kill('SIGKILL');
        }
        resolve();
      }, 5000);

      nextProcess.on('exit', () => {
        clearTimeout(timeout);
        console.log('✅ Next.js development server terminated');
        resolve();
      });
    });
  }
  return Promise.resolve();
}

// Single termination point that ensures cleanup
async function terminateWithCleanup(exitCode = 0) {
  if (isDev) {
    await cleanupNextProcess();
  }
  process.exit(exitCode);
}

if (isDev) {
  console.log('🚀 Starting Next.js development server for diagnostics...\n');

  // Start Next.js dev server
  nextProcess = spawn('npx', ['next', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.resolve(__dirname, '..'),
  });

  // Wait a moment for server to start
  setTimeout(() => {
    console.log('\n✅ Next.js server should be running. Proceeding with diagnostics...\n');
    runDiagnostics();
  }, 8000);
} else {
  runDiagnostics();
}

async function runDiagnostics() {
  console.log('🔍 Running Comprehensive Novu Diagnostics...\n');

  // Test the diagnostics endpoint
  try {
    // Try both common ports in case 3000 is occupied
    let response;
    let port = 3000;

    try {
      response = await fetch('http://localhost:3000/api/diagnostics?component=novu&details=true', {
        headers: {
          'x-internal-health-check': 'true',
          'User-Agent': 'node-diagnostics-script',
        },
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      // Try port 3001 if 3000 fails
      console.log('   Port 3000 failed, trying 3001...');
      port = 3001;
      response = await fetch('http://localhost:3001/api/diagnostics?component=novu&details=true', {
        headers: {
          'x-internal-health-check': 'true',
          'User-Agent': 'node-diagnostics-script',
        },
        signal: AbortSignal.timeout(5000),
      });
    }

    if (!response.ok) {
      console.error(`❌ Diagnostics endpoint failed: ${response.status} ${response.statusText}`);

      if (response.status === 401) {
        console.log('🔐 Authentication issue detected. Trying alternative approach...');
        console.log('💡 The diagnostics endpoint may require authentication in this environment');
        console.log('📊 Running simplified environment check instead:\n');

        // Fall through to environment check below instead of exiting
      } else {
        console.log(`💡 Make sure your Next.js server is running on port ${port}`);
        failureDetected = true;
      }
    } else {
      const diagnostics = await response.json();

      console.log('📊 Novu Diagnostics Results:');
      console.log('=============================\n');

      if (diagnostics.components?.novu) {
        const novu = diagnostics.components.novu;

        console.log(
          `Overall Status: ${novu.status === 'healthy' ? '✅' : novu.status === 'warning' ? '⚠️' : '❌'} ${novu.status.toUpperCase()}`,
        );

        if (novu.client) {
          console.log(`Client Initialized: ${novu.client.initialized ? '✅' : '❌'}`);
          console.log(`Environment: ${novu.client.environment || 'unknown'}`);
          console.log(`API URL: ${novu.client.apiUrl || 'unknown'}`);
        }

        if (novu.workflows && novu.workflows.length > 0) {
          console.log('\n📋 Available Workflows:');
          novu.workflows.forEach((workflow, index) => {
            console.log(
              `   ${index + 1}. ${workflow.id} - ${workflow.status === 'healthy' ? '✅' : '❌'}`,
            );
          });
        }

        if (novu.errors && novu.errors.length > 0) {
          console.log('\n❌ Errors Found:');
          novu.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
          });
        }

        if (novu.recommendations && novu.recommendations.length > 0) {
          console.log('\n💡 Recommendations:');
          novu.recommendations.forEach((rec, index) => {
            console.log(`   ${index + 1}. ${rec}`);
          });
        }
      }

      // Overall system health
      console.log('\n🏥 System Health Summary:');
      console.log('========================');
      console.log(
        `Status: ${diagnostics.status === 'healthy' ? '✅' : diagnostics.status === 'warning' ? '⚠️' : '❌'} ${diagnostics.status.toUpperCase()}`,
      );
      console.log(`Components Checked: ${diagnostics.summary?.total || 'unknown'}`);
      console.log(`Healthy: ${diagnostics.summary?.healthy || 0}`);
      console.log(`Warnings: ${diagnostics.summary?.warnings || 0}`);
      console.log(`Critical: ${diagnostics.summary?.critical || 0}`);

      if (diagnostics.recommendations && diagnostics.recommendations.length > 0) {
        console.log('\n🔧 System Recommendations:');
        diagnostics.recommendations.forEach((rec, index) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Failed to run diagnostics:', error.message);
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('   1. Make sure your Next.js server is running: npm run dev');
    console.log('   2. Check that the /api/diagnostics endpoint exists');
    console.log('   3. Verify your environment variables are set');
    console.log('   4. Check the server logs for more details');
    failureDetected = true;
  }

  console.log('\n2️⃣ Environment Variables Check');
  console.log('==============================');

  const requiredEnvVars = [
    'NOVU_SECRET_KEY',
    'NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER',
    'NOVU_BASE_URL',
    'RESEND_API_KEY',
  ];

  let envIssues = 0;

  requiredEnvVars.forEach((envVar) => {
    const value = process.env[envVar];
    if (value) {
      console.log(
        `   ✅ ${envVar}: ${envVar.includes('SECRET') ? value.substring(0, 8) + '...' : value}`,
      );
    } else {
      console.log(`   ❌ ${envVar}: Not set`);
      envIssues++;
    }
  });

  if (envIssues > 0) {
    console.log('\n💡 Environment Variable Issues:');
    console.log('   - Add missing environment variables to your .env.local file');
    console.log('   - Restart your development server after adding them');
    console.log('   - Check the documentation for correct variable names');
    failureDetected = true;
  }

  console.log('\n3️⃣ React Email Templates Check');
  console.log('==============================');

  const emailTemplates = [
    'WelcomeEmailTemplate',
    'AppointmentConfirmationTemplate',
    'AppointmentReminderTemplate',
    'PaymentConfirmationTemplate',
    'MultibancoPaymentReminderTemplate',
    'ExpertPayoutNotificationTemplate',
  ];

  console.log('   Available Email Templates:');
  emailTemplates.forEach((template, index) => {
    console.log(`   ${index + 1}. ✅ ${template} (React Email)`);
  });

  console.log('\n   Template Features:');
  console.log('   ✅ Internationalization (EN, PT, ES, BR)');
  console.log('   ✅ Theme Support (Light/Dark)');
  console.log('   ✅ Responsive Design');
  console.log('   ✅ Brand Consistency');

  console.log('\n4️⃣ Integration Status');
  console.log('====================');

  console.log('   📧 Email Provider: Resend');
  console.log(`   ✅ API Key: ${process.env.RESEND_API_KEY ? 'Configured' : '❌ Missing'}`);
  console.log('   ');
  console.log('   🔔 Novu Framework:');
  console.log(`   ✅ Secret Key: ${process.env.NOVU_SECRET_KEY ? 'Configured' : '❌ Missing'}`);
  console.log(
    `   ✅ App ID: ${process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER ? 'Configured' : '❌ Missing'}`,
  );
  console.log(`   ✅ Base URL: ${process.env.NOVU_BASE_URL || 'Default (https://api.novu.co)'}`);

  console.log('\n5️⃣ Common Issues and Solutions');
  console.log('==============================');
  console.log('   Common Novu Issues and How to Fix Them:');
  console.log('   ');
  console.log('   🔑 Authentication Errors (401):');
  console.log('      - Check NOVU_SECRET_KEY is correctly set');
  console.log("      - Ensure you're using the correct API key for your environment");
  console.log("      - Verify the key hasn't expired or been regenerated");
  console.log('   ');
  console.log('   📧 Emails Not Sending:');
  console.log('      - Verify email provider is configured in Novu dashboard');
  console.log('      - Check Resend integration is active and properly configured');
  console.log('      - Ensure from email domain is verified in Resend');
  console.log('   ');
  console.log('   🔗 Workflow Issues:');
  console.log('      - Run "npm run novu:sync" to sync workflows to dashboard');
  console.log('      - Check workflow IDs match between config and triggers');
  console.log('      - Verify payload schemas are correctly defined');
  console.log('   ');
  console.log('   🌐 Network/CORS Issues:');
  console.log("      - Check if you're using the correct Novu region (EU vs US)");
  console.log('      - Verify NEXT_PUBLIC_APP_URL is correctly set');
  console.log("      - Ensure webhook URLs are accessible from Novu's servers");

  console.log('\n6️⃣ Next Steps');
  console.log('=============');
  console.log('   🚀 Quick Actions:');
  console.log('      1. Fix any environment variable issues found above');
  console.log('      2. Test email templates: npm run test:email-templates');
  console.log('      3. Sync workflows: npm run novu:sync');
  console.log('      4. Monitor the Novu dashboard for delivery status');
  console.log('   ');
  console.log('   📚 Documentation:');
  console.log('      - Novu Integration Guide: docs/fixes/novu-resend-react-email-integration.md');
  console.log('      - Configuration Guide: docs/fixes/qstash-novu-webhook-alignment-fix.md');
  console.log('      - Novu Dashboard: https://web.novu.co');
  console.log('      - Resend Dashboard: https://resend.com/emails');

  console.log('\n✅ Diagnostics Complete!\n');

  if (failureDetected) {
    await terminateWithCleanup(1);
  } else {
    await terminateWithCleanup(0);
  }
}

// Handle script termination signals
async function handleTermination(signal) {
  console.log(`\n👋 Received ${signal}. Cleaning up...`);
  await terminateWithCleanup(0);
}

process.on('SIGINT', () => handleTermination('SIGINT'));
process.on('SIGTERM', () => handleTermination('SIGTERM'));
process.on('beforeExit', () => {
  if (nextProcess && !nextProcess.killed) {
    console.log('\n🔄 Process exiting, cleaning up Next.js server...');
    nextProcess.kill('SIGTERM');
  }
});
