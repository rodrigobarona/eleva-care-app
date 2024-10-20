"use server";

import { db } from "@/drizzle/db";
import { EventTable } from "@/drizzle/schema";
import { logAuditEvent } from "@/lib/logAuditEvent";
import { eventFormSchema } from "@/schema/events";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import "use-server";
import { z } from "zod";

export async function createEvent(
  unsafeData: z.infer<typeof eventFormSchema>
): Promise<{ error: boolean } | undefined> {
  const { userId } = auth();
  const headersList = headers();

  const ipAddress = headersList.get("x-forwarded-for") ?? "Unknown";
  const userAgent = headersList.get("user-agent") ?? "Unknown";

  const { success, data } = eventFormSchema.safeParse(unsafeData);

  if (!success || userId == null) {
    return { error: true };
  }

  // Insert event and retrieve the generated ID
  const [insertedEvent] = await db
    .insert(EventTable)
    .values({ ...data, clerkUserId: userId })
    .returning({ id: EventTable.id, userId: EventTable.clerkUserId });

  if (!insertedEvent) {
    return { error: true };
  }

  await logAuditEvent(
    db,
    insertedEvent.userId,
    "create",
    "events",
    insertedEvent.id,
    null,
    { ...data },
    ipAddress,
    userAgent
  );

  redirect("/events");
}
