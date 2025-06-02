#!/usr/bin/env node

/**
 * Environment Variable Visibility Test
 *
 * Demonstrates the difference between public and private variables in Next.js
 * Note: These variables are also defined in config/env.ts for centralized access
 */

console.log('🔍 Testing PostHog Environment Variable Visibility\n');

console.log('📋 SERVER-SIDE (Node.js) Access:');
console.log('  POSTHOG_API_KEY:', process.env.POSTHOG_API_KEY ? '✅ Available' : '❌ Not set');
console.log(
  '  POSTHOG_PROJECT_ID:',
  process.env.POSTHOG_PROJECT_ID ? '✅ Available' : '❌ Not set',
);
console.log(
  '  NEXT_PUBLIC_POSTHOG_KEY:',
  process.env.NEXT_PUBLIC_POSTHOG_KEY ? '✅ Available' : '❌ Not set',
);
console.log(
  '  NEXT_PUBLIC_POSTHOG_HOST:',
  process.env.NEXT_PUBLIC_POSTHOG_HOST ? '✅ Available' : '❌ Not set',
);

console.log('\n🌐 CLIENT-SIDE (Browser) Access:');
console.log('  POSTHOG_API_KEY: ❌ Hidden (good for security!)');
console.log('  POSTHOG_PROJECT_ID: ❌ Hidden (good for security!)');
console.log('  NEXT_PUBLIC_POSTHOG_KEY: ✅ Available (needed for tracking)');
console.log('  NEXT_PUBLIC_POSTHOG_HOST: ✅ Available (needed for tracking)');

console.log('\n📝 Summary:');
console.log('  • Variables with NEXT_PUBLIC_ prefix: Available in browser');
console.log('  • Variables without NEXT_PUBLIC_ prefix: Server-side only');
console.log('  • This protects sensitive API keys from being exposed to users');

if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  console.log('\n⚠️  Warning: NEXT_PUBLIC_POSTHOG_KEY not set');
  console.log('   Analytics tracking will not work without this variable');
}

if (!process.env.POSTHOG_API_KEY && !process.env.POSTHOG_PROJECT_ID) {
  console.log('\n💡 Info: POSTHOG_API_KEY and POSTHOG_PROJECT_ID not set');
  console.log('   These are only needed for automated dashboard creation');
}
