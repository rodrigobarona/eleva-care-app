import { ScheduleForm } from '@/components/organisms/forms/ScheduleForm';
import { SchedulingSettingsForm } from '@/components/organisms/forms/SchedulingSettingsForm';
import { db } from '@/drizzle/db';
import { markStepCompleteNoRevalidate } from '@/server/actions/expert-setup';
import { auth } from '@clerk/nextjs/server';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@tremor/react';

export const revalidate = 0;

export default async function SchedulePage() {
  const { userId, redirectToSignIn } = await auth();
  if (userId == null) return redirectToSignIn();

  const schedule = await db.query.ScheduleTable.findFirst({
    where: ({ clerkUserId }, { eq }) => eq(clerkUserId, userId),
    with: { availabilities: true },
  });

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
    <div className="space-y-6">
      <div>
        <h3 className="text-tremor-title text-tremor-content-strong dark:text-dark-tremor-content-strong font-bold">
          Scheduling Configuration
        </h3>
        <p className="text-tremor-default text-tremor-content dark:text-dark-tremor-content mt-2 leading-6">
          Manage your availability schedule and booking preferences for client appointments.
        </p>
      </div>

      <TabGroup className="mt-6">
        <TabList>
          <Tab>Schedule</Tab>
          <Tab>Limits</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className="mt-6 max-w-md">
              <ScheduleForm schedule={schedule} />
            </div>
          </TabPanel>
          <TabPanel>
            <div className="mt-6 max-w-md">
              <SchedulingSettingsForm />
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}
