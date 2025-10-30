/**
 * Service Health Check Utilities
 *
 * Provides health check functions for all external services used by Eleva Care.
 * Compatible with Better Stack status page monitoring.
 */
import { ENV_CONFIG } from '@/config/env';
import { auditDb } from '@/drizzle/auditDb';
import { db } from '@/drizzle/db';
import { qstashHealthCheck } from '@/lib/integrations/qstash/config';
import { redisManager } from '@/lib/redis/manager';
import { sql } from 'drizzle-orm';
import Stripe from 'stripe';

export interface ServiceHealthResult {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  message: string;
  details?: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

/**
 * Check Neon database connectivity (Main database)
 */
export async function checkNeonDatabase(): Promise<ServiceHealthResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    await db.execute(sql`SELECT 1 as health_check`);
    const responseTime = Date.now() - startTime;

    return {
      service: 'neon-database',
      status: 'healthy',
      responseTime,
      message: `Database connection successful (${responseTime}ms)`,
      timestamp,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      service: 'neon-database',
      status: 'down',
      responseTime,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown database error',
      timestamp,
    };
  }
}

/**
 * Check Neon audit database connectivity
 */
export async function checkAuditDatabase(): Promise<ServiceHealthResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    await auditDb.execute(sql`SELECT 1 as health_check`);
    const responseTime = Date.now() - startTime;

    return {
      service: 'audit-database',
      status: 'healthy',
      responseTime,
      message: `Audit database connection successful (${responseTime}ms)`,
      timestamp,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      service: 'audit-database',
      status: 'down',
      responseTime,
      message: 'Audit database connection failed',
      error: error instanceof Error ? error.message : 'Unknown database error',
      timestamp,
    };
  }
}

/**
 * Check Stripe API connectivity
 */
export async function checkStripe(): Promise<ServiceHealthResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  if (!ENV_CONFIG.STRIPE_SECRET_KEY) {
    return {
      service: 'stripe',
      status: 'down',
      responseTime: 0,
      message: 'Stripe API key not configured',
      error: 'Missing STRIPE_SECRET_KEY',
      timestamp,
    };
  }

  try {
    const stripe = new Stripe(ENV_CONFIG.STRIPE_SECRET_KEY, {
      apiVersion: ENV_CONFIG.STRIPE_API_VERSION as Stripe.LatestApiVersion,
    });

    // Lightweight API call to check connectivity
    await stripe.balance.retrieve();
    const responseTime = Date.now() - startTime;

    return {
      service: 'stripe',
      status: 'healthy',
      responseTime,
      message: `Stripe API connection successful (${responseTime}ms)`,
      timestamp,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      service: 'stripe',
      status: 'down',
      responseTime,
      message: 'Stripe API connection failed',
      error: error instanceof Error ? error.message : 'Unknown Stripe error',
      timestamp,
    };
  }
}

/**
 * Check Clerk API connectivity
 */
export async function checkClerk(): Promise<ServiceHealthResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  if (!ENV_CONFIG.CLERK_SECRET_KEY) {
    return {
      service: 'clerk',
      status: 'down',
      responseTime: 0,
      message: 'Clerk API key not configured',
      error: 'Missing CLERK_SECRET_KEY',
      timestamp,
    };
  }

  try {
    // Make a lightweight API call to check Clerk connectivity
    const response = await fetch('https://api.clerk.com/v1/users?limit=1', {
      headers: {
        Authorization: `Bearer ${ENV_CONFIG.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        service: 'clerk',
        status: 'down',
        responseTime,
        message: 'Clerk API returned error',
        error: `HTTP ${response.status}: ${response.statusText}`,
        timestamp,
      };
    }

    return {
      service: 'clerk',
      status: 'healthy',
      responseTime,
      message: `Clerk API connection successful (${responseTime}ms)`,
      timestamp,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      service: 'clerk',
      status: 'down',
      responseTime,
      message: 'Clerk API connection failed',
      error: error instanceof Error ? error.message : 'Unknown Clerk error',
      timestamp,
    };
  }
}

/**
 * Check Upstash Redis connectivity
 */
export async function checkRedis(): Promise<ServiceHealthResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    const healthResult = await redisManager.healthCheck();

    return {
      service: 'upstash-redis',
      status: healthResult.status === 'healthy' ? 'healthy' : 'down',
      responseTime: healthResult.responseTime,
      message: healthResult.message,
      details: {
        mode: healthResult.mode,
      },
      error: healthResult.error,
      timestamp,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      service: 'upstash-redis',
      status: 'down',
      responseTime,
      message: 'Redis health check failed',
      error: error instanceof Error ? error.message : 'Unknown Redis error',
      timestamp,
    };
  }
}

/**
 * Check Upstash QStash connectivity
 */
export async function checkQStash(): Promise<ServiceHealthResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    const healthResult = await qstashHealthCheck();

    return {
      service: 'upstash-qstash',
      status: healthResult.status === 'healthy' ? 'healthy' : 'down',
      responseTime: healthResult.responseTime,
      message: healthResult.message,
      details: {
        configured: healthResult.configured,
      },
      error: healthResult.error,
      timestamp,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      service: 'upstash-qstash',
      status: 'down',
      responseTime,
      message: 'QStash health check failed',
      error: error instanceof Error ? error.message : 'Unknown QStash error',
      timestamp,
    };
  }
}

/**
 * Check Resend email service connectivity
 */
export async function checkResend(): Promise<ServiceHealthResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  if (!ENV_CONFIG.RESEND_API_KEY) {
    return {
      service: 'resend',
      status: 'down',
      responseTime: 0,
      message: 'Resend API key not configured',
      error: 'Missing RESEND_API_KEY',
      timestamp,
    };
  }

  try {
    // Use Resend SDK to check connectivity via domains endpoint (lightweight)
    const { Resend } = await import('resend');
    const resend = new Resend(ENV_CONFIG.RESEND_API_KEY);

    // List domains is a lightweight operation that verifies API connectivity
    await resend.domains.list();

    const responseTime = Date.now() - startTime;

    return {
      service: 'resend',
      status: 'healthy',
      responseTime,
      message: `Resend API connection successful (${responseTime}ms)`,
      timestamp,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Check for specific error types
    const errorMessage = error instanceof Error ? error.message : 'Unknown Resend error';
    const isAuthError = errorMessage.includes('401') || errorMessage.includes('Unauthorized');

    return {
      service: 'resend',
      status: 'down',
      responseTime,
      message: isAuthError ? 'Resend API authentication failed' : 'Resend API connection failed',
      error: errorMessage,
      timestamp,
    };
  }
}

/**
 * Check PostHog analytics connectivity
 */
export async function checkPostHog(): Promise<ServiceHealthResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  if (!ENV_CONFIG.NEXT_PUBLIC_POSTHOG_KEY || !ENV_CONFIG.NEXT_PUBLIC_POSTHOG_HOST) {
    return {
      service: 'posthog',
      status: 'down',
      responseTime: 0,
      message: 'PostHog not configured',
      error: 'Missing PostHog configuration',
      timestamp,
    };
  }

  try {
    // Check if PostHog endpoint is reachable
    const posthogHost = ENV_CONFIG.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';
    const response = await fetch(`${posthogHost}/api/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const responseTime = Date.now() - startTime;

    // PostHog API returns 401 for unauthenticated requests, which is expected
    if (response.status === 401 || response.ok) {
      return {
        service: 'posthog',
        status: 'healthy',
        responseTime,
        message: `PostHog API reachable (${responseTime}ms)`,
        timestamp,
      };
    }

    return {
      service: 'posthog',
      status: 'degraded',
      responseTime,
      message: 'PostHog API returned unexpected status',
      details: {
        statusCode: response.status,
      },
      timestamp,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      service: 'posthog',
      status: 'down',
      responseTime,
      message: 'PostHog API connection failed',
      error: error instanceof Error ? error.message : 'Unknown PostHog error',
      timestamp,
    };
  }
}

/**
 * Check Novu notification service connectivity
 */
export async function checkNovu(): Promise<ServiceHealthResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  if (!ENV_CONFIG.NOVU_SECRET_KEY) {
    return {
      service: 'novu',
      status: 'down',
      responseTime: 0,
      message: 'Novu not configured',
      error: 'Missing NOVU_SECRET_KEY',
      timestamp,
    };
  }

  try {
    // Check Novu API connectivity
    const novuBaseUrl = ENV_CONFIG.NOVU_BASE_URL || 'https://eu.api.novu.co';
    const response = await fetch(`${novuBaseUrl}/v1/subscribers?limit=1`, {
      headers: {
        Authorization: `ApiKey ${ENV_CONFIG.NOVU_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        service: 'novu',
        status: 'down',
        responseTime,
        message: 'Novu API returned error',
        error: `HTTP ${response.status}: ${response.statusText}`,
        timestamp,
      };
    }

    return {
      service: 'novu',
      status: 'healthy',
      responseTime,
      message: `Novu API connection successful (${responseTime}ms)`,
      timestamp,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      service: 'novu',
      status: 'down',
      responseTime,
      message: 'Novu API connection failed',
      error: error instanceof Error ? error.message : 'Unknown Novu error',
      timestamp,
    };
  }
}

/**
 * Check Vercel deployment health
 */
export async function checkVercel(): Promise<ServiceHealthResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    // Check if we're running on Vercel
    const isVercel = process.env.VERCEL === '1';
    const vercelEnv = process.env.VERCEL_ENV;
    const vercelRegion = process.env.VERCEL_REGION;

    const responseTime = Date.now() - startTime;

    return {
      service: 'vercel',
      status: 'healthy',
      responseTime,
      message: isVercel ? 'Running on Vercel' : 'Running locally',
      details: {
        environment: vercelEnv || 'local',
        region: vercelRegion || 'local',
        isVercel,
      },
      timestamp,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      service: 'vercel',
      status: 'degraded',
      responseTime,
      message: 'Could not determine Vercel status',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp,
    };
  }
}

/**
 * Check all services and return comprehensive health status
 */
export async function checkAllServices(): Promise<{
  overall: 'healthy' | 'degraded' | 'down';
  services: ServiceHealthResult[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    down: number;
  };
  timestamp: string;
}> {
  const timestamp = new Date().toISOString();

  // Run all health checks in parallel
  const [vercel, neonDb, auditDb, stripe, clerk, redis, qstash, resend, posthog, novu] =
    await Promise.all([
      checkVercel(),
      checkNeonDatabase(),
      checkAuditDatabase(),
      checkStripe(),
      checkClerk(),
      checkRedis(),
      checkQStash(),
      checkResend(),
      checkPostHog(),
      checkNovu(),
    ]);

  const services = [vercel, neonDb, auditDb, stripe, clerk, redis, qstash, resend, posthog, novu];

  // Calculate summary
  const summary = {
    total: services.length,
    healthy: services.filter((s) => s.status === 'healthy').length,
    degraded: services.filter((s) => s.status === 'degraded').length,
    down: services.filter((s) => s.status === 'down').length,
  };

  // Determine overall status
  let overall: 'healthy' | 'degraded' | 'down' = 'healthy';
  if (summary.down > 0) {
    overall = 'down';
  } else if (summary.degraded > 0) {
    overall = 'degraded';
  }

  return {
    overall,
    services,
    summary,
    timestamp,
  };
}

/**
 * Get health check function for a specific service
 */
export function getServiceHealthCheck(
  service: string,
): (() => Promise<ServiceHealthResult>) | null {
  const serviceMap: Record<string, () => Promise<ServiceHealthResult>> = {
    vercel: checkVercel,
    'neon-database': checkNeonDatabase,
    'audit-database': checkAuditDatabase,
    stripe: checkStripe,
    clerk: checkClerk,
    'upstash-redis': checkRedis,
    'upstash-qstash': checkQStash,
    resend: checkResend,
    posthog: checkPostHog,
    novu: checkNovu,
  };

  return serviceMap[service] || null;
}

/**
 * List all available services for health checks
 */
export function getAvailableServices(): string[] {
  return [
    'vercel',
    'neon-database',
    'audit-database',
    'stripe',
    'clerk',
    'upstash-redis',
    'upstash-qstash',
    'resend',
    'posthog',
    'novu',
  ];
}
