import { auditDb } from "@/drizzle/auditDb";
import { db } from "@/drizzle/db";
import { sql } from "drizzle-orm";
export async function GET() {
  try {
    // Keep main database alive with a simple query
    await db.execute(sql`SELECT 1`);

    // Keep audit database alive (assuming you have a separate connection)
    // If you have a separate audit db connection, uncomment and adjust:
    await auditDb.execute(sql`SELECT 1`);

    return new Response("Databases pinged successfully", { status: 200 });
  } catch (error) {
    console.error("Database ping failed:", error);
    return new Response("Failed to ping databases", { status: 500 });
  }
}
