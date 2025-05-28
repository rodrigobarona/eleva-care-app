/**
 * Scheduling Settings Service
 *
 * This service manages the buffer times, minimum notice periods, and time slot intervals
 * for calendar scheduling. Similar to Cal.com's approach, these settings help control
 * how bookings are made and ensure sufficient time between meetings.
 */
import { db } from '@/drizzle/db';
import { schedulingSettings } from '@/drizzle/schema';
import type { NewSchedulingSettings, SchedulingSettings } from '@/drizzle/schema';
import {
  DEFAULT_AFTER_EVENT_BUFFER,
  DEFAULT_BEFORE_EVENT_BUFFER,
  DEFAULT_BOOKING_WINDOW_DAYS,
  DEFAULT_MINIMUM_NOTICE,
  DEFAULT_SCHEDULING_SETTINGS,
  DEFAULT_TIME_SLOT_INTERVAL,
} from '@/lib/constants/scheduling';
import { eq } from 'drizzle-orm';

/**
 * Default scheduling settings values
 */
const DEFAULT_SETTINGS: Omit<NewSchedulingSettings, 'userId'> = DEFAULT_SCHEDULING_SETTINGS;

/**
 * Get scheduling settings for a user
 *
 * @param userId - Clerk user ID
 * @returns Scheduling settings for the user
 */
export async function getUserSchedulingSettings(userId: string): Promise<SchedulingSettings> {
  try {
    console.log(`Retrieving scheduling settings for user: ${userId}`);

    const settings = await db
      .select()
      .from(schedulingSettings)
      .where(eq(schedulingSettings.userId, userId))
      .limit(1);

    // Return existing settings or create default settings
    if (settings.length > 0) {
      console.log(`Found existing scheduling settings for ${userId}:`, settings[0]);
      return settings[0];
    }

    console.log(`No settings found for ${userId}, creating defaults`);
    return createDefaultSchedulingSettings(userId);
  } catch (error) {
    console.error(`Failed to retrieve scheduling settings for ${userId}:`, error);

    // Return default settings as fallback to prevent booking flow failures
    const fallbackSettings: SchedulingSettings = {
      id: 0,
      userId,
      beforeEventBuffer: DEFAULT_BEFORE_EVENT_BUFFER,
      afterEventBuffer: DEFAULT_AFTER_EVENT_BUFFER,
      minimumNotice: DEFAULT_MINIMUM_NOTICE,
      timeSlotInterval: DEFAULT_TIME_SLOT_INTERVAL,
      bookingWindowDays: DEFAULT_BOOKING_WINDOW_DAYS,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`Using fallback settings for ${userId}:`, fallbackSettings);
    return fallbackSettings;
  }
}

/**
 * Create default scheduling settings for a user
 *
 * @param userId - Clerk user ID
 * @returns Newly created scheduling settings
 */
async function createDefaultSchedulingSettings(userId: string): Promise<SchedulingSettings> {
  const newSettings: NewSchedulingSettings = {
    userId,
    ...DEFAULT_SETTINGS,
  };

  const [createdSettings] = await db.insert(schedulingSettings).values(newSettings).returning();

  return createdSettings;
}

/**
 * Update scheduling settings for a user
 *
 * @param userId - Clerk user ID
 * @param updates - Settings to update
 * @returns Updated scheduling settings
 */
export async function updateSchedulingSettings(
  userId: string,
  updates: Partial<Omit<NewSchedulingSettings, 'userId'>>,
): Promise<SchedulingSettings> {
  // First ensure user has settings
  const settings = await getUserSchedulingSettings(userId);

  // Apply updates
  const [updatedSettings] = await db
    .update(schedulingSettings)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(schedulingSettings.id, settings.id))
    .returning();

  return updatedSettings;
}
