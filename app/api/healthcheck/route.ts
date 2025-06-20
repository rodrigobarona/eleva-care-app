import { ENV_CONFIG, ENV_HELPERS } from '@/config/env';
import { systemHealthWorkflow } from '@/config/novu';
import { NextResponse } from 'next/server';
import { PostHog } from 'posthog-node';

// Initialize PostHog client
const posthog = new PostHog(ENV_CONFIG.NEXT_PUBLIC_POSTHOG_KEY, {
  host: ENV_CONFIG.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
});

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';
export const maxDuration = 60;

interface HealthCheckData {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  source?: 'qstash' | 'ci-cd' | 'direct';
  uptime: number;
  version: string;
  environment: string;
  nodeVersion: string;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  pid?: number;
  platform?: string;
  arch?: string;
  config?: {
    hasDatabase: boolean;
    hasAuth: boolean;
    hasStripe: boolean;
    hasRedis: boolean;
    redisMode: string;
    hasQStash: boolean;
    hasEmail: boolean;
    hasNovu: boolean;
    baseUrl: string;
  };
  error?: string;
  environmentSummary?: ReturnType<typeof ENV_HELPERS.getEnvironmentSummary>;
  method?: string;
}

/**
 * Track health check event in PostHog
 */
async function trackHealthCheck(data: HealthCheckData, isError = false) {
  try {
    if (!ENV_CONFIG.NEXT_PUBLIC_POSTHOG_KEY) {
      console.warn('PostHog tracking disabled - missing API key');
      return;
    }

    await posthog.capture({
      distinctId: 'system',
      event: isError ? 'health_check_failed' : 'health_check_success',
      properties: {
        ...data,
        timestamp: new Date().toISOString(),
        environment: ENV_CONFIG.NODE_ENV,
        baseUrl: ENV_HELPERS.getBaseUrl(),
      },
    });
  } catch (error) {
    console.error('Failed to track health check in PostHog:', error);
  }
}

/**
 * Send notification via Novu for health check failures
 */
async function notifyHealthCheckFailure(data: HealthCheckData) {
  try {
    await systemHealthWorkflow.trigger({
      to: ENV_CONFIG.NOVU_ADMIN_SUBSCRIBER_ID,
      payload: {
        eventType: 'health-check-failure',
        status: data.status,
        error: data.error,
        timestamp: data.timestamp,
        environment: data.environment,
        memory: data.memory,
      },
    });
  } catch (error) {
    console.error('Failed to send health check failure notification:', error);
  }
}

/**
 * Comprehensive health check endpoint that serves multiple purposes:
 * 1. CI/CD build verification and monitoring
 * 2. QStash service testing and validation
 * 3. System status monitoring with PostHog analytics
 * 4. Automated alerts via Novu for failures
 *
 * Used by:
 * - GitHub Actions CI/CD for build verification
 * - QStash for testing message delivery
 * - Monitoring systems for service health
 * - Load balancers for health checks
 * - PostHog for analytics and monitoring
 * - Novu for failure notifications
 */
export async function GET(request: Request) {
  try {
    const isQStashRequest = request.headers.get('x-qstash-request') === 'true';
    const isCIRequest =
      request.headers.get('user-agent')?.includes('curl') ||
      request.headers.get('x-ci-check') === 'true';

    const envSummary = ENV_HELPERS.getEnvironmentSummary();

    const healthData: HealthCheckData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      source: isQStashRequest ? 'qstash' : isCIRequest ? 'ci-cd' : 'direct',
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.3.1',
      environment: ENV_CONFIG.NODE_ENV,
      nodeVersion: process.version,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        percentage: Math.round(
          (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
        ),
      },
      // Additional system info for monitoring
      pid: process.pid,
      platform: process.platform,
      arch: process.arch,
      // Environment configuration status
      config: {
        hasDatabase: envSummary.hasDatabase,
        hasAuth: envSummary.hasAuth,
        hasStripe: envSummary.hasStripe,
        hasRedis: envSummary.hasRedis,
        redisMode: envSummary.redisMode,
        hasQStash: envSummary.hasQStash,
        hasEmail: envSummary.hasEmail,
        hasNovu: envSummary.hasNovu,
        baseUrl: envSummary.baseUrl,
      },
    };

    // Track successful health check in PostHog
    await trackHealthCheck(healthData);

    return NextResponse.json(healthData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);

    const errorData: HealthCheckData = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
      uptime: process.uptime(),
      environment: ENV_CONFIG.NODE_ENV,
      version: process.env.npm_package_version || '0.3.1',
      nodeVersion: process.version,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        percentage: Math.round(
          (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
        ),
      },
      environmentSummary: ENV_HELPERS.getEnvironmentSummary(),
    };

    // Track failure in PostHog and notify via Novu
    await trackHealthCheck(errorData, true);
    await notifyHealthCheckFailure(errorData);

    return NextResponse.json(errorData, { status: 500 });
  }
}

/**
 * POST handler for receiving test messages from QStash
 * Also accepts health check probes from monitoring systems
 * Tracks all interactions in PostHog
 */
export async function POST(request: Request) {
  try {
    const isQStashRequest = request.headers.get('x-qstash-request') === 'true';
    const contentType = request.headers.get('content-type');
    let body = {};

    // Parse request body if present
    if (contentType?.includes('application/json')) {
      try {
        body = await request.json();
      } catch {
        // Ignore JSON parsing errors for non-JSON requests
      }
    }

    // Log QStash requests for debugging
    if (isQStashRequest) {
      console.log('QStash health check received:', {
        timestamp: new Date().toISOString(),
        body,
        headers: Object.fromEntries(request.headers.entries()),
      });
    }

    const responseData: HealthCheckData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      source: isQStashRequest ? 'qstash' : 'direct',
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.3.1',
      environment: ENV_CONFIG.NODE_ENV,
      nodeVersion: process.version,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        percentage: Math.round(
          (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
        ),
      },
      method: 'POST',
      environmentSummary: ENV_HELPERS.getEnvironmentSummary(),
    };

    // Track successful POST request in PostHog
    await trackHealthCheck(responseData);

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error in health check POST handler:', error);

    const errorData: HealthCheckData = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString(),
      method: 'POST',
      environment: ENV_CONFIG.NODE_ENV,
      version: process.env.npm_package_version || '0.3.1',
      nodeVersion: process.version,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        percentage: Math.round(
          (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
        ),
      },
      uptime: process.uptime(),
      environmentSummary: ENV_HELPERS.getEnvironmentSummary(),
    };

    // Track failure in PostHog and notify via Novu
    await trackHealthCheck(errorData, true);
    await notifyHealthCheckFailure(errorData);

    return NextResponse.json(errorData, { status: 500 });
  }
}
