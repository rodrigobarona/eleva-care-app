'use server';

import { STRIPE_CONFIG } from '@/config/stripe';
import { db } from '@/drizzle/db';
import { EventTable, PackPurchaseTable, SessionPackTable } from '@/drizzle/schema';
import { getServerStripe } from '@/lib/integrations/stripe';
import { logAuditEvent } from '@/lib/utils/server/audit';
import { packFormSchema } from '@/schema/packs';
import { PACK_CREATED, PACK_DELETED, PACK_UPDATED } from '@/types/audit';
import { auth } from '@clerk/nextjs/server';
import { and, count, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
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
      tax_code: STRIPE_CONFIG.TAX.DEFAULT_TAX_CODE,
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
      tax_behavior: STRIPE_CONFIG.TAX.DEFAULT_TAX_BEHAVIOR,
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

  if (data.eventId !== oldPack.eventId) {
    const event = await db.query.EventTable.findFirst({
      where: and(eq(EventTable.id, data.eventId), eq(EventTable.clerkUserId, userId)),
    });
    if (!event) {
      return { error: true, message: 'Event not found or not owned by you' };
    }
  }

  try {
    const stripe = await getServerStripe();

    if (oldPack.stripeProductId) {
      await stripe.products.update(oldPack.stripeProductId, {
        name: `Pack: ${data.name}`,
        description: data.description || undefined,
        tax_code: STRIPE_CONFIG.TAX.DEFAULT_TAX_CODE,
        metadata: {
          clerkUserId: userId,
          eventId: data.eventId,
          type: 'session_pack',
          sessionsCount: data.sessionsCount.toString(),
        },
      });
    }

    const safeUpdate = {
      name: data.name,
      description: data.description,
      sessionsCount: data.sessionsCount,
      price: data.price,
      currency: data.currency,
      eventId: data.eventId,
      isActive: data.isActive,
      expirationDays: data.expirationDays,
    };

    if (oldPack.stripeProductId && (data.price !== oldPack.price || data.currency !== oldPack.currency)) {
      const newPrice = await stripe.prices.create({
        product: oldPack.stripeProductId,
        unit_amount: data.price,
        currency: data.currency,
        tax_behavior: STRIPE_CONFIG.TAX.DEFAULT_TAX_BEHAVIOR,
      });

      if (oldPack.stripePriceId) {
        await stripe.prices.update(oldPack.stripePriceId, { active: false });
      }

      await db
        .update(SessionPackTable)
        .set({ ...safeUpdate, stripePriceId: newPrice.id })
        .where(and(eq(SessionPackTable.id, id), eq(SessionPackTable.clerkUserId, userId)));
    } else {
      await db
        .update(SessionPackTable)
        .set(safeUpdate)
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
    return { error: false };
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

    // Check if any purchases exist - if so, soft-delete (deactivate) instead
    const [purchaseCount] = await db
      .select({ count: count() })
      .from(PackPurchaseTable)
      .where(eq(PackPurchaseTable.packId, id));

    if (oldPack.stripeProductId) {
      try {
        const stripe = await getServerStripe();
        await stripe.products.update(oldPack.stripeProductId, { active: false });
      } catch (stripeError) {
        console.error('Failed to archive Stripe product:', stripeError);
      }
    }

    let deletedPack: { id: string } | undefined;

    if ((purchaseCount?.count ?? 0) > 0) {
      // Soft-delete: deactivate the pack to preserve FK integrity with existing purchases
      const [updated] = await db
        .update(SessionPackTable)
        .set({ isActive: false })
        .where(and(eq(SessionPackTable.id, id), eq(SessionPackTable.clerkUserId, userId)))
        .returning({ id: SessionPackTable.id });
      deletedPack = updated;
    } else {
      const [deleted] = await db
        .delete(SessionPackTable)
        .where(and(eq(SessionPackTable.id, id), eq(SessionPackTable.clerkUserId, userId)))
        .returning({ id: SessionPackTable.id });
      deletedPack = deleted;
    }

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
