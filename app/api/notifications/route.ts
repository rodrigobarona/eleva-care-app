import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { createUserNotification } from '@/lib/notifications';
import type { CreateNotificationParams } from '@/lib/notifications';
import { currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Add route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'auto';

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

    // Trigger notification via Novu
    const success = await createUserNotification(notificationParams);

    if (success) {
      return NextResponse.json(
        { success: true, message: 'Notification triggered successfully via Novu.' },
        { status: 202 }, // 202 Accepted: The request has been accepted for processing, but the processing has not been completed.
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to trigger notification via Novu.' },
        { status: 500 }, // Internal Server Error
      );
    }
  } catch (error) {
    console.error('Error in POST /api/notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json(
      { success: false, error: `Failed to process notification request: ${errorMessage}` },
      { status: 500 },
    );
  }
}
