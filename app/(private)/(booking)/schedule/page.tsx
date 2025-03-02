import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { ScheduleForm } from '@/components/organisms/forms/ScheduleForm';
import { db } from '@/drizzle/db';
import { ScheduleTable } from '@/drizzle/schema';
import { markStepComplete } from '@/server/actions/expert-setup';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function SchedulePage() {
  const { userId, redirectToSignIn } = await auth();
  if (userId == null) return redirectToSignIn();

  const schedule = await db.query.ScheduleTable.findFirst({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
    with: { availabilities: true },
  });

  // If the schedule exists and has at least one day with availability, mark step as complete
  if (schedule && Object.values(schedule.availability || {}).some((day) => day.length > 0)) {
    // Mark availability step as complete (non-blocking)
    markStepComplete('availability')
      .then(() => {
        // Server-side revalidation for the layout
        revalidatePath('/(private)/layout');
      })
      .catch((error) => {
        console.error('Failed to mark availability step as complete:', error);
      });
  }

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
