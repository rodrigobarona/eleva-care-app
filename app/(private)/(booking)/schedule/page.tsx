import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { ScheduleForm } from '@/components/organisms/forms/ScheduleForm';
import { db } from '@/drizzle/db';
import { auth } from '@clerk/nextjs/server';

export const revalidate = 0;

export default async function SchedulePage() {
  const { userId, redirectToSignIn } = await auth();
  if (userId == null) return redirectToSignIn();

  const schedule = await db.query.ScheduleTable.findFirst({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
    with: { availabilities: true },
  });

  return (
    <Card className="max-auto max-w-md">
      <CardHeader>
        <CardTitle>Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <ScheduleForm schedule={schedule} />
      </CardContent>
    </Card>
  );
}
