import { auditDb } from '@/drizzle/auditDb';
import { db } from '@/drizzle/db';
import { ProfileTable } from '@/drizzle/schema';
import { qstashHealthCheck } from '@/lib/qstash-config';
import { redisManager } from '@/lib/redis';
import GoogleCalendarService from '@/server/googleCalendar';
import { gt, sql } from 'drizzle-orm';

import { cleanupPaymentRateLimitCache } from '../../../../scripts/cleanup-payment-rate-limit-cache';

/**
 * Safely extracts and validates a base URL from environment variables
 * @param envValue - The environment variable value (potentially comma-separated URLs)
 * @param fallbackUrl - The default URL to use if validation fails
 * @returns A validated URL string
 */
function getValidBaseUrl(
  envValue: string | undefined,
  fallbackUrl: string = 'http://localhost:3000',
): string {
  try {
    // Check if environment variable exists and is non-empty
    if (!envValue || typeof envValue !== 'string' || envValue.trim() === '') {
      console.warn(
        'Environment variable NEXT_PUBLIC_APP_URL is empty or undefined, using fallback',
      );
      return fallbackUrl;
    }

    // Split by comma and get the first URL, trim whitespace
    const urls = envValue
      .split(',')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urls.length === 0) {
      console.warn('No valid URLs found in NEXT_PUBLIC_APP_URL after splitting, using fallback');
      return fallbackUrl;
    }

    const firstUrl = urls[0];

    // Validate the URL using the URL constructor (will throw if invalid)
    const urlObject = new URL(firstUrl);

    // Additional security checks
    if (!['http:', 'https:'].includes(urlObject.protocol)) {
      throw new Error(
        `Invalid protocol: ${urlObject.protocol}. Only http: and https: are allowed.`,
      );
    }

    // Return the validated URL as string
    return urlObject.toString();
  } catch (error) {
    console.error('Failed to validate base URL from environment variable:', {
      envValue,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Validate fallback URL as well
    try {
      const fallbackUrlObject = new URL(fallbackUrl);
      return fallbackUrlObject.toString();
    } catch {
      console.error('Fallback URL is also invalid, using safe default');
      return 'http://localhost:3000';
    }
  }
}

// Keep Alive - Maintains system health and token freshness
// Performs the following tasks:
// - Comprehensive system health checks via internal health endpoint
// - Keeps databases alive with connectivity checks
// - Tests Redis connectivity using PING command (with fallback to in-memory cache)
// - Performs weekly Redis cache cleanup (Sundays 2-4 AM UTC) to remove corrupted entries
// - Verifies QStash connectivity and configuration
// - Refreshes Google Calendar tokens for connected users (in batches)
// - Maintains OAuth token validity
// - Logs system health status and metrics for trend analysis

interface KeepAliveMetrics {
  totalProfiles: number;
  successfulRefreshes: number;
  failedRefreshes: number;
  skippedProfiles: number;
  errors: Array<{ userId: string; error: string }>;
  redisHealth?: {
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    mode: 'redis' | 'in-memory';
    message: string;
    error?: string;
  };
  qstashHealth?: {
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    configured: boolean;
    message: string;
    error?: string;
  };
  cacheCleanup?: {
    executed: boolean;
    scannedKeys: number;
    corruptedKeys: number;
    cleanedKeys: number;
    errors: number;
    skippedKeys: number;
    executionTime: number;
  };
}

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  version: string;
  environment: string;
  timestamp: string;
  responseTime: number;
}

export async function GET(request: Request) {
  const metrics: KeepAliveMetrics = {
    totalProfiles: 0,
    successfulRefreshes: 0,
    failedRefreshes: 0,
    skippedProfiles: 0,
    errors: [],
  };

  let healthCheckResult: HealthCheckResult | null = null;

  try {
    const authHeader = request.headers.get('authorization');

    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const startTime = Date.now();

    // 1. Comprehensive system health check
    console.log('🩺 Starting comprehensive health check...');
    try {
      const healthCheckStart = Date.now();

      // Get the base URL for the health check with proper validation
      const baseUrl = getValidBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
      const healthCheckUrl = `${baseUrl}/api/healthcheck`;

      // Log the URL being used for transparency (but only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`Using health check URL: ${healthCheckUrl}`);
      }

      const healthResponse = await fetch(healthCheckUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'KeepAlive-CronJob/1.0',
          'x-internal-check': 'true',
        },
        // 10 second timeout
        signal: AbortSignal.timeout(10000),
      });

      const healthCheckEnd = Date.now();
      const responseTime = healthCheckEnd - healthCheckStart;

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        healthCheckResult = {
          ...healthData,
          responseTime,
        };

        console.log('✅ Health check passed:', {
          status: healthData.status,
          uptime: `${(healthData.uptime / 3600).toFixed(2)} hours`,
          memory: `${healthData.memory.percentage}%`,
          responseTime: `${responseTime}ms`,
          version: healthData.version,
        });

        // Alert if memory usage is high
        if (healthData.memory.percentage > 85) {
          console.warn('⚠️ HIGH MEMORY USAGE DETECTED:', {
            percentage: healthData.memory.percentage,
            used: `${healthData.memory.used}MB`,
            total: `${healthData.memory.total}MB`,
          });
        }

        // Alert if response time is slow
        if (responseTime > 5000) {
          console.warn('⚠️ SLOW HEALTH CHECK RESPONSE:', {
            responseTime: `${responseTime}ms`,
            threshold: '5000ms',
          });
        }
      } else {
        console.error('❌ Health check failed:', {
          status: healthResponse.status,
          statusText: healthResponse.statusText,
          responseTime: `${responseTime}ms`,
        });

        healthCheckResult = {
          status: 'unhealthy',
          uptime: 0,
          memory: { used: 0, total: 0, percentage: 0 },
          version: 'unknown',
          environment: 'unknown',
          timestamp: new Date().toISOString(),
          responseTime,
        };
      }
    } catch (error) {
      console.error('❌ Health check request failed:', error);
      healthCheckResult = {
        status: 'unhealthy',
        uptime: 0,
        memory: { used: 0, total: 0, percentage: 0 },
        version: 'unknown',
        environment: 'unknown',
        timestamp: new Date().toISOString(),
        responseTime: 0,
      };
    }

    // 2. Database connectivity checks
    let mainDbStatus = 'healthy';
    let auditDbStatus = 'healthy';

    // Check main database
    console.log('🗄️ Checking main database connectivity...');
    try {
      await db.execute(sql`SELECT 1 as main_db_health_check`);
      console.log('✅ Main database health check: OK');
    } catch (error) {
      console.error('❌ Main database health check failed:', error);
      mainDbStatus = 'unhealthy';
    }

    // Check audit database
    console.log('🗄️ Checking audit database connectivity...');
    try {
      await auditDb.execute(sql`SELECT 1 as audit_db_health_check`);
      console.log('✅ Audit database health check: OK');
    } catch (error) {
      console.error('❌ Audit database health check failed:', error);
      auditDbStatus = 'unhealthy';
    }

    // 3. Redis health check and cache maintenance
    console.log('📦 Checking Redis connectivity...');
    try {
      const redisHealth = await redisManager.healthCheck();
      metrics.redisHealth = redisHealth;
      console.log(
        `✅ Redis health check: ${redisHealth.status} (${redisHealth.mode}, ${redisHealth.responseTime}ms)`,
      );

      if (redisHealth.status === 'unhealthy') {
        console.warn('⚠️ Redis is unhealthy:', redisHealth.error);
      }

      // 3.1. Weekly cache cleanup (only if Redis is healthy)
      if (redisHealth.status === 'healthy' && redisHealth.mode === 'redis') {
        const now = new Date();
        const isWeeklyCleanupDay = now.getDay() === 0; // Sunday
        const isCleanupHour = now.getHours() >= 2 && now.getHours() <= 4; // 2-4 AM UTC

        // Also allow manual cleanup via environment variable for testing
        const forceCleanup = process.env.FORCE_CACHE_CLEANUP === 'true';

        if ((isWeeklyCleanupDay && isCleanupHour) || forceCleanup) {
          console.log('🧹 Starting weekly Redis cache cleanup...');
          const cleanupStart = Date.now();

          try {
            const cleanupStats = await cleanupPaymentRateLimitCache();
            const cleanupEnd = Date.now();

            metrics.cacheCleanup = {
              executed: true,
              scannedKeys: cleanupStats.scannedKeys,
              corruptedKeys: cleanupStats.corruptedKeys,
              cleanedKeys: cleanupStats.cleanedKeys,
              errors: cleanupStats.errors,
              skippedKeys: cleanupStats.skippedKeys,
              executionTime: cleanupEnd - cleanupStart,
            };

            console.log(`✅ Cache cleanup completed in ${cleanupEnd - cleanupStart}ms:`, {
              scanned: cleanupStats.scannedKeys,
              corrupted: cleanupStats.corruptedKeys,
              cleaned: cleanupStats.cleanedKeys,
              errors: cleanupStats.errors,
            });

            if (cleanupStats.cleanedKeys > 0) {
              console.log(`🗑️  Removed ${cleanupStats.cleanedKeys} corrupted cache entries`);
            }
          } catch (cleanupError) {
            console.error('❌ Cache cleanup failed:', cleanupError);
            metrics.cacheCleanup = {
              executed: true,
              scannedKeys: 0,
              corruptedKeys: 0,
              cleanedKeys: 0,
              errors: 1,
              skippedKeys: 0,
              executionTime: Date.now() - cleanupStart,
            };
          }
        } else {
          console.log(
            `📅 Cache cleanup scheduled for Sundays 2-4 AM UTC (current: ${now.toISOString()})`,
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      metrics.redisHealth = {
        status: 'unhealthy',
        responseTime: 0,
        mode: 'redis',
        message: 'Redis health check failed',
        error: errorMessage,
      };
      console.error('❌ Redis health check failed:', error);
    }

    // 4. QStash health check
    console.log('📬 Checking QStash connectivity...');
    try {
      const qstashHealth = await qstashHealthCheck();
      metrics.qstashHealth = qstashHealth;
      console.log(
        `✅ QStash health check: ${qstashHealth.status} (configured: ${qstashHealth.configured}, ${qstashHealth.responseTime}ms)`,
      );

      if (qstashHealth.status === 'unhealthy') {
        console.warn('⚠️ QStash is unhealthy:', qstashHealth.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      metrics.qstashHealth = {
        status: 'unhealthy',
        responseTime: 0,
        configured: false,
        message: 'QStash health check failed',
        error: errorMessage,
      };
      console.error('❌ QStash health check failed:', error);
    }

    // 5. Refresh tokens in batches for users with Google Calendar connected
    console.log('🔄 Starting Google Calendar token refresh...');
    const googleCalendarService = GoogleCalendarService.getInstance();
    const batchSize = 50; // Process 50 profiles at a time
    let lastUserId: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const query = db
        .select({ userId: ProfileTable.clerkUserId })
        .from(ProfileTable)
        .limit(batchSize)
        .orderBy(ProfileTable.clerkUserId);

      if (lastUserId) {
        query.where(gt(ProfileTable.clerkUserId, lastUserId));
      }

      const profiles = await query;

      if (profiles.length === 0) {
        hasMore = false;
        break;
      }

      metrics.totalProfiles += profiles.length;
      console.log(
        `Processing batch of ${profiles.length} profiles (after: ${lastUserId || 'start'})`,
      );

      // Process batch concurrently with limited parallelism
      await Promise.allSettled(
        profiles.map(async (profile) => {
          try {
            // Check if user has Google Calendar tokens before attempting refresh
            const hasTokens = await googleCalendarService.hasValidTokens(profile.userId);
            if (hasTokens) {
              await googleCalendarService.getOAuthClient(profile.userId);
              console.log(`Token refreshed for user: ${profile.userId}`);
              metrics.successfulRefreshes++;
            } else {
              metrics.skippedProfiles++;
            }
          } catch (error) {
            // Only log error if it's not related to missing tokens
            if (!(error instanceof Error && error.message.includes('No refresh token'))) {
              console.error(`Failed to refresh token for user ${profile.userId}:`, error);
              metrics.failedRefreshes++;
              metrics.errors.push({
                userId: profile.userId,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            } else {
              metrics.skippedProfiles++;
            }
          }
        }),
      );

      lastUserId = profiles[profiles.length - 1].userId;
    }

    const duration = Date.now() - startTime;
    const summary = {
      ...metrics,
      durationMs: duration,
      status: 'success',
      healthCheck: healthCheckResult,
      systemHealth: {
        overall:
          healthCheckResult?.status === 'healthy' &&
          mainDbStatus === 'healthy' &&
          auditDbStatus === 'healthy' &&
          (!metrics.redisHealth || metrics.redisHealth.status === 'healthy') &&
          (!metrics.qstashHealth || metrics.qstashHealth.status === 'healthy')
            ? 'healthy'
            : 'unhealthy',
        mainDatabase: mainDbStatus,
        auditDatabase: auditDbStatus,
        redis: metrics.redisHealth?.status || 'unknown',
        qstash: metrics.qstashHealth?.status || 'unknown',
        tokenRefresh: metrics.failedRefreshes === 0 ? 'healthy' : 'degraded',
        cacheCleanup: metrics.cacheCleanup
          ? metrics.cacheCleanup.errors === 0
            ? 'healthy'
            : 'degraded'
          : 'not-scheduled',
      },
    };

    console.log('🎉 Keep-alive job completed:', {
      duration: `${duration}ms`,
      systemHealth: summary.systemHealth,
      tokenMetrics: {
        total: metrics.totalProfiles,
        successful: metrics.successfulRefreshes,
        failed: metrics.failedRefreshes,
        skipped: metrics.skippedProfiles,
      },
      serviceHealth: {
        redis: metrics.redisHealth
          ? `${metrics.redisHealth.status} (${metrics.redisHealth.mode}, ${metrics.redisHealth.responseTime}ms)`
          : 'not checked',
        qstash: metrics.qstashHealth
          ? `${metrics.qstashHealth.status} (configured: ${metrics.qstashHealth.configured}, ${metrics.qstashHealth.responseTime}ms)`
          : 'not checked',
      },
      cacheCleanup: metrics.cacheCleanup
        ? {
            executed: metrics.cacheCleanup.executed,
            cleaned: `${metrics.cacheCleanup.cleanedKeys}/${metrics.cacheCleanup.scannedKeys} entries`,
            errors: metrics.cacheCleanup.errors,
            executionTime: `${metrics.cacheCleanup.executionTime}ms`,
          }
        : 'not scheduled',
    });

    return new Response(
      JSON.stringify({
        message: 'Keep-alive completed successfully',
        metrics: summary,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('💥 Keep-alive job failed:', error);
    return new Response(
      JSON.stringify({
        message: 'Keep-alive job failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics,
        healthCheck: healthCheckResult,
        systemHealth: {
          overall: 'unhealthy',
          mainDatabase: 'unknown',
          auditDatabase: 'unknown',
          redis: metrics.redisHealth?.status || 'unknown',
          qstash: metrics.qstashHealth?.status || 'unknown',
          tokenRefresh: 'failed',
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
