import { auditDb } from "@/drizzle/auditDb";
import { db } from "@/drizzle/db";
import { sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (token !== process.env.KEEP_ALIVE_TOKEN) {
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
