/**
 * User Preferences Management
 *
 * Manages user preferences in database (replaces Clerk publicMetadata).
 *
 * Benefits over Clerk metadata:
 * - Queryable: Can filter users by preferences
 * - Indexed: Fast queries
 * - Unlimited storage: No 32KB limit
 * - Type-safe: Full TypeScript support
 * - Versioned: Track changes with updatedAt
 */
import { db } from '@/drizzle/db';
import { UserPreferencesTable } from '@/drizzle/schema-workos';
import type { UserPreferences, UserPreferencesUpdate } from '@/types/preferences';
import { DEFAULT_PREFERENCES, mergeWithDefaults } from '@/types/preferences';
import { eq } from 'drizzle-orm';
import { cache } from 'react';

/**
 * Get user preferences from database
 *
 * Returns user's preferences or defaults if not found.
 *
 * @param workosUserId - WorkOS user ID
 * @returns User preferences
 *
 * @example
 * ```ts
 * const prefs = await getUserPreferences('user_01H...');
 * if (prefs.emailNotifications) {
 *   // Send email
 * }
 * ```
 */
export async function getUserPreferences(workosUserId: string): Promise<UserPreferences> {
  try {
    const prefs = await db.query.UserPreferencesTable.findFirst({
      where: eq(UserPreferencesTable.workosUserId, workosUserId),
    });

    if (!prefs) {
      return DEFAULT_PREFERENCES;
    }

    return {
      // Security preferences
      securityAlerts: prefs.securityAlerts,
      newDeviceAlerts: prefs.newDeviceAlerts,
      emailNotifications: prefs.emailNotifications,
      inAppNotifications: prefs.inAppNotifications,
      unusualTimingAlerts: prefs.unusualTimingAlerts,
      locationChangeAlerts: prefs.locationChangeAlerts,

      // UI preferences
      theme: prefs.theme,
      language: prefs.language,
    };
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Cached version of getUserPreferences for request duration
 *
 * Use this in Server Components to avoid redundant database queries
 * within the same request.
 */
export const getCachedUserPreferences = cache(getUserPreferences);

/**
 * Update user preferences
 *
 * Creates preferences record if it doesn't exist (upsert).
 * Only updates provided fields, keeping others unchanged.
 *
 * @param workosUserId - WorkOS user ID
 * @param preferences - Partial preferences to update
 * @param orgId - Optional organization ID
 *
 * @example
 * ```ts
 * // Update just email notifications
 * await updateUserPreferences('user_01H...', {
 *   emailNotifications: false
 * });
 *
 * // Update multiple preferences
 * await updateUserPreferences('user_01H...', {
 *   theme: 'dark',
 *   language: 'es'
 * });
 * ```
 */
export async function updateUserPreferences(
  workosUserId: string,
  preferences: UserPreferencesUpdate,
  orgId?: string | null,
): Promise<UserPreferences> {
  try {
    // Check if preferences exist
    const existing = await db.query.UserPreferencesTable.findFirst({
      where: eq(UserPreferencesTable.workosUserId, workosUserId),
    });

    if (existing) {
      // Update existing preferences
      const [updated] = await db
        .update(UserPreferencesTable)
        .set({
          ...preferences,
          updatedAt: new Date(),
        })
        .where(eq(UserPreferencesTable.workosUserId, workosUserId))
        .returning();

      return {
        securityAlerts: updated.securityAlerts,
        newDeviceAlerts: updated.newDeviceAlerts,
        emailNotifications: updated.emailNotifications,
        inAppNotifications: updated.inAppNotifications,
        unusualTimingAlerts: updated.unusualTimingAlerts,
        locationChangeAlerts: updated.locationChangeAlerts,
        theme: updated.theme,
        language: updated.language,
      };
    } else {
      // Create new preferences with defaults
      const merged = mergeWithDefaults(preferences);

      const [created] = await db
        .insert(UserPreferencesTable)
        .values({
          workosUserId,
          orgId: orgId || null,
          ...merged,
        })
        .returning();

      return {
        securityAlerts: created.securityAlerts,
        newDeviceAlerts: created.newDeviceAlerts,
        emailNotifications: created.emailNotifications,
        inAppNotifications: created.inAppNotifications,
        unusualTimingAlerts: created.unusualTimingAlerts,
        locationChangeAlerts: created.locationChangeAlerts,
        theme: created.theme,
        language: created.language,
      };
    }
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw new Error('Failed to update preferences');
  }
}

/**
 * Initialize preferences for a new user
 *
 * Creates a preferences record with default values.
 * Should be called when a new user is created.
 *
 * @param workosUserId - WorkOS user ID
 * @param orgId - User's organization ID
 * @param initialPreferences - Optional initial preferences (uses defaults if not provided)
 *
 * @example
 * ```ts
 * // In user creation flow
 * await initializeUserPreferences('user_01H...', 'org_123');
 *
 * // With custom initial preferences
 * await initializeUserPreferences('user_01H...', 'org_123', {
 *   language: 'es',
 *   theme: 'dark'
 * });
 * ```
 */
export async function initializeUserPreferences(
  workosUserId: string,
  orgId: string | null,
  initialPreferences?: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const merged = mergeWithDefaults(initialPreferences || {});

  const [created] = await db
    .insert(UserPreferencesTable)
    .values({
      workosUserId,
      orgId,
      ...merged,
    })
    .onConflictDoNothing() // If already exists, do nothing
    .returning();

  if (!created) {
    // Already existed, fetch it
    return getUserPreferences(workosUserId);
  }

  return {
    securityAlerts: created.securityAlerts,
    newDeviceAlerts: created.newDeviceAlerts,
    emailNotifications: created.emailNotifications,
    inAppNotifications: created.inAppNotifications,
    unusualTimingAlerts: created.unusualTimingAlerts,
    locationChangeAlerts: created.locationChangeAlerts,
    theme: created.theme,
    language: created.language,
  };
}

/**
 * Reset preferences to defaults
 *
 * Resets all preferences back to system defaults.
 *
 * @param workosUserId - WorkOS user ID
 *
 * @example
 * ```ts
 * await resetToDefaults('user_01H...');
 * ```
 */
export async function resetToDefaults(workosUserId: string): Promise<UserPreferences> {
  return updateUserPreferences(workosUserId, DEFAULT_PREFERENCES);
}

/**
 * Get default preferences
 *
 * Returns the system default preferences.
 * Useful for showing what will be reset to.
 *
 * @returns Default preferences
 */
export function getDefaultPreferences(): UserPreferences {
  return { ...DEFAULT_PREFERENCES };
}

/**
 * Check if user has email notifications enabled
 *
 * Convenience function for common check.
 *
 * @param workosUserId - WorkOS user ID
 * @returns True if email notifications are enabled
 *
 * @example
 * ```ts
 * if (await hasEmailNotificationsEnabled('user_01H...')) {
 *   await sendEmail(...);
 * }
 * ```
 */
export async function hasEmailNotificationsEnabled(workosUserId: string): Promise<boolean> {
  const prefs = await getUserPreferences(workosUserId);
  return prefs.emailNotifications;
}

/**
 * Check if user has in-app notifications enabled
 *
 * @param workosUserId - WorkOS user ID
 * @returns True if in-app notifications are enabled
 */
export async function hasInAppNotificationsEnabled(workosUserId: string): Promise<boolean> {
  const prefs = await getUserPreferences(workosUserId);
  return prefs.inAppNotifications;
}

/**
 * Get user's theme preference
 *
 * @param workosUserId - WorkOS user ID
 * @returns Theme preference
 */
export async function getUserTheme(workosUserId: string): Promise<'light' | 'dark' | 'system'> {
  const prefs = await getUserPreferences(workosUserId);
  return prefs.theme;
}

/**
 * Get user's language preference
 *
 * @param workosUserId - WorkOS user ID
 * @returns Language code
 */
export async function getUserLanguage(workosUserId: string): Promise<'en' | 'es' | 'pt' | 'br'> {
  const prefs = await getUserPreferences(workosUserId);
  return prefs.language;
}

/**
 * Bulk update preferences for multiple users (Admin only)
 *
 * Useful for applying policy changes across all users.
 *
 * @param updates - Map of userId to preferences
 *
 * @example
 * ```ts
 * await bulkUpdatePreferences({
 *   'user_01H...': { emailNotifications: true },
 *   'user_02H...': { emailNotifications: true }
 * });
 * ```
 */
export async function bulkUpdatePreferences(
  updates: Record<string, UserPreferencesUpdate>,
): Promise<void> {
  // TODO: Add admin permission check

  const promises = Object.entries(updates).map(([userId, prefs]) =>
    updateUserPreferences(userId, prefs),
  );

  await Promise.all(promises);
}
