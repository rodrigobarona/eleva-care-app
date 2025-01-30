import { auditDb } from "@/drizzle/auditDb";
import { db } from "@/drizzle/db";
import { sql } from "drizzle-orm";
import { ProfileTable } from "@/drizzle/schema";
import GoogleCalendarService from "@/server/googleCalendar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (
      !process.env.CRON_SECRET ||
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 1. Keep databases alive
    await db.execute(sql`SELECT 1`);
    await auditDb.execute(sql`SELECT 1`);

    // 2. Refresh tokens
    const profiles = await db
      .select({ clerkUserId: ProfileTable.clerkUserId })
      .from(ProfileTable);

    for (const profile of profiles) {
      try {
        await GoogleCalendarService.getInstance().getOAuthClient(
          profile.clerkUserId
        );
        console.log(`Token refreshed for user: ${profile.clerkUserId}`);
      } catch (error) {
        console.error(
          `Failed to refresh token for user ${profile.clerkUserId}:`,
          error
        );
      }
    }

    return new Response("Databases pinged and tokens refreshed successfully", {
      status: 200,
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return new Response("Cron job failed", { status: 500 });
  }
}
