'use server';

import { db } from '@/drizzle/db';
import { EventTable, MeetingTable } from '@/drizzle/schema';
import { logAuditEvent } from '@/lib/logAuditEvent';
import { getServerStripe } from '@/lib/stripe';
import { eventFormSchema } from '@/schema/events';
import { markStepComplete } from '@/server/actions/expert-setup';
import { checkExpertSetupStatus } from '@/server/actions/expert-setup';
import { auth } from '@clerk/nextjs/server';
import { and, count, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import 'use-server';
import type { z } from 'zod';

/**
 * @fileoverview Server actions for managing events in the Eleva Care application.
 * This file handles the creation, updating, deletion, and management of events,
 * including validation, logging, and redirection.
 
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

    // If the event is marked as active, mark the events step as complete
    if (data.isActive) {
      try {
        await markStepComplete('events');
      } catch (error) {
        console.error('Failed to mark events step as complete:', error);
      }
    }

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

  // If the event is active, mark the events step as complete
  if (data.isActive) {
    try {
      await markStepComplete('events');
    } catch (error) {
      console.error('Failed to mark events step as complete:', error);
    }
  }

  // After update, refresh the expert setup status
  await checkExpertSetupStatus();

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

  try {
    // Step 1: Retrieve old values before deletion
    const [oldEvent] = await db
      .select()
      .from(EventTable)
      .where(and(eq(EventTable.id, id), eq(EventTable.clerkUserId, userId)))
      .execute();

    if (!oldEvent) {
      return { error: true }; // Event not found
    }

    // Step 2: If there's a Stripe product, archive it
    if (oldEvent.stripeProductId) {
      try {
        const stripe = await getServerStripe();
        await stripe.products.update(oldEvent.stripeProductId, {
          active: false,
        });
      } catch (stripeError) {
        console.error('Failed to archive Stripe product:', stripeError);
        // Continue with event deletion even if Stripe archival fails
      }
    }

    // Step 3: Delete the event
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
      oldEvent,
      'User requested deletion',
      ipAddress,
      userAgent,
    );

    revalidatePath('/events');

    // After deletion, check if there are any events left
    const remainingEventsCount = await db
      .select({ count: count() })
      .from(EventTable)
      .where(eq(EventTable.clerkUserId, userId))
      .then((result) => result[0]?.count || 0);

    // Check and update the expert setup status
    await checkExpertSetupStatus();

    return { error: false };
  } catch (error) {
    console.error('Delete event error:', error);
    return { error: true };
  }
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

  try {
    // Fetch the event to check ownership and log the previous state
    const event = await db.query.EventTable.findFirst({
      where: and(eq(EventTable.id, id), eq(EventTable.clerkUserId, userId)),
    });

    if (!event) {
      return { error: true };
    }

    // Update the event's active status
    await db
      .update(EventTable)
      .set({ isActive })
      .where(and(eq(EventTable.id, id), eq(EventTable.clerkUserId, userId)));

    // Log the update action
    await logAuditEvent(
      userId,
      'update',
      'events',
      id,
      { isActive: event.isActive },
      { isActive },
      ipAddress,
      userAgent,
    );

    // If the event is being activated, mark the events step as complete
    if (isActive) {
      try {
        await markStepComplete('events');
      } catch (error) {
        console.error('Failed to mark events step as complete:', error);
      }
    }

    // Revalidate various paths to update UI
    revalidatePath('/events');
    revalidatePath(`/events/${event.slug}`);
    revalidatePath('/');
    revalidatePath(`/${event.slug}`);

    return { error: false };
  } catch (error) {
    console.error('Update event active state error:', error);
    return { error: true };
  }
}

export async function getEventMeetingsCount(eventId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(MeetingTable)
    .where(eq(MeetingTable.eventId, eventId));

  return result[0]?.count ?? 0;
}
