import { ScheduleForm } from '@/components/organisms/forms/ScheduleForm';
import { db } from '@/drizzle/db';
import { getBlockedDates } from '@/server/actions/blocked-dates';
import { markStepCompleteNoRevalidate } from '@/server/actions/expert-setup';
import { auth } from '@clerk/nextjs/server';

export const revalidate = 0;

export default async function SchedulePage() {
  const { userId, redirectToSignIn } = await auth();
  if (userId == null) return redirectToSignIn();

  const [schedule, blockedDates] = await Promise.all([
    db.query.ScheduleTable.findFirst({
      where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
      with: { availabilities: true },
    }),
    getBlockedDates(),
  ]);

  // If the schedule exists and has at least one day with availability, mark step as complete
  if (schedule && schedule.availabilities.length > 0) {
    // Mark availability step as complete (non-blocking)
    try {
      await markStepCompleteNoRevalidate('availability');
    } catch (error) {
      console.error('Failed to mark availability step as complete:', error);
    }
  }

  return (
    <div className="w-full">
      <ScheduleForm schedule={schedule} blockedDates={blockedDates} />
    </div>
  );
}
