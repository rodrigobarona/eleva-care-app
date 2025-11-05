/**
 * API Routes for Scheduling Settings
 *
 * Provides endpoints for:
 * - Getting user's scheduling settings
 * - Updating scheduling settings
 */
import { getUserSchedulingSettings, updateSchedulingSettings } from '@/server/schedulingSettings';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';

/**
 * GET handler for fetching scheduling settings
 *
 * @returns Current scheduling settings for the authenticated user
 */
export async function GET() {
  try {
    const { user } = await withAuth();
  const userId = user?.id;

    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }

    const settings = await getUserSchedulingSettings(userId);

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching scheduling settings:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch scheduling settings' }), {
      status: 500,
    });
  }
}

/**
 * PATCH handler for updating scheduling settings
 *
 * @param request Contains the requested updates to settings
 * @returns Updated scheduling settings
 */
export async function PATCH(request: Request) {
  try {
    const { user } = await withAuth();
  const userId = user?.id;

    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }

    const updates = await request.json();

    // Validate the input
    const validUpdates: Record<string, number> = {};

    // Process buffer time before events
    if (typeof updates.beforeEventBuffer === 'number' && updates.beforeEventBuffer >= 0) {
      validUpdates.beforeEventBuffer = updates.beforeEventBuffer;
    }

    // Process buffer time after events
    if (typeof updates.afterEventBuffer === 'number' && updates.afterEventBuffer >= 0) {
      validUpdates.afterEventBuffer = updates.afterEventBuffer;
    }

    // Process minimum notice period
    if (
      typeof updates.minimumNotice === 'number' &&
      updates.minimumNotice >= 60 && // Minimum 1 hour
      updates.minimumNotice <= 20160 && // Maximum 2 weeks
      [60, 180, 360, 720, 1440, 2880, 4320, 7200, 10080, 20160].includes(updates.minimumNotice)
    ) {
      validUpdates.minimumNotice = updates.minimumNotice;
    }

    // Process time slot intervals
    if (
      typeof updates.timeSlotInterval === 'number' &&
      updates.timeSlotInterval >= 5 &&
      updates.timeSlotInterval % 5 === 0
    ) {
      // Must be in 5-minute increments
      validUpdates.timeSlotInterval = updates.timeSlotInterval;
    }

    // Process booking window days
    if (
      typeof updates.bookingWindowDays === 'number' &&
      updates.bookingWindowDays >= 7 && // Minimum 1 week
      updates.bookingWindowDays <= 365 // Maximum 1 year
    ) {
      validUpdates.bookingWindowDays = updates.bookingWindowDays;
    }

    // Update settings in the database
    const updatedSettings = await updateSchedulingSettings(userId, validUpdates);

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('Error updating scheduling settings:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update scheduling settings' }), {
      status: 500,
    });
  }
}
