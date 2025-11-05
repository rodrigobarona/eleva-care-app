import {
  getUserSecurityPreferences,
  updateUserSecurityPreferences,
  type UserSecurityPreferences,
} from '@/lib/integrations/clerk/security-utils';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/user/security-preferences
 * Get the current user's security notification preferences
 */
export async function GET() {
  try {
    const { user } = await withAuth();
  const userId = user?.id;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await getUserSecurityPreferences(userId);

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error('Error fetching security preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/user/security-preferences
 * Update the current user's security notification preferences
 */
export async function PUT(req: NextRequest) {
  try {
    const { user } = await withAuth();
  const userId = user?.id;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const preferences: Partial<UserSecurityPreferences> = body.preferences;

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({ error: 'Invalid preferences data' }, { status: 400 });
    }

    // Validate preference values
    const validKeys = [
      'securityAlerts',
      'newDeviceAlerts',
      'locationChangeAlerts',
      'unusualTimingAlerts',
      'emailNotifications',
      'inAppNotifications',
    ];

    const invalidKeys = Object.keys(preferences).filter((key) => !validKeys.includes(key));
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: `Invalid preference keys: ${invalidKeys.join(', ')}` },
        { status: 400 },
      );
    }

    // Ensure all values are booleans
    for (const [key, value] of Object.entries(preferences)) {
      if (typeof value !== 'boolean') {
        return NextResponse.json(
          { error: `Preference '${key}' must be a boolean` },
          { status: 400 },
        );
      }
    }

    await updateUserSecurityPreferences(userId, preferences);

    const updatedPreferences = await getUserSecurityPreferences(userId);

    return NextResponse.json({
      success: true,
      message: 'Security preferences updated successfully',
      preferences: updatedPreferences,
    });
  } catch (error) {
    console.error('Error updating security preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
