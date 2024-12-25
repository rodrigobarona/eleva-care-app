"use server";

import { db } from "@/drizzle/db";
import { EventTable } from "@/drizzle/schema";
import { logAuditEvent } from "@/lib/logAuditEvent";
import { eventFormSchema } from "@/schema/events";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import "use-server";
import type { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// CREATE EVENT
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

// UPDATE EVENT
export async function updateEvent(
  id: string,
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

  // Step 1: Retrieve old values before the update
  const [oldEvent] = await db
    .select()
    .from(EventTable)
    .where(and(eq(EventTable.id, id), eq(EventTable.clerkUserId, userId)))
    .execute(); // Ensure to execute the query to get the old values

  if (!oldEvent) {
    return { error: true }; // Event not found
  }

  // Step 2: Update the event with new values
  const [updatedEvent] = await db
    .update(EventTable)
    .set({ ...data })
    .where(and(eq(EventTable.id, id), eq(EventTable.clerkUserId, userId)))
    .returning({ id: EventTable.id, userId: EventTable.clerkUserId });

  if (!updatedEvent) {
    return { error: true };
  }

  await logAuditEvent(
    updatedEvent.userId,
    "update",
    "events",
    updatedEvent.id,
    oldEvent, // Pass the old values here
    { ...data }, // New values
    ipAddress,
    userAgent
  );

  redirect("/events");
}

// DELETE EVENT
export async function deleteEvent(
  id: string
): Promise<{ error: boolean } | undefined> {
  const { userId } = auth();
  const headersList = headers();

  const ipAddress = headersList.get("x-forwarded-for") ?? "Unknown";
  const userAgent = headersList.get("user-agent") ?? "Unknown";

  if (userId == null) {
    return { error: true };
  }

  // Step 1: Retrieve old values before the update
  const [oldEvent] = await db
    .select()
    .from(EventTable)
    .where(and(eq(EventTable.id, id), eq(EventTable.clerkUserId, userId)))
    .execute(); // Ensure to execute the query to get the old values

  if (!oldEvent) {
    return { error: true }; // Event not found
  }

  // Step 2: Update the event with new values
  const [deletedEvent] = await db
    .delete(EventTable)
    .where(and(eq(EventTable.id, id), eq(EventTable.clerkUserId, userId)))
    .returning({ id: EventTable.id, userId: EventTable.clerkUserId });

  if (!deletedEvent) {
    return { error: true };
  }

  await logAuditEvent(
    deletedEvent.userId,
    "delete",
    "events",
    deletedEvent.id,
    oldEvent, // Pass the old values here
    "User requested deletion",
    ipAddress,
    userAgent
  );

  redirect("/events");
}

export async function updateEventOrder(
  updates: { id: string; order: number }[]
) {
  try {
    // Update each record individually since we can't use transactions
    for (const { id, order } of updates) {
      await db.update(EventTable).set({ order }).where(eq(EventTable.id, id));
    }

    // Revalidate the events page to reflect the new order
    revalidatePath("/events");
    return { success: true };
  } catch (error) {
    console.error("Failed to update event order:", error);
    return { error: "Failed to update event order" };
  }
}

export async function updateEventActiveState(
  id: string,
  isActive: boolean
): Promise<{ error: boolean } | undefined> {
  const { userId } = auth();
  const headersList = headers();

  const ipAddress = headersList.get("x-forwarded-for") ?? "Unknown";
  const userAgent = headersList.get("user-agent") ?? "Unknown";

  if (!userId) {
    return { error: true };
  }

  // Get the old event data
  const [oldEvent] = await db
    .select()
    .from(EventTable)
    .where(and(eq(EventTable.id, id), eq(EventTable.clerkUserId, userId)))
    .execute();

  if (!oldEvent) {
    return { error: true };
  }

  // Update the event
  const [updatedEvent] = await db
    .update(EventTable)
    .set({ isActive })
    .where(and(eq(EventTable.id, id), eq(EventTable.clerkUserId, userId)))
    .returning({ id: EventTable.id, userId: EventTable.clerkUserId });

  if (!updatedEvent) {
    return { error: true };
  }

  await logAuditEvent(
    updatedEvent.userId,
    "update",
    "events",
    updatedEvent.id,
    oldEvent,
    { isActive },
    ipAddress,
    userAgent
  );

  revalidatePath("/events");
  return { error: false };
}
