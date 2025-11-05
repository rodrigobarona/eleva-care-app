import type { DAYS_OF_WEEK_IN_ORDER } from '@/app/data/constants';
import { ScheduleForm } from '@/components/features/forms/ScheduleForm';
import { db } from '@/drizzle/db';
import { getBlockedDates } from '@/server/actions/blocked-dates';
import { markStepCompleteNoRevalidate } from '@/server/actions/expert-setup';
import { auth } from '@clerk/nextjs/server';

// Note: Route is dynamic by default with cacheComponents enabled in Next.js 16

type Availability = {
  startTime: string;
  endTime: string;
  dayOfWeek: (typeof DAYS_OF_WEEK_IN_ORDER)[number];
};

export default async function SchedulePage() {
  const { userId, redirectToSignIn } = await auth();
  if (userId == null) return redirectToSignIn();

  const [scheduleData, blockedDates] = await Promise.all([
    db.query.SchedulesTable.findFirst({
      where: ({ workosUserId }, { eq }) => eq(workosUserId, userId),
      with: { availabilities: true },
    }),
    getBlockedDates(),
  ]);

  // Transform the schedule data to match ScheduleForm expectations
  const schedule = scheduleData
    ? {
        timezone: scheduleData.timezone,
        availabilities: scheduleData.availabilities as Availability[],
      }
    : undefined;

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
