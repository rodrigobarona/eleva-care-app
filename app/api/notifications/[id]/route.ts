import { db } from '@/drizzle/db';
import { NotificationTable, UserTable } from '@/drizzle/schema';
import { markNotificationAsRead } from '@/lib/notifications';
import { currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';

/**
 * PATCH /api/notifications/:id
 *
 * Marks a notification as read
 *
 * @returns 200 - Success
 * @returns 401 - Unauthorized if no user is authenticated
 * @returns 404 - User or notification not found
 * @returns 500 - Server error
 */
export async function PATCH(
  request: Request, 
  props: { params: Promise<{ id: string }> }
) {
  try {
    // Get the current user
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const dbUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get notification ID from request
    const params = await props.params;
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Missing notification ID' }, { status: 400 });
    }

    // Verify notification belongs to user
    const notification = await db.query.NotificationTable.findFirst({
      where: eq(NotificationTable.id, id),
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (notification.userId !== dbUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark as read
    await markNotificationAsRead(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
