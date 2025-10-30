import { getNovuStatus, triggerWorkflow } from '@/app/utils/novu';
import { ENV_CONFIG, ENV_HELPERS } from '@/config/env';
import { checkAllServices, ServiceHealthResult } from '@/lib/utils/service-health';
import { NextResponse } from 'next/server';
import { PostHog } from 'posthog-node';

// Lazy initialization of PostHog client
let posthog: PostHog | null = null;

function getPostHogClient(): PostHog | null {
  if (!ENV_CONFIG.NEXT_PUBLIC_POSTHOG_KEY) {
    return null;
  }
  if (!posthog) {
    posthog = new PostHog(ENV_CONFIG.NEXT_PUBLIC_POSTHOG_KEY, {
      host: ENV_CONFIG.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    });
  }
  return posthog;
}

// Add route segment config
export const preferredRegion = 'auto';
export const maxDuration = 60;

interface HealthCheckData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  source?: 'qstash' | 'ci-cd' | 'direct' | 'betterstack';
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
  services?: {
    overall: 'healthy' | 'degraded' | 'down';
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      down: number;
    };
    details?: ServiceHealthResult[];
  };
  novu?: {
    initialized: boolean;
    initializationError?: string | null;
    config: {
      hasSecretKey: boolean;
      hasApiKey: boolean;
      hasAppId: boolean;
      baseUrl?: string;
      socketUrl?: string;
      adminSubscriberId?: string;
      keyPrefix: string;
    };
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
    const client = getPostHogClient();
    if (!client) {
      console.warn('PostHog tracking disabled - missing API key');
      return;
    }

    await client.capture({
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
    await triggerWorkflow({
      workflowId: 'system-health',
      to: {
        subscriberId: ENV_CONFIG.NOVU_ADMIN_SUBSCRIBER_ID,
      },
      payload: {
        eventType: 'health-check-failure',
        status: data.status,
        error: data.error,
        timestamp: data.timestamp,
        environment: data.environment,
        memory: {
          used: data.memory.used,
          total: data.memory.total,
          percentage: data.memory.percentage,
        },
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
 * 5. Better Stack status page monitoring
 *
 * Used by:
 * - GitHub Actions CI/CD for build verification
 * - QStash for testing message delivery
 * - Monitoring systems for service health
 * - Load balancers for health checks
 * - PostHog for analytics and monitoring
 * - Novu for failure notifications
 * - Better Stack for status page monitoring
 *
 * Query parameters:
 * - ?detailed=true - Include detailed service health checks (Better Stack compatible)
 * - ?services=true - Include individual service status
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeDetailed = url.searchParams.get('detailed') === 'true';
    const includeServices = url.searchParams.get('services') === 'true';

    const isQStashRequest = request.headers.get('x-qstash-request') === 'true';
    const isCIRequest =
      request.headers.get('user-agent')?.includes('curl') ||
      request.headers.get('x-ci-check') === 'true';
    const isBetterStack =
      request.headers.get('user-agent')?.toLowerCase().includes('betterstack') ||
      request.headers.get('user-agent')?.toLowerCase().includes('better-uptime');

    const envSummary = ENV_HELPERS.getEnvironmentSummary();

    // Initialize health data
    const healthData: HealthCheckData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      source: isBetterStack
        ? 'betterstack'
        : isQStashRequest
          ? 'qstash'
          : isCIRequest
            ? 'ci-cd'
            : 'direct',
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
      // Detailed Novu diagnostics
      novu: getNovuStatus(),
    };

    // Run comprehensive service health checks if requested
    if (includeDetailed || includeServices || isBetterStack) {
      console.log('🔍 Running comprehensive service health checks...');
      const serviceHealth = await checkAllServices();

      healthData.services = {
        overall: serviceHealth.overall,
        summary: serviceHealth.summary,
        details: includeDetailed ? serviceHealth.services : undefined,
      };

      // Update overall status based on service health
      if (serviceHealth.overall === 'down') {
        healthData.status = 'unhealthy';
      } else if (serviceHealth.overall === 'degraded') {
        healthData.status = 'degraded';
      }
    }

    // Track successful health check in PostHog
    await trackHealthCheck(healthData);

    // Return appropriate HTTP status code based on health
    const httpStatus = healthData.status === 'unhealthy' ? 503 : 200;

    return NextResponse.json(healthData, {
      status: httpStatus,
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

    return NextResponse.json(errorData, { status: 503 });
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
