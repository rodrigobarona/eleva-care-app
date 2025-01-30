import GoogleCalendarService from "@/server/googleCalendar";
import { db } from "@/drizzle/db";
import { ProfileTable } from "@/drizzle/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get("authorization");
    if (
      !process.env.CRON_SECRET ||
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get all user IDs
    const profiles = await db
      .select({ clerkUserId: ProfileTable.clerkUserId })
      .from(ProfileTable);

    const userIds = profiles.map((profile) => profile.clerkUserId);

    // Refresh tokens
    for (const userId of userIds) {
      try {
        await GoogleCalendarService.getInstance().getOAuthClient(userId);
        console.log(`Token refreshed for user: ${userId}`);
      } catch (error) {
        console.error(`Failed to refresh token for user ${userId}:`, error);
      }
    }

    return new Response("Tokens refreshed successfully", { status: 200 });
  } catch (error) {
    console.error("Background token refresh failed:", error);
    return new Response("Failed to refresh tokens", { status: 500 });
  }
}
