import { db } from '@/drizzle/db';
import { NotificationTable } from '@/drizzle/schema';
import { currentUser } from '@clerk/nextjs/server';
import { eq, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';

/**
 * POST /api/notifications/mark-all-read
 *
 * Marks multiple notifications as read in a single operation
 *
 * @body { ids: string[] } - Array of notification IDs to mark as read
 * @returns 200 - Success
 * @returns 400 - Invalid request body
 * @returns 401 - Unauthorized
 * @returns 500 - Server error
 */
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    let body: { ids: string[] };
    try {
      body = await request.json();
      if (!Array.isArray(body.ids) || body.ids.length === 0) {
        return NextResponse.json(
          { error: 'Invalid request body', details: 'ids must be a non-empty array' },
          { status: 400 },
        );
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Request body must be valid JSON' },
        { status: 400 },
      );
    }

    // Update all notifications in a single query
    await db
      .update(NotificationTable)
      .set({ read: true })
      .where(inArray(NotificationTable.id, body.ids) && eq(NotificationTable.userId, user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
  }
}
