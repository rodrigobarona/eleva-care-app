import { db } from '@/drizzle/db';
import { ProfileTable } from '@/drizzle/schema';
import GoogleCalendarService from '@/server/googleCalendar';
import { gt, sql } from 'drizzle-orm';

// Keep Alive - Maintains system health and token freshness
// Performs the following tasks:
// - Comprehensive system health checks via internal health endpoint
// - Keeps databases alive with connectivity checks
// - Refreshes Google Calendar tokens for connected users (in batches)
// - Maintains OAuth token validity
// - Logs system health status and metrics for trend analysis

export const dynamic = 'force-dynamic';

interface KeepAliveMetrics {
  totalProfiles: number;
  successfulRefreshes: number;
  failedRefreshes: number;
  skippedProfiles: number;
  errors: Array<{ userId: string; error: string }>;
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

      // Get the base URL for the health check
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.split(',')[0] || 'http://localhost:3000';
      const healthCheckUrl = `${baseUrl}/api/healthcheck`;

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

    // 2. Database connectivity check
    console.log('🗄️ Checking database connectivity...');
    await db.execute(sql`SELECT 1 as health_check`);
    console.log('✅ Database health check: OK');

    // 3. Refresh tokens in batches for users with Google Calendar connected
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
        overall: healthCheckResult?.status === 'healthy' ? 'healthy' : 'unhealthy',
        database: 'healthy',
        tokenRefresh: metrics.failedRefreshes === 0 ? 'healthy' : 'degraded',
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
          database: 'unknown',
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
