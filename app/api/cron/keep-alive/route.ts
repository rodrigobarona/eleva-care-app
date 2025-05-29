import { db } from '@/drizzle/db';
import { ProfileTable } from '@/drizzle/schema';
import GoogleCalendarService from '@/server/googleCalendar';
import { sql } from 'drizzle-orm';

// Keep Alive - Maintains system health and token freshness
// Performs the following tasks:
// - Keeps databases alive with health checks
// - Refreshes Google Calendar tokens for connected users
// - Maintains OAuth token validity
// - Logs system health status

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 1. Keep databases alive
    await db.execute(sql`SELECT 1`);

    // 2. Refresh tokens only for users with Google Calendar connected
    const googleCalendarService = GoogleCalendarService.getInstance();
    const profiles = await db.select({ userId: ProfileTable.clerkUserId }).from(ProfileTable);

    for (const profile of profiles) {
      try {
        // Check if user has Google Calendar tokens before attempting refresh
        const hasTokens = await googleCalendarService.hasValidTokens(profile.userId);
        if (hasTokens) {
          await googleCalendarService.getOAuthClient(profile.userId);
          console.log(`Token refreshed for user: ${profile.userId}`);
        }
      } catch (error) {
        // Only log error if it's not related to missing tokens
        if (!(error instanceof Error && error.message.includes('No refresh token'))) {
          console.error(`Failed to refresh token for user ${profile.userId}:`, error);
        }
      }
    }

    return new Response('Databases pinged and tokens refreshed successfully', {
      status: 200,
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return new Response('Cron job failed', { status: 500 });
  }
}
