/**
 * Security and Privacy Preferences for WorkOS Users
 *
 * Replaces Clerk security utils with database-backed approach
 */
import { db } from '@/drizzle/db';
import { UserPreferencesTable } from '@/drizzle/schema-workos';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { eq } from 'drizzle-orm';

export interface UserSecurityPreferences {
  // Email preferences
  emailNotifications: boolean;
  marketingEmails: boolean;

  // Two-factor authentication
  twoFactorEnabled: boolean;

  // Login tracking
  trackLogins: boolean;
  notifyNewLogin: boolean;
  notifyNewDevice: boolean;

  // Location tracking
  trackLocation: boolean;

  // Session management
  autoLogout: boolean;
  autoLogoutMinutes: number;

  // Data privacy
  shareDataWithThirdParties: boolean;
  allowAnalytics: boolean;
}

const DEFAULT_PREFERENCES: UserSecurityPreferences = {
  emailNotifications: true,
  marketingEmails: false,
  twoFactorEnabled: false,
  trackLogins: true,
  notifyNewLogin: true,
  notifyNewDevice: true,
  trackLocation: false,
  autoLogout: false,
  autoLogoutMinutes: 30,
  shareDataWithThirdParties: false,
  allowAnalytics: true,
};

/**
 * Get user security preferences from database
 */
export async function getUserSecurityPreferences(): Promise<UserSecurityPreferences> {
  const { user } = await withAuth();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const prefs = await db.query.UserPreferencesTable.findFirst({
    where: eq(UserPreferencesTable.workosUserId, user.id),
  });

  if (!prefs || !prefs.securityPreferences) {
    return DEFAULT_PREFERENCES;
  }

  return {
    ...DEFAULT_PREFERENCES,
    ...(prefs.securityPreferences as Partial<UserSecurityPreferences>),
  };
}

/**
 * Update user security preferences in database
 */
export async function updateUserSecurityPreferences(
  preferences: Partial<UserSecurityPreferences>,
): Promise<UserSecurityPreferences> {
  const { user } = await withAuth();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get current preferences
  const current = await getUserSecurityPreferences();
  const updated = { ...current, ...preferences };

  // Update or insert preferences
  const existing = await db.query.UserPreferencesTable.findFirst({
    where: eq(UserPreferencesTable.workosUserId, user.id),
  });

  if (existing) {
    await db
      .update(UserPreferencesTable)
      .set({
        securityPreferences: updated as any,
        updatedAt: new Date(),
      })
      .where(eq(UserPreferencesTable.workosUserId, user.id));
  } else {
    await db.insert(UserPreferencesTable).values({
      workosUserId: user.id,
      securityPreferences: updated as any,
    });
  }

  return updated;
}
