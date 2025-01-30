import cron from "node-cron";
import GoogleCalendarService from "./googleCalendar";
import { db } from "@/drizzle/db";
import { ProfileTable } from "@/drizzle/schema";

function scheduleTokenRefresh() {
  // Run at minute 0 of every hour (i.e., hourly)
  cron.schedule("0 * * * *", async () => {
    try {
      // Assuming you have a way to get all user IDs that need token refresh
      const userIds = await getAllUserIds();

      for (const userId of userIds) {
        try {
          await GoogleCalendarService.getInstance().getOAuthClient(userId);
          console.log(`Token refreshed for user: ${userId}`);
        } catch (error) {
          console.error(`Failed to refresh token for user ${userId}:`, error);
        }
      }
    } catch (error) {
      console.error("Background token check failed:", error);
    }
  });
}

function getAllUserIds(): Promise<string[]> {
  return db
    .select({ clerkUserId: ProfileTable.clerkUserId })
    .from(ProfileTable)
    .then((profiles) => profiles.map((profile) => profile.clerkUserId));
}

scheduleTokenRefresh();
