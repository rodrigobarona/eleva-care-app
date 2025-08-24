#!/usr/bin/env node

/**
 * Test script to verify Portuguese locale detection
 * This tests that Portuguese visitors from Portugal get 'pt' and not 'pt-BR'
 */

// Mock the environment for testing
process.env.NODE_ENV = 'development';

// Mock Headers class for testing
class MockHeaders {
  constructor(headers) {
    this.headers = new Map(Object.entries(headers));
  }

  get(name) {
    return this.headers.get(name.toLowerCase());
  }
}

// Import the function dynamically since it's TypeScript
async function testLocaleDetection() {
  try {
    // Import the compiled function (assume it's available)
    const { detectLocaleFromHeaders } = await import('../lib/i18n/utils.js').catch(() => {
      console.log('📝 This test requires the TypeScript to be compiled first.');
      console.log('Run this after: pnpm build');
      process.exit(1);
    });

    console.log('🧪 Testing Portuguese locale detection...\n');

    const testCases = [
      {
        name: 'Portuguese visitor from Portugal (geolocation)',
        headers: {
          'x-vercel-ip-country': 'PT',
          'accept-language': 'pt-PT,pt;q=0.9,en;q=0.8',
        },
        expected: 'pt',
      },
      {
        name: 'Brazilian visitor (geolocation)',
        headers: {
          'x-vercel-ip-country': 'BR',
          'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
        expected: 'pt-BR',
      },
      {
        name: 'Portuguese language preference without country header',
        headers: {
          'accept-language': 'pt,en;q=0.9',
        },
        expected: 'pt',
      },
      {
        name: 'Explicit pt-PT language preference',
        headers: {
          'accept-language': 'pt-PT,pt;q=0.9,en;q=0.8',
        },
        expected: 'pt',
      },
      {
        name: 'Explicit pt-BR language preference',
        headers: {
          'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
        expected: 'pt-BR',
      },
      {
        name: 'US visitor with English',
        headers: {
          'x-vercel-ip-country': 'US',
          'accept-language': 'en-US,en;q=0.9',
        },
        expected: null, // Should use default (en)
      },
    ];

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
      const headers = new MockHeaders(testCase.headers);
      const result = detectLocaleFromHeaders(headers);

      const success = result === testCase.expected;
      const status = success ? '✅' : '❌';

      console.log(`${status} ${testCase.name}`);
      console.log(`   Headers: ${JSON.stringify(testCase.headers)}`);
      console.log(`   Expected: ${testCase.expected}, Got: ${result}\n`);

      if (success) {
        passed++;
      } else {
        failed++;
      }
    }

    console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
      console.log('🎉 All tests passed! Portuguese locale detection should now work correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please check the implementation.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error running tests:', error.message);
    console.log('\n💡 Make sure to run: pnpm build first to compile TypeScript files.');
  }
}

testLocaleDetection();
