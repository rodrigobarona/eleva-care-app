#!/usr/bin/env node

/**
 * PostHog API Permission Validator
 *
 * Validates that your PostHog API key has the correct minimal permissions
 * for dashboard automation while ensuring no excessive permissions are granted.
 * Run with: node -r dotenv/config scripts/validate-posthog-permissions.js
 * or: npm run validate:posthog-permissions
 * Note: These variables are also defined in config/env.ts for centralized access
 */

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

async function validatePermissions() {
  console.log('🔐 Validating PostHog API Key Permissions...\n');

  if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
    console.error('❌ Missing environment variables');
    console.log('Set POSTHOG_API_KEY and POSTHOG_PROJECT_ID first');
    process.exit(1);
  }

  const permissions = {
    required: {
      'Dashboards Read': { endpoint: 'dashboards/', method: 'GET', critical: true },
      'Dashboards Write': {
        endpoint: 'dashboards/',
        method: 'POST',
        data: { name: 'Permission Test', description: 'Test', creation_mode: 'template' },
        critical: true,
        cleanup: true,
      },
      'Insights Read': { endpoint: 'insights/', method: 'GET', critical: true },
      'Insights Write': {
        endpoint: 'insights/',
        method: 'POST',
        data: {
          name: 'Permission Test',
          query: { kind: 'EventsQuery', select: ['count()'], event: '$pageview' },
        },
        critical: true,
        cleanup: true,
      },
      'Project Read': { endpoint: '', method: 'GET', critical: true },
    },
    dangerous: {
      'Events Write': {
        endpoint: 'events/',
        method: 'POST',
        data: { api_key: 'test', event: 'test' },
        critical: false,
      },
      'Feature Flags': { endpoint: 'feature_flags/', method: 'GET', critical: false },
      Cohorts: { endpoint: 'cohorts/', method: 'GET', critical: false },
    },
  };

  const results = {
    required: {},
    dangerous: {},
    cleanup: [],
  };

  // Test required permissions
  console.log('✅ Testing Required Permissions:');
  for (const [name, config] of Object.entries(permissions.required)) {
    try {
      const options = {
        method: config.method,
        headers: {
          Authorization: `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
      };

      if (config.data) {
        options.body = JSON.stringify(config.data);
      }

      const response = await fetch(
        `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/${config.endpoint}`,
        options,
      );

      if (response.ok) {
        console.log(`  ✅ ${name}: GRANTED`);
        results.required[name] = true;

        // Track items that need cleanup
        if (config.cleanup && config.method === 'POST') {
          const created = await response.json();
          if (created.id) {
            results.cleanup.push({ type: name.split(' ')[0].toLowerCase(), id: created.id });
          }
        }
      } else {
        console.log(`  ❌ ${name}: DENIED (${response.status})`);
        results.required[name] = false;
      }
    } catch (error) {
      console.log(`  ❌ ${name}: ERROR (${error.message})`);
      results.required[name] = false;
    }
  }

  console.log('\n🚫 Testing Dangerous Permissions (should be DENIED):');
  for (const [name, config] of Object.entries(permissions.dangerous)) {
    try {
      const options = {
        method: config.method,
        headers: {
          Authorization: `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
      };

      if (config.data) {
        options.body = JSON.stringify(config.data);
      }

      const response = await fetch(
        `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/${config.endpoint}`,
        options,
      );

      if (response.ok) {
        console.log(`  ⚠️  ${name}: GRANTED (consider removing this permission)`);
        results.dangerous[name] = true;
      } else {
        console.log(`  ✅ ${name}: DENIED (good for security)`);
        results.dangerous[name] = false;
      }
    } catch (error) {
      console.log(`  ✅ ${name}: DENIED (${error.message})`);
      results.dangerous[name] = false;
    }
  }

  // Cleanup test resources
  if (results.cleanup.length > 0) {
    console.log('\n🧹 Cleaning up test resources...');
    for (const item of results.cleanup) {
      try {
        const endpoint =
          item.type === 'dashboards' ? `dashboards/${item.id}/` : `insights/${item.id}/`;
        await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/${endpoint}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${POSTHOG_API_KEY}`,
          },
        });
        console.log(`  🗑️  Deleted test ${item.type} (${item.id})`);
      } catch (error) {
        console.log(`  ⚠️  Failed to delete test ${item.type}: ${error.message}`);
      }
    }
  }

  // Generate report
  console.log('\n📊 Permission Validation Report:');
  console.log('═'.repeat(50));

  const requiredCount = Object.values(results.required).filter(Boolean).length;
  const requiredTotal = Object.keys(results.required).length;
  const dangerousCount = Object.values(results.dangerous).filter(Boolean).length;

  console.log(`Required Permissions: ${requiredCount}/${requiredTotal} ✅`);
  console.log(`Dangerous Permissions: ${dangerousCount} ⚠️`);

  if (requiredCount === requiredTotal && dangerousCount === 0) {
    console.log('\n🎉 PERFECT! Your API key has the ideal permissions:');
    console.log('  ✅ All required permissions granted');
    console.log('  ✅ No dangerous permissions detected');
    console.log('  ✅ Ready for dashboard automation');
  } else if (requiredCount === requiredTotal) {
    console.log('\n✅ GOOD! Your API key works but has security concerns:');
    console.log('  ✅ All required permissions granted');
    console.log(`  ⚠️  ${dangerousCount} unnecessary permissions detected`);
    console.log('  💡 Consider removing unnecessary permissions for better security');
  } else {
    console.log('\n❌ ISSUES DETECTED:');
    if (requiredCount < requiredTotal) {
      console.log(`  ❌ Missing ${requiredTotal - requiredCount} required permissions`);
      console.log('  💡 Add missing permissions in PostHog → Settings → Personal API Keys');
    }
    if (dangerousCount > 0) {
      console.log(`  ⚠️  ${dangerousCount} unnecessary permissions detected`);
      console.log('  💡 Remove unnecessary permissions for better security');
    }
  }

  console.log('\n📚 Permission Setup Guide:');
  console.log('  1. Go to PostHog → Settings → Personal API Keys');
  console.log('  2. Edit your API key');
  console.log('  3. Enable ONLY these permissions:');
  console.log('     ✅ Dashboards: View + Edit');
  console.log('     ✅ Insights: View + Edit');
  console.log('     ✅ Project Settings: View');
  console.log('  4. Save changes and test again');

  process.exit(requiredCount === requiredTotal && dangerousCount === 0 ? 0 : 1);
}

if (require.main === module) {
  validatePermissions();
}
