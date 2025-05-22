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
import { eq } from 'drizzle-orm';

/**
 * Default scheduling settings values
 */
const DEFAULT_SETTINGS: Omit<NewSchedulingSettings, 'userId'> = {
  beforeEventBuffer: 15, // 15 minutes before event
  afterEventBuffer: 15, // 15 minutes after event
  minimumNotice: 60, // 1 hour minimum notice
  timeSlotInterval: 15, // 15 minute intervals for booking slots
};

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
      beforeEventBuffer: 15, // Default 15 min buffer before
      afterEventBuffer: 15, // Default 15 min buffer after
      minimumNotice: 60, // Default 1 hour minimum notice
      timeSlotInterval: 15, // Default 15 min intervals
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
