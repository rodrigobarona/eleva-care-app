import { db } from '@/drizzle/db';
import { UsersTable } from '@/drizzle/schema-workos';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'es' | 'pt' | 'br';
}

/**
 * GET /api/user/security-preferences
 * Get the current user's preferences (theme, language, security alerts)
 *
 * NOTE: Preferences are now stored directly in the users table.
 * Notification preferences are managed by Novu Inbox widget.
 */
export async function GET() {
  try {
    const { user } = await withAuth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, user.id),
      columns: {
        theme: true,
        language: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const preferences: UserPreferences = {
      theme: dbUser.theme,
      language: dbUser.language,
    };

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/user/security-preferences
 * Update the current user's UI preferences (theme, language)
 *
 * NOTE: Notification/security preferences are managed by WorkOS AuthKit and Novu
 */
export async function PUT(req: NextRequest) {
  try {
    const { user } = await withAuth();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const preferences: Partial<UserPreferences> = body.preferences;

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({ error: 'Invalid preferences data' }, { status: 400 });
    }

    // Validate preference values
    const validKeys = ['theme', 'language'];

    const invalidKeys = Object.keys(preferences).filter((key) => !validKeys.includes(key));
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid preference keys: ${invalidKeys.join(', ')}. Valid keys: ${validKeys.join(', ')}`,
        },
        { status: 400 },
      );
    }

    // Validate types
    if (preferences.theme && !['light', 'dark', 'system'].includes(preferences.theme)) {
      return NextResponse.json(
        { error: "Invalid theme value. Must be 'light', 'dark', or 'system'" },
        { status: 400 },
      );
    }

    if (preferences.language && !['en', 'es', 'pt', 'br'].includes(preferences.language)) {
      return NextResponse.json(
        { error: "Invalid language value. Must be 'en', 'es', 'pt', or 'br'" },
        { status: 400 },
      );
    }

    // Update preferences directly in UsersTable
    const updateData: Partial<{
      theme: 'light' | 'dark' | 'system';
      language: 'en' | 'es' | 'pt' | 'br';
      updatedAt: Date;
    }> = {
      ...preferences,
      updatedAt: new Date(),
    };

    await db.update(UsersTable).set(updateData).where(eq(UsersTable.workosUserId, user.id));

    // Fetch updated preferences
    const dbUser = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.workosUserId, user.id),
      columns: {
        theme: true,
        language: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: dbUser
        ? {
            theme: dbUser.theme,
            language: dbUser.language,
          }
        : preferences,
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
