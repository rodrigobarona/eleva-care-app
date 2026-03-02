import { PacksList } from '@/components/features/booking/PacksList';
import { db } from '@/drizzle/db';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function PacksPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`);
  }

  const packs = await db.query.SessionPackTable.findMany({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
    with: {
      event: {
        columns: { name: true, slug: true },
      },
    },
    orderBy: ({ createdAt }, { desc }) => desc(createdAt),
  });

  return <PacksList initialPacks={packs} />;
}
