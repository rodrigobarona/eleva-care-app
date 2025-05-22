/**
 * API Routes for Scheduling Settings
 *
 * Provides endpoints for:
 * - Getting user's scheduling settings
 * - Updating scheduling settings
 */
import { getUserSchedulingSettings, updateSchedulingSettings } from '@/server/schedulingSettings';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * GET handler for fetching scheduling settings
 *
 * @returns Current scheduling settings for the authenticated user
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
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
    const { userId } = await auth();

    if (!userId) {
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
    if (typeof updates.minimumNotice === 'number' && updates.minimumNotice >= 0) {
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
