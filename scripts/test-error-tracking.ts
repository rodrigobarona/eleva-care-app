#!/usr/bin/env tsx
/**
 * Test Script for Better Stack + Sentry SDK Error Tracking
 *
 * This script helps you test that error tracking is working correctly with both
 * BetterStack and Sentry SDK. It can test errors, messages, and various severity levels.
 *
 * Usage:
 *   pnpm tsx scripts/test-error-tracking.ts                    # Basic error test
 *   pnpm tsx scripts/test-error-tracking.ts --type=message     # Test captureMessage
 *   pnpm tsx scripts/test-error-tracking.ts --type=comprehensive  # Full test suite
 *   pnpm tsx scripts/test-error-tracking.ts --help
 */
import * as Sentry from '@sentry/nextjs';

import { ENV_CONFIG } from '../config/env';

// Initialize Sentry explicitly for standalone script
Sentry.init({
  dsn: ENV_CONFIG.NEXT_PUBLIC_SENTRY_DSN,
  environment: ENV_CONFIG.SENTRY_ENVIRONMENT,
  release: ENV_CONFIG.SENTRY_RELEASE,
  tracesSampleRate: 1.0,
  debug: true, // Enable debug mode to see what's happening
  enabled: true,
});

console.log('🔧 Sentry initialized with DSN:', ENV_CONFIG.NEXT_PUBLIC_SENTRY_DSN);
console.log('🌍 Environment:', ENV_CONFIG.SENTRY_ENVIRONMENT);
console.log('');

// Parse command line arguments
const args = process.argv.slice(2);
const typeArg = args.find((arg) => arg.startsWith('--type='));
const errorType = typeArg ? typeArg.split('=')[1] : 'basic';

if (args.includes('--help')) {
  console.log(`
Better Stack + Sentry SDK Error Tracking Test Script

Usage:
  pnpm tsx scripts/test-error-tracking.ts [options]

Options:
  --type=<type>  Error type to test (basic, custom, async, handled, message, comprehensive)
  --help         Show this help message

Examples:
  pnpm tsx scripts/test-error-tracking.ts
  pnpm tsx scripts/test-error-tracking.ts --type=custom
  pnpm tsx scripts/test-error-tracking.ts --type=handled
  pnpm tsx scripts/test-error-tracking.ts --type=message
  pnpm tsx scripts/test-error-tracking.ts --type=comprehensive

After running, check your Better Stack dashboard:
https://errors.betterstack.com/
  `);
  process.exit(0);
}

console.log('🧪 Testing Better Stack + Sentry SDK Error Tracking...\n');
console.log(`Test Type: ${errorType}\n`);

async function testErrorTracking() {
  try {
    switch (errorType) {
      case 'basic':
        console.log('⚠️  Throwing basic error...');
        throw new Error('Test error from Better Stack integration script (basic)');

      case 'custom':
        console.log('⚠️  Throwing error with custom context...');
        Sentry.setTag('test_script', 'true');
        Sentry.setTag('error_type', 'custom');
        Sentry.setContext('test_data', {
          timestamp: new Date().toISOString(),
          script: 'test-error-tracking.ts',
          nodeVersion: process.version,
          platform: process.platform,
        });
        throw new Error('Test error with custom context from script');

      case 'async':
        console.log('⚠️  Throwing async error...');
        await new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Test async error from script'));
          }, 100);
        });
        break;

      case 'handled':
        console.log('📤 Capturing handled exception...');
        Sentry.captureException(new Error('Test handled exception from script'), {
          level: 'warning',
          tags: {
            test_script: 'true',
            error_type: 'handled',
          },
          extra: {
            message: 'This error was manually captured, not thrown',
            timestamp: new Date().toISOString(),
          },
        });
        console.log('✅ Handled exception captured successfully!');
        console.log('⏳ Waiting for event to be queued...\n');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('📊 Check your Better Stack dashboard:');
        console.log('   https://errors.betterstack.com/\n');
        return;

      case 'message':
        console.log('💬 Sending test message to Better Stack via Sentry...');
        Sentry.captureMessage('Hello Better Stack, this is a test message from JavaScript!', {
          level: 'info',
          tags: {
            test_script: 'true',
            message_type: 'greeting',
            source: 'test-error-tracking.ts',
          },
          extra: {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
          },
        });
        console.log('✅ Message sent successfully!');
        console.log('⏳ Waiting for event to be queued...\n');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('📊 Check your Better Stack dashboard:');
        console.log('   https://errors.betterstack.com/\n');
        return;

      case 'comprehensive':
        console.log('🔬 Running comprehensive test suite...\n');

        // Test 1: Info Message
        console.log('1️⃣  Sending info message...');
        Sentry.captureMessage('Test Info Message', { level: 'info' });
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Test 2: Warning Message
        console.log('2️⃣  Sending warning message...');
        Sentry.captureMessage('Test Warning Message', { level: 'warning' });
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Test 3: Error with context
        console.log('3️⃣  Capturing error with context...');
        Sentry.setUser({
          id: 'test-user-123',
          email: 'test@example.com',
          username: 'test_user',
        });
        Sentry.setTag('test_suite', 'comprehensive');
        Sentry.setContext('test_environment', {
          script: 'test-error-tracking.ts',
          timestamp: new Date().toISOString(),
          platform: process.platform,
          nodeVersion: process.version,
        });
        Sentry.captureException(new Error('Comprehensive test error with full context'));
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Test 4: Breadcrumbs
        console.log('4️⃣  Testing breadcrumbs...');
        Sentry.addBreadcrumb({
          message: 'User initiated test',
          category: 'action',
          level: 'info',
        });
        Sentry.addBreadcrumb({
          message: 'Processing test data',
          category: 'process',
          level: 'info',
        });
        Sentry.captureMessage('Test with breadcrumbs', { level: 'info' });
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Test 5: Different severity levels
        console.log('5️⃣  Testing different severity levels...');
        Sentry.captureMessage('Debug level message', { level: 'debug' });
        await new Promise((resolve) => setTimeout(resolve, 300));
        Sentry.captureMessage('Error level message', { level: 'error' });
        await new Promise((resolve) => setTimeout(resolve, 300));
        Sentry.captureMessage('Fatal level message', { level: 'fatal' });

        console.log('\n✅ Comprehensive test suite completed!');
        console.log('⏳ Waiting for all events to be queued...\n');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('📊 Check your Better Stack dashboard for all test events:');
        console.log('   https://errors.betterstack.com/\n');
        console.log(
          '   You should see 5 different test events with various levels and contexts.\n',
        );
        return;

      default:
        console.error(`❌ Unknown error type: ${errorType}`);
        console.log('   Available types: basic, custom, async, handled, message, comprehensive');
        process.exit(1);
    }
  } catch (error) {
    console.log('✅ Error thrown and should be captured by Sentry!');
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log('\n📊 Check your Better Stack dashboard in a few seconds:');
    console.log('   https://errors.betterstack.com/\n');

    // Re-throw to let Sentry capture it
    throw error;
  }
}

// Run the test
testErrorTracking()
  .then(async () => {
    console.log('✅ Test completed successfully!');
    console.log('⏳ Flushing events to BetterStack...\n');

    // Flush Sentry to ensure all events are sent before exiting
    await Sentry.flush(2000);

    console.log('✅ Events sent to BetterStack!\n');
    process.exit(0);
  })
  .catch(async (_error) => {
    // Sentry should have captured this
    console.error('\n⚠️  Error was thrown (this is expected for testing)');
    console.log('⏳ Flushing events to BetterStack...\n');

    // Flush Sentry to ensure all events are sent before exiting
    await Sentry.flush(2000);

    console.log('✅ Events sent to BetterStack!\n');
    process.exit(0); // Exit with 0 because the error was intentional
  });
