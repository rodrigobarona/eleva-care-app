'use server';

import { db } from '@/drizzle/db';
import { EventTable, SessionPackTable } from '@/drizzle/schema';
import { getServerStripe } from '@/lib/integrations/stripe';
import { logAuditEvent } from '@/lib/utils/server/audit';
import { packFormSchema } from '@/schema/packs';
import { PACK_CREATED, PACK_DELETED, PACK_UPDATED } from '@/types/audit';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { z } from 'zod';

export async function createPack(
  unsafeData: z.infer<typeof packFormSchema>,
): Promise<{ error: boolean; message?: string } | undefined> {
  const { userId } = await auth();
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for') ?? 'Unknown';
  const userAgent = headersList.get('user-agent') ?? 'Unknown';

  const { success, data } = packFormSchema.safeParse(unsafeData);

  if (!success || userId == null) {
    return { error: true, message: 'Invalid form data' };
  }

  const event = await db.query.EventTable.findFirst({
    where: and(eq(EventTable.id, data.eventId), eq(EventTable.clerkUserId, userId)),
  });

  if (!event) {
    return { error: true, message: 'Event not found or not owned by you' };
  }

  try {
    const stripe = await getServerStripe();

    const product = await stripe.products.create({
      name: `Pack: ${data.name}`,
      description: data.description || `${data.sessionsCount} sessions of ${event.name}`,
      metadata: {
        clerkUserId: userId,
        eventId: data.eventId,
        type: 'session_pack',
        sessionsCount: data.sessionsCount.toString(),
      },
    });

    const stripePrice = await stripe.prices.create({
      product: product.id,
      unit_amount: data.price,
      currency: data.currency,
    });

    const [insertedPack] = await db
      .insert(SessionPackTable)
      .values({
        ...data,
        clerkUserId: userId,
        stripeProductId: product.id,
        stripePriceId: stripePrice.id,
      })
      .returning({ id: SessionPackTable.id });

    if (!insertedPack) {
      return { error: true, message: 'Failed to create session pack' };
    }

    await logAuditEvent(
      userId,
      PACK_CREATED,
      'session_pack',
      insertedPack.id,
      null,
      { ...data, stripeProductId: product.id, stripePriceId: stripePrice.id },
      ipAddress,
      userAgent,
    );

    revalidatePath('/booking/packs');
    return { error: false };
  } catch (error) {
    console.error('Create pack error:', error);
    return { error: true, message: 'Failed to create session pack' };
  }
}

export async function updatePack(
  id: string,
  unsafeData: z.infer<typeof packFormSchema>,
): Promise<{ error: boolean; message?: string } | undefined> {
  const { userId } = await auth();
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for') ?? 'Unknown';
  const userAgent = headersList.get('user-agent') ?? 'Unknown';

  const { success, data } = packFormSchema.safeParse(unsafeData);

  if (!success || userId == null) {
    return { error: true, message: 'Invalid form data' };
  }

  const [oldPack] = await db
    .select()
    .from(SessionPackTable)
    .where(and(eq(SessionPackTable.id, id), eq(SessionPackTable.clerkUserId, userId)))
    .execute();

  if (!oldPack) {
    return { error: true, message: 'Pack not found' };
  }

  try {
    const stripe = await getServerStripe();

    if (oldPack.stripeProductId) {
      await stripe.products.update(oldPack.stripeProductId, {
        name: `Pack: ${data.name}`,
        description: data.description || undefined,
        metadata: {
          clerkUserId: userId,
          eventId: data.eventId,
          type: 'session_pack',
          sessionsCount: data.sessionsCount.toString(),
        },
      });
    }

    if (oldPack.stripeProductId && data.price !== oldPack.price) {
      const newPrice = await stripe.prices.create({
        product: oldPack.stripeProductId,
        unit_amount: data.price,
        currency: data.currency,
      });

      if (oldPack.stripePriceId) {
        await stripe.prices.update(oldPack.stripePriceId, { active: false });
      }

      await db
        .update(SessionPackTable)
        .set({ ...data, stripePriceId: newPrice.id })
        .where(and(eq(SessionPackTable.id, id), eq(SessionPackTable.clerkUserId, userId)));
    } else {
      await db
        .update(SessionPackTable)
        .set({ ...data })
        .where(and(eq(SessionPackTable.id, id), eq(SessionPackTable.clerkUserId, userId)));
    }

    await logAuditEvent(
      userId,
      PACK_UPDATED,
      'session_pack',
      id,
      oldPack,
      { ...data },
      ipAddress,
      userAgent,
    );

    revalidatePath('/booking/packs');
    redirect('/booking/packs');
  } catch (error) {
    console.error('Update pack error:', error);
    return { error: true, message: 'Failed to update session pack' };
  }
}

export async function deletePack(
  id: string,
): Promise<{ error: boolean; message?: string } | undefined> {
  const { userId } = await auth();
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for') ?? 'Unknown';
  const userAgent = headersList.get('user-agent') ?? 'Unknown';

  if (userId == null) {
    return { error: true, message: 'Unauthorized' };
  }

  try {
    const [oldPack] = await db
      .select()
      .from(SessionPackTable)
      .where(and(eq(SessionPackTable.id, id), eq(SessionPackTable.clerkUserId, userId)))
      .execute();

    if (!oldPack) {
      return { error: true, message: 'Pack not found' };
    }

    if (oldPack.stripeProductId) {
      try {
        const stripe = await getServerStripe();
        await stripe.products.update(oldPack.stripeProductId, { active: false });
      } catch (stripeError) {
        console.error('Failed to archive Stripe product:', stripeError);
      }
    }

    const [deletedPack] = await db
      .delete(SessionPackTable)
      .where(and(eq(SessionPackTable.id, id), eq(SessionPackTable.clerkUserId, userId)))
      .returning({ id: SessionPackTable.id });

    if (!deletedPack) {
      return { error: true, message: 'Failed to delete pack' };
    }

    await logAuditEvent(
      userId,
      PACK_DELETED,
      'session_pack',
      deletedPack.id,
      oldPack,
      'User requested deletion',
      ipAddress,
      userAgent,
    );

    revalidatePath('/booking/packs');
    return { error: false };
  } catch (error) {
    console.error('Delete pack error:', error);
    return { error: true, message: 'Failed to delete session pack' };
  }
}

export async function updatePackActiveState(
  id: string,
  isActive: boolean,
): Promise<{ error: boolean } | undefined> {
  const { userId } = await auth();

  if (!userId) {
    return { error: true };
  }

  try {
    const pack = await db.query.SessionPackTable.findFirst({
      where: and(eq(SessionPackTable.id, id), eq(SessionPackTable.clerkUserId, userId)),
    });

    if (!pack) {
      return { error: true };
    }

    await db
      .update(SessionPackTable)
      .set({ isActive })
      .where(and(eq(SessionPackTable.id, id), eq(SessionPackTable.clerkUserId, userId)));

    revalidatePath('/booking/packs');
    return { error: false };
  } catch (error) {
    console.error('Update pack active state error:', error);
    return { error: true };
  }
}
