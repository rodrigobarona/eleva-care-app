/**
 * @fileoverview Server actions for managing events in the Eleva Care application.
 * This file handles the creation, updating, deletion, and management of events,
 * including validation, logging, and redirection.
 */

'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { db } from '@/drizzle/db';
import { EventTable } from '@/drizzle/schema';
import { eventFormSchema } from '@/schema/events';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import 'use-server';
import type { z } from 'zod';

import { logAuditEvent } from '@/lib/logAuditEvent';

/**
 * @fileoverview Server actions for managing events in the Eleva Care application.
 * This file handles the creation, updating, deletion, and management of events,
 * including validation, logging, and redirection.
 */

/**
 * @fileoverview Server actions for managing events in the Eleva Care application.
 * This file handles the creation, updating, deletion, and management of events,
 * including validation, logging, and redirection.
 */

/**
 * @fileoverview Server actions for managing events in the Eleva Care application.
 * This file handles the creation, updating, deletion, and management of events,
 * including validation, logging, and redirection.
 */

/**
 * Creates a new event using the provided data.
 *
 * @param unsafeData - The data for creating the event, validated against the eventFormSchema.
 * @returns A promise that resolves to an object with an error flag and an optional message on failure, or undefined on success.
 *
 * @example
 * const eventData = { /* event data conforming to eventFormSchema *\/ };
 * const result = await createEvent(eventData);
 * if (result?.error) {
 *   console.error('Event creation failed:', result.message);
 * }
 */
export async function createEvent(
  unsafeData: z.infer<typeof eventFormSchema>,
): Promise<{ error: boolean; message?: string } | undefined> {
  const { userId } = await auth();
  const headersList = await headers();

  const ipAddress = headersList.get('x-forwarded-for') ?? 'Unknown';
  const userAgent = headersList.get('user-agent') ?? 'Unknown';

  const { success, data } = eventFormSchema.safeParse(unsafeData);

  if (!success || userId == null) {
    return { error: true, message: 'Invalid form data' };
  }

  try {
    // Insert event and retrieve the generated ID
    const [insertedEvent] = await db
      .insert(EventTable)
      .values({ ...data, clerkUserId: userId })
      .returning({ id: EventTable.id, userId: EventTable.clerkUserId });

    if (!insertedEvent) {
      return { error: true, message: 'Failed to create event' };
    }

    // Log the event creation
    await logAuditEvent(
      insertedEvent.userId,
      'create',
      'events',
      insertedEvent.id,
      null,
      { ...data },
      ipAddress,
      userAgent,
    );

    // Return success instead of redirecting
    return { error: false };
  } catch (error) {
    console.error('Create event error:', error);
    return { error: true, message: 'Database error occurred' };
  }
}

/**
 * Updates an existing event with the given ID using the provided data.
 *
 * @param id - The unique identifier of the event to update.
 * @param unsafeData - The updated event data, validated against the eventFormSchema.
 * @returns A promise that resolves to an object with an error flag on failure, or undefined on success.
 *
 * @example
 * const updateData = { /* new event data *\/ };
 * const result = await updateEvent('event-id', updateData);
 * if (result?.error) {
 *   console.error('Event update failed');
 * }
 */
export async function updateEvent(
  id: string,
  unsafeData: z.infer<typeof eventFormSchema>,
): Promise<{ error: boolean } | undefined> {
  const { userId } = await auth();
  const headersList = await headers();

  const ipAddress = headersList.get('x-forwarded-for') ?? 'Unknown';
  const userAgent = headersList.get('user-agent') ?? 'Unknown';

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
    'update',
    'events',
    updatedEvent.id,
    oldEvent, // Pass the old values here
    { ...data }, // New values
    ipAddress,
    userAgent,
  );

  redirect('/events');
}

/**
 * Deletes the event with the specified ID.
 *
 * @param id - The unique identifier of the event to delete.
 * @returns A promise that resolves to an object with an error flag on failure, or undefined on success.
 *
 * @example
 * const result = await deleteEvent('event-id');
 * if (result?.error) {
 *   console.error('Failed to delete the event');
 * }
 */
export async function deleteEvent(id: string): Promise<{ error: boolean } | undefined> {
  const { userId } = await auth();
  const headersList = await headers();

  const ipAddress = headersList.get('x-forwarded-for') ?? 'Unknown';
  const userAgent = headersList.get('user-agent') ?? 'Unknown';

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
    'delete',
    'events',
    deletedEvent.id,
    oldEvent, // Pass the old values here
    'User requested deletion',
    ipAddress,
    userAgent,
  );

  redirect('/events');
}

/**
 * Updates the order of events based on the provided array of update objects.
 *
 * @param updates - An array of objects, each containing an event's ID and its new order.
 *
 * @example
 * await updateEventOrder([
 *   { id: 'event1', order: 1 },
 *   { id: 'event2', order: 2 }
 * ]);
 */
export async function updateEventOrder(updates: { id: string; order: number }[]) {
  try {
    // Update each record individually since we can't use transactions
    for (const { id, order } of updates) {
      await db.update(EventTable).set({ order }).where(eq(EventTable.id, id));
    }

    // Revalidate the events page to reflect the new order
    revalidatePath('/events');
    return { success: true };
  } catch (error) {
    console.error('Failed to update event order:', error);
    return { error: 'Failed to update event order' };
  }
}

/**
 * Updates the active state of the event with the given ID.
 *
 * @param id - The unique identifier of the event.
 * @param isActive - A boolean indicating whether the event should be active (true) or inactive (false).
 * @returns A promise that resolves to an object with an error flag on failure, or undefined on success.
 *
 * @example
 * const result = await updateEventActiveState('event-id', true);
 * if (result?.error) {
 *   console.error('Failed to update the event active state');
 * }
 */
export async function updateEventActiveState(
  id: string,
  isActive: boolean,
): Promise<{ error: boolean } | undefined> {
  const { userId } = await auth();
  const headersList = await headers();

  const ipAddress = headersList.get('x-forwarded-for') ?? 'Unknown';
  const userAgent = headersList.get('user-agent') ?? 'Unknown';

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

  // Log the event update
  await logAuditEvent(
    updatedEvent.userId,
    'update',
    'events',
    updatedEvent.id,
    oldEvent,
    { isActive },
    ipAddress,
    userAgent,
  );

  revalidatePath('/events');
  return { error: false };
}
