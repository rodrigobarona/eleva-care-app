import { PackPurchasesView } from '@/components/features/booking/PackPurchasesView';
import { db } from '@/drizzle/db';
import { PackPurchaseTable, SessionPackTable } from '@/drizzle/schema';
import { auth } from '@clerk/nextjs/server';
import { desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export default async function PackPurchasesPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect(process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL || '/');
  }

  const purchases = await db
    .select({
      id: PackPurchaseTable.id,
      buyerEmail: PackPurchaseTable.buyerEmail,
      buyerName: PackPurchaseTable.buyerName,
      promotionCode: PackPurchaseTable.promotionCode,
      maxRedemptions: PackPurchaseTable.maxRedemptions,
      redemptionsUsed: PackPurchaseTable.redemptionsUsed,
      status: PackPurchaseTable.status,
      expiresAt: PackPurchaseTable.expiresAt,
      createdAt: PackPurchaseTable.createdAt,
      packName: SessionPackTable.name,
      packSessionsCount: SessionPackTable.sessionsCount,
    })
    .from(PackPurchaseTable)
    .innerJoin(SessionPackTable, eq(PackPurchaseTable.packId, SessionPackTable.id))
    .where(eq(SessionPackTable.clerkUserId, userId))
    .orderBy(desc(PackPurchaseTable.createdAt));

  return <PackPurchasesView purchases={purchases} />;
}
