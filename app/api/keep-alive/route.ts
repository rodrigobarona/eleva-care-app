import { auditDb } from "@/drizzle/auditDb";
import { db } from "@/drizzle/db";
import { sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    await db.execute(sql`SELECT 1`);
    await auditDb.execute(sql`SELECT 1`);

    return new Response("Databases pinged successfully", { status: 200 });
  } catch (error) {
    console.error("Database ping failed:", error);
    return new Response("Failed to ping databases", { status: 500 });
  }
}
