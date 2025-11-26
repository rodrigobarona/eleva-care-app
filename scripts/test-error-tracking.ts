#!/usr/bin/env tsx
/**
 * Test Script for Better Stack Error Tracking
 *
 * This script helps you test that error tracking is working correctly.
 * It can test both server-side and simulated errors.
 *
 * Usage:
 *   pnpm tsx scripts/test-error-tracking.ts
 *   pnpm tsx scripts/test-error-tracking.ts --type=custom
 *   pnpm tsx scripts/test-error-tracking.ts --help
 */
import * as Sentry from '@sentry/nextjs';

// Parse command line arguments
const args = process.argv.slice(2);
const typeArg = args.find((arg) => arg.startsWith('--type='));
const errorType = typeArg ? typeArg.split('=')[1] : 'basic';

if (args.includes('--help')) {
  console.log(`
Better Stack Error Tracking Test Script

Usage:
  pnpm tsx scripts/test-error-tracking.ts [options]

Options:
  --type=<type>  Error type to test (basic, custom, async, handled)
  --help         Show this help message

Examples:
  pnpm tsx scripts/test-error-tracking.ts
  pnpm tsx scripts/test-error-tracking.ts --type=custom
  pnpm tsx scripts/test-error-tracking.ts --type=handled

After running, check your Better Stack dashboard:
https://errors.betterstack.com/
  `);
  process.exit(0);
}

console.log('🧪 Testing Better Stack Error Tracking...\n');
console.log(`Error Type: ${errorType}\n`);

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
        console.log('\n📊 Check your Better Stack dashboard:');
        console.log('   https://errors.betterstack.com/\n');
        return;

      default:
        console.error(`❌ Unknown error type: ${errorType}`);
        console.log('   Available types: basic, custom, async, handled');
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
  .then(() => {
    console.log('✅ Test completed successfully!\n');
    process.exit(0);
  })
  .catch((_error) => {
    // Sentry should have captured this
    console.error('\n⚠️  Error was thrown (this is expected for testing)');
    process.exit(0); // Exit with 0 because the error was intentional
  });
