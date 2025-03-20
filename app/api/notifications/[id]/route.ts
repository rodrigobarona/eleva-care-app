import { db } from '@/drizzle/db';
import { NotificationTable } from '@/drizzle/schema';
import { currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';

/**
 * PATCH /api/notifications/[id]
 *
 * Marks a notification as read
 *
 * @param request The request object
 * @param context The route context containing params
 * @returns 200 - Success
 * @returns 400 - Missing notification ID
 * @returns 401 - Unauthorized if no user is authenticated
 * @returns 403 - Forbidden if user doesn't own the notification
 * @returns 404 - Notification not found
 * @returns 500 - Server error
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get notification ID from request
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing notification ID' }, { status: 400 });
    }

    // Get notification and verify ownership
    const notification = await db.query.NotificationTable.findFirst({
      where: eq(NotificationTable.id, id),
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Verify ownership
    if (notification.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update notification
    await db.update(NotificationTable).set({ read: true }).where(eq(NotificationTable.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}
