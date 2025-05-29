import { db } from '@/drizzle/db';
import { ProfileTable } from '@/drizzle/schema';
import GoogleCalendarService from '@/server/googleCalendar';
import { sql } from 'drizzle-orm';

// Keep Alive - Maintains system health and token freshness
// Performs the following tasks:
// - Keeps databases alive with health checks
// - Refreshes Google Calendar tokens for connected users (in batches)
// - Maintains OAuth token validity
// - Logs system health status and metrics

export const dynamic = 'force-dynamic';

interface KeepAliveMetrics {
  totalProfiles: number;
  successfulRefreshes: number;
  failedRefreshes: number;
  skippedProfiles: number;
  errors: Array<{ userId: string; error: string }>;
}

export async function GET(request: Request) {
  const metrics: KeepAliveMetrics = {
    totalProfiles: 0,
    successfulRefreshes: 0,
    failedRefreshes: 0,
    skippedProfiles: 0,
    errors: [],
  };

  try {
    const authHeader = request.headers.get('authorization');

    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const startTime = Date.now();

    // 1. Keep databases alive
    await db.execute(sql`SELECT 1`);
    console.log('Database health check: OK');

    // 2. Refresh tokens in batches for users with Google Calendar connected
    const googleCalendarService = GoogleCalendarService.getInstance();
    const batchSize = 50; // Process 50 profiles at a time
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const profiles = await db
        .select({ userId: ProfileTable.clerkUserId })
        .from(ProfileTable)
        .limit(batchSize)
        .offset(offset);

      if (profiles.length === 0) {
        hasMore = false;
        break;
      }

      metrics.totalProfiles += profiles.length;
      console.log(`Processing batch of ${profiles.length} profiles (offset: ${offset})`);

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

      offset += batchSize;
    }

    const duration = Date.now() - startTime;
    const summary = {
      ...metrics,
      durationMs: duration,
      status: 'success',
    };

    console.log('Keep-alive job completed:', summary);

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
    console.error('Keep-alive job failed:', error);
    return new Response(
      JSON.stringify({
        message: 'Keep-alive job failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics,
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
