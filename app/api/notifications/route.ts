import { db } from '@/drizzle/db';
import { NotificationTable, UserTable } from '@/drizzle/schema';
import { createUserNotification, getUnreadNotifications } from '@/lib/notifications';
import type { CreateNotificationParams } from '@/lib/notifications';
import { currentUser } from '@clerk/nextjs/server';
import { and, desc, eq, gt, isNull, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';

/**
 * GET /api/notifications
 *
 * Fetches notifications for the current user
 *
 * @query includeRead - Whether to include read notifications (default: false)
 *
 * @returns 200 - Success with notifications array
 * @returns 401 - Unauthorized if no user is authenticated
 * @returns 404 - User not found in database
 * @returns 500 - Server error during fetch
 */
export async function GET(request: Request) {
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

    // Check if we should include read notifications
    const url = new URL(request.url);
    const includeRead = url.searchParams.get('includeRead') === 'true';

    // Get notifications
    let notifications: Array<typeof NotificationTable.$inferSelect> = [];

    if (includeRead) {
      // Get all notifications
      const now = new Date();
      notifications = await db.query.NotificationTable.findMany({
        where: and(
          eq(NotificationTable.userId, dbUser.id),
          or(isNull(NotificationTable.expiresAt), gt(NotificationTable.expiresAt, now)),
        ),
        orderBy: [desc(NotificationTable.createdAt)],
      });
    } else {
      // Get only unread notifications
      notifications = await getUnreadNotifications(dbUser.id);
    }

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

/**
 * POST /api/notifications
 *
 * Creates a new notification for a user
 *
 * @body {
 *   userId: string;
 *   type: NotificationType;
 *   title: string;
 *   message: string;
 *   actionUrl?: string;
 *   expiresAt?: Date;
 * }
 *
 * @returns 201 - Success with notification ID
 * @returns 400 - Bad request if missing required fields
 * @returns 401 - Unauthorized if no user is authenticated or not an admin
 * @returns 500 - Server error during creation
 */
export async function POST(request: Request) {
  try {
    // Get the current user (must be admin to create notifications for others)
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database to check role
    const dbUser = await db.query.UserTable.findFirst({
      where: eq(UserTable.clerkUserId, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // For security, only allow self-notifications or system admins (checking public_metadata)
    const isAdmin = user.publicMetadata?.role === 'admin';

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.userId || !body.type || !body.title || !body.message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // If not admin, can only create notifications for self
    if (!isAdmin && body.userId !== dbUser.id) {
      return NextResponse.json(
        { error: 'Unauthorized to create notifications for other users' },
        { status: 403 },
      );
    }

    // Create notification params
    const notificationParams: CreateNotificationParams = {
      userId: body.userId,
      type: body.type,
      title: body.title,
      message: body.message,
      actionUrl: body.actionUrl,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    };

    // Create notification
    const notificationId = await createUserNotification(notificationParams);

    return NextResponse.json({ id: notificationId }, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}
