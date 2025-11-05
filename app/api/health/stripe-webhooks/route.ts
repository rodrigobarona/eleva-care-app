/**
 * 🔗 Stripe Webhook Health Monitor
 *
 * Dedicated health check endpoint for monitoring Stripe webhook processing.
 * This endpoint tracks webhook success/failure rates and provides detailed
 * diagnostics for BetterStack and other monitoring services.
 *
 * Usage:
 * - BetterStack Monitor: GET /api/health/stripe-webhooks
 * - Returns 200 if healthy, 503 if degraded/unhealthy
 * - Tracks last 100 webhook events and provides statistics
 *
 * Monitored Metrics:
 * - Success rate (last 100 events)
 * - Recent failures with error details
 * - Last successful webhook timestamp
 * - Average processing time
 * - Configuration health
 *
 * Alert Thresholds:
 * - Critical: Success rate < 80% or no successful webhooks in 1 hour
 * - Warning: Success rate < 95% or processing time > 5s
 */
import { ENV_CONFIG } from '@/config/env';
import { RedisWebhookMonitor } from '@/lib/redis/webhook-monitor';
import { NextResponse } from 'next/server';

// Route config for Vercel
export const maxDuration = 30;
export const preferredRegion = 'auto';

interface WebhookHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  metrics: {
    totalProcessed: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    lastSuccessTimestamp: string | null;
    lastFailureTimestamp: string | null;
    averageProcessingTimeMs: number;
    recentEvents: number;
  };
  recentFailures: Array<{
    eventId: string;
    eventType: string;
    error: string;
    timestamp: string;
  }>;
  config: {
    webhookSecretConfigured: boolean;
    stripeKeyConfigured: boolean;
    novuConfigured: boolean;
  };
  alerts: string[];
  recommendations: string[];
}

/**
 * Check if configuration is healthy
 */
function checkConfiguration() {
  return {
    webhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    stripeKeyConfigured: Boolean(ENV_CONFIG.STRIPE_SECRET_KEY),
    novuConfigured: Boolean(ENV_CONFIG.NOVU_SECRET_KEY),
  };
}

/**
 * Determine overall health status based on metrics
 */
function determineHealthStatus(
  metrics: WebhookHealthStatus['metrics'],
  config: WebhookHealthStatus['config'],
): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  alerts: string[];
  recommendations: string[];
} {
  const alerts: string[] = [];
  const recommendations: string[] = [];

  // Critical configuration issues
  if (!config.webhookSecretConfigured) {
    alerts.push('CRITICAL: Stripe webhook secret not configured');
    recommendations.push('Set STRIPE_WEBHOOK_SECRET environment variable');
    return { status: 'unhealthy', alerts, recommendations };
  }

  if (!config.stripeKeyConfigured) {
    alerts.push('CRITICAL: Stripe API key not configured');
    recommendations.push('Set STRIPE_SECRET_KEY environment variable');
    return { status: 'unhealthy', alerts, recommendations };
  }

  // No recent webhook activity (might be normal, but worth noting)
  if (metrics.totalProcessed === 0) {
    alerts.push('INFO: No webhook events processed yet');
    return { status: 'healthy', alerts, recommendations };
  }

  // Check last success timestamp (critical if > 1 hour with failures)
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  if (metrics.lastSuccessTimestamp) {
    const lastSuccess = new Date(metrics.lastSuccessTimestamp).getTime();
    if (lastSuccess < oneHourAgo && metrics.failureCount > 0) {
      alerts.push(
        `CRITICAL: No successful webhooks in the last hour (${metrics.failureCount} failures)`,
      );
      recommendations.push('Check Stripe webhook logs and server logs immediately');
      return { status: 'unhealthy', alerts, recommendations };
    }
  }

  // Check success rate
  if (metrics.successRate < 0.8) {
    // Less than 80% success rate
    alerts.push(`CRITICAL: Low success rate (${(metrics.successRate * 100).toFixed(1)}%)`);
    recommendations.push('Review recent failures and fix underlying issues');
    return { status: 'unhealthy', alerts, recommendations };
  }

  if (metrics.successRate < 0.95) {
    // Less than 95% success rate
    alerts.push(`WARNING: Degraded success rate (${(metrics.successRate * 100).toFixed(1)}%)`);
    recommendations.push('Monitor closely and investigate recent failures');
    return { status: 'degraded', alerts, recommendations };
  }

  // Check average processing time
  if (metrics.averageProcessingTimeMs > 5000) {
    alerts.push(
      `WARNING: Slow processing time (${metrics.averageProcessingTimeMs.toFixed(0)}ms avg)`,
    );
    recommendations.push('Optimize webhook handler or check database performance');
    return { status: 'degraded', alerts, recommendations };
  }

  // All checks passed
  return { status: 'healthy', alerts, recommendations };
}

/**
 * GET /api/health/stripe-webhooks
 *
 * Returns health status of Stripe webhook processing
 */
export async function GET() {
  try {
    const monitor = RedisWebhookMonitor.getInstance();
    const config = checkConfiguration();

    // Get webhook statistics from Redis
    const stats = await monitor.getStats('stripe');

    // Get recent failures for debugging
    const recentFailures = await monitor.getRecentFailures('stripe', 5);

    // Calculate metrics
    const totalProcessed = stats.successCount + stats.failureCount;
    const successRate = totalProcessed > 0 ? stats.successCount / totalProcessed : 1;

    const metrics = {
      totalProcessed,
      successCount: stats.successCount,
      failureCount: stats.failureCount,
      successRate,
      lastSuccessTimestamp: stats.lastSuccessTimestamp,
      lastFailureTimestamp: stats.lastFailureTimestamp,
      averageProcessingTimeMs: stats.averageProcessingTimeMs,
      recentEvents: stats.recentEvents,
    };

    // Determine overall health
    const { status, alerts, recommendations } = determineHealthStatus(metrics, config);

    const healthStatus: WebhookHealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      metrics,
      recentFailures: recentFailures.map((f) => ({
        eventId: f.eventId,
        eventType: f.eventType,
        error: f.error,
        timestamp: f.timestamp,
      })),
      config,
      alerts,
      recommendations,
    };

    // Log health check for monitoring
    console.log('🏥 Stripe webhook health check:', {
      status: healthStatus.status,
      successRate: `${(successRate * 100).toFixed(1)}%`,
      totalProcessed,
      alerts: alerts.length,
    });

    // Return appropriate HTTP status
    const httpStatus = status === 'unhealthy' ? 503 : 200;

    return NextResponse.json(healthStatus, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Webhook-Status': status,
        'X-Success-Rate': successRate.toFixed(3),
      },
    });
  } catch (error) {
    console.error('❌ Stripe webhook health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
        alerts: ['CRITICAL: Unable to perform health check'],
        recommendations: ['Check Redis connectivity and server logs'],
      },
      { status: 503 },
    );
  }
}
