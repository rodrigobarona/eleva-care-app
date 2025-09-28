import { ENV_CONFIG } from '@/config/env';
import { Novu } from '@novu/api';

// Initialize Novu client following latest best practices
let novu: Novu | null = null;
let initializationError: string | null = null;

try {
  console.log('[Novu] Initializing client...');
  console.log('[Novu] Environment check:', {
    hasSecretKey: !!ENV_CONFIG.NOVU_SECRET_KEY,
    hasAppId: !!ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER,
    baseUrl: ENV_CONFIG.NOVU_BASE_URL || 'default',
    keyPrefix: ENV_CONFIG.NOVU_SECRET_KEY
      ? ENV_CONFIG.NOVU_SECRET_KEY.substring(0, 8) + '...'
      : 'none',
    keyType: ENV_CONFIG.NOVU_SECRET_KEY
      ? 'modern (NOVU_SECRET_KEY)'
      : ENV_CONFIG.NOVU_API_KEY
        ? 'legacy (NOVU_API_KEY)'
        : 'none',
  });

  if (ENV_CONFIG.NOVU_SECRET_KEY) {
    novu = new Novu({
      secretKey: ENV_CONFIG.NOVU_SECRET_KEY,
      // Use EU region if configured, defaults to US
      ...(ENV_CONFIG.NOVU_BASE_URL && { serverURL: ENV_CONFIG.NOVU_BASE_URL }),
    });
    console.log('[Novu] ✅ Client initialized successfully');
  } else if (ENV_CONFIG.NOVU_API_KEY) {
    // Legacy fallback for older API key format
    novu = new Novu({
      secretKey: ENV_CONFIG.NOVU_API_KEY,
      ...(ENV_CONFIG.NOVU_BASE_URL && { serverURL: ENV_CONFIG.NOVU_BASE_URL }),
    });
    console.log('[Novu] ✅ Client initialized with legacy API key');
  } else {
    initializationError = 'Missing NOVU_SECRET_KEY or NOVU_API_KEY environment variable';
    console.error(`[Novu] ❌ ${initializationError}`);
    console.error('[Novu] 🔧 To fix: Set NOVU_SECRET_KEY in your environment variables');
    console.error('[Novu] 📚 See: docs/vercel-env-setup.md for setup instructions');
  }
} catch (error) {
  initializationError = `Initialization failed: ${error}`;
  console.error('[Novu] ❌ Failed to initialize:', error);
}

// Modern interface following latest documentation patterns
export interface TriggerWorkflowOptions {
  workflowId: string;
  to: {
    subscriberId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
    data?: Record<string, string | number | boolean>;
  };
  payload?: Record<string, unknown>;
  overrides?: {
    email?: {
      from?: string;
      subject?: string;
    };
    sms?: Record<string, unknown>;
    push?: Record<string, unknown>;
  };
  actor?: {
    subscriberId: string;
    data?: Record<string, string | number | boolean>;
  };
}

/**
 * Trigger a Novu workflow using the latest API
 * Following @novu/api best practices from documentation
 */
export async function triggerWorkflow(options: TriggerWorkflowOptions) {
  if (!novu) {
    const errorMsg = `[Novu] Cannot trigger workflow ${options.workflowId}: ${initializationError || 'client not initialized'}`;
    console.error(errorMsg);
    console.error(
      '[Novu] 🔧 Check environment variables: NOVU_SECRET_KEY, NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER',
    );
    return null;
  }

  try {
    console.log(`[Novu] Triggering workflow: ${options.workflowId}`, {
      subscriberId: options.to.subscriberId,
      hasPayload: !!options.payload,
      payloadKeys: options.payload ? Object.keys(options.payload) : [],
    });

    const result = await novu.trigger({
      workflowId: options.workflowId,
      to: options.to,
      payload: options.payload || {},
      overrides: options.overrides,
      actor: options.actor,
    });

    console.log(`[Novu] ✅ Successfully triggered workflow: ${options.workflowId}`);
    return result;
  } catch (error) {
    console.error(`[Novu] ❌ Failed to trigger workflow ${options.workflowId}:`, error);

    // Provide specific error guidance
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const errorWithStatus = error as { statusCode: number };
      if (errorWithStatus.statusCode === 401) {
        console.error(
          '[Novu] 🔑 Authentication error - check NOVU_SECRET_KEY environment variable',
        );
        console.error('[Novu] 📚 Setup guide: docs/vercel-env-setup.md');
      }
    }

    return null;
  }
}

/**
 * Create or update a subscriber using modern API
 * Synchronizes user profile data with Novu following best practices
 */
export async function updateSubscriber(subscriber: TriggerWorkflowOptions['to']) {
  if (!novu || !ENV_CONFIG.NOVU_SECRET_KEY) {
    console.warn('[Novu] Cannot update subscriber: not initialized');
    return null;
  }

  try {
    const result = await novu.subscribers.create({
      subscriberId: subscriber.subscriberId,
      firstName: subscriber.firstName,
      lastName: subscriber.lastName,
      email: subscriber.email,
      phone: subscriber.phone,
      avatar: subscriber.avatar,
      data: subscriber.data,
    });

    console.log(`[Novu] Subscriber updated: ${subscriber.subscriberId}`);
    return result;
  } catch (error) {
    console.error('[Novu] Error updating subscriber:', error);
    return null;
  }
}

/**
 * Get Novu client status and configuration for diagnostics
 */
export function getNovuStatus() {
  return {
    initialized: !!novu,
    initializationError,
    config: {
      hasSecretKey: !!ENV_CONFIG.NOVU_SECRET_KEY,
      hasApiKey: !!ENV_CONFIG.NOVU_API_KEY,
      hasAppId: !!ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER,
      baseUrl: ENV_CONFIG.NOVU_BASE_URL,
      socketUrl: ENV_CONFIG.NOVU_SOCKET_URL,
      adminSubscriberId: ENV_CONFIG.NOVU_ADMIN_SUBSCRIBER_ID,
      keyPrefix: ENV_CONFIG.NOVU_SECRET_KEY
        ? ENV_CONFIG.NOVU_SECRET_KEY.substring(0, 8) + '...'
        : 'none',
    },
  };
}

/**
 * Comprehensive Novu health monitoring and diagnostics
 * Use this function to diagnose Novu configuration issues
 */
export async function runNovuDiagnostics() {
  console.log('\n🔍 Starting Novu Comprehensive Diagnostics...\n');

  const diagnostics = {
    client: getNovuStatus(),
    workflows: [] as Array<{ id: string; status: string; timestamp: string }>,
    errors: [] as string[],
    recommendations: [] as string[],
    summary: {
      healthy: true,
      criticalErrors: 0,
      warnings: 0,
    },
  };

  // 1. Test client initialization
  console.log('1️⃣ Testing Client Initialization');
  if (!diagnostics.client.initialized) {
    diagnostics.errors.push(`Client not initialized: ${diagnostics.client.initializationError}`);
    diagnostics.recommendations.push('Check NOVU_SECRET_KEY environment variable');
    diagnostics.summary.criticalErrors++;
  } else {
    console.log('   ✅ Client initialized successfully');
  }

  // 2. Test workflow trigger capability
  console.log('\n2️⃣ Testing Workflow Trigger Capability');
  const testWorkflowId = 'system-health';
  const testSubscriber = {
    subscriberId: ENV_CONFIG.NOVU_ADMIN_SUBSCRIBER_ID || 'test-admin',
    email: 'admin@eleva.care',
    firstName: 'System',
    lastName: 'Admin',
  };

  try {
    const testPayload = {
      eventType: 'health-check-diagnostics',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: ENV_CONFIG.NODE_ENV,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        percentage: Math.round(
          (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
        ),
      },
    };

    const result = await triggerWorkflow({
      workflowId: testWorkflowId,
      to: testSubscriber,
      payload: testPayload,
    });

    if (result) {
      console.log('   ✅ Test workflow trigger succeeded');
      diagnostics.workflows.push({
        id: testWorkflowId,
        status: 'success',
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log('   ❌ Test workflow trigger failed');
      diagnostics.errors.push('Test workflow trigger returned null');
      diagnostics.summary.criticalErrors++;
    }
  } catch (error) {
    console.log('   ❌ Test workflow trigger threw error:', error);
    diagnostics.errors.push(`Test workflow error: ${error}`);
    diagnostics.summary.criticalErrors++;
  }

  // 3. Environment variable validation
  console.log('\n3️⃣ Environment Variable Validation');
  const envChecks = [
    { name: 'NOVU_SECRET_KEY', value: !!ENV_CONFIG.NOVU_SECRET_KEY, critical: true },
    {
      name: 'NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER',
      value: !!ENV_CONFIG.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER,
      critical: true,
    },
    { name: 'NOVU_BASE_URL', value: !!ENV_CONFIG.NOVU_BASE_URL, critical: false },
    {
      name: 'NOVU_ADMIN_SUBSCRIBER_ID',
      value: !!ENV_CONFIG.NOVU_ADMIN_SUBSCRIBER_ID,
      critical: false,
    },
  ];

  envChecks.forEach((check) => {
    if (check.value) {
      console.log(`   ✅ ${check.name} is set`);
    } else {
      console.log(`   ${check.critical ? '❌' : '⚠️'} ${check.name} is missing`);
      if (check.critical) {
        diagnostics.errors.push(`Missing critical environment variable: ${check.name}`);
        diagnostics.summary.criticalErrors++;
      } else {
        diagnostics.recommendations.push(`Consider setting ${check.name} for better functionality`);
        diagnostics.summary.warnings++;
      }
    }
  });

  // 4. Bridge endpoint check
  console.log('\n4️⃣ Bridge Endpoint Check');
  try {
    const baseUrl = ENV_CONFIG.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const bridgeUrl = `${baseUrl}/api/novu`;

    const bridgeResponse = await fetch(bridgeUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (bridgeResponse.ok) {
      console.log('   ✅ Bridge endpoint is accessible');
    } else {
      console.log(`   ⚠️ Bridge endpoint returned ${bridgeResponse.status}`);
      diagnostics.recommendations.push('Check /api/novu bridge endpoint configuration');
      diagnostics.summary.warnings++;
    }
  } catch (error) {
    console.log('   ❌ Bridge endpoint check failed:', error);
    diagnostics.errors.push(`Bridge endpoint error: ${error}`);
    diagnostics.summary.criticalErrors++;
  }

  // 5. Summary and recommendations
  console.log('\n📊 Diagnostics Summary');
  console.log(
    `   Status: ${diagnostics.summary.criticalErrors === 0 ? '✅ Healthy' : '❌ Issues Found'}`,
  );
  console.log(`   Critical Errors: ${diagnostics.summary.criticalErrors}`);
  console.log(`   Warnings: ${diagnostics.summary.warnings}`);

  if (diagnostics.errors.length > 0) {
    console.log('\n🚨 Critical Issues:');
    diagnostics.errors.forEach((error) => console.log(`   • ${error}`));
  }

  if (diagnostics.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    diagnostics.recommendations.forEach((rec) => console.log(`   • ${rec}`));
  }

  diagnostics.summary.healthy = diagnostics.summary.criticalErrors === 0;
  return diagnostics;
}

// Export client for advanced usage if needed
export { novu };
