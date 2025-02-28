import { db } from '@/drizzle/db';
import { UserTable } from '@/drizzle/schema';
import { handleApiError } from '@/lib/api/error';
import { hasRole } from '@/lib/auth/roles';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

// PUT /api/admin/users/[id]/role
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    // Extract params from the promise
    const params = await props.params;

    // Check if user is authenticated and authorized
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and superadmin roles can update user roles
    const isAdmin = await hasRole(userId, 'admin');
    const isSuperAdmin = await hasRole(userId, 'superadmin');
    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user ID from URL
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get target role from request body
    const body = await req.json();
    const { role } = body;

    if (!role || !['user', 'admin', 'superadmin'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role is required (user, admin, or superadmin)' },
        { status: 400 },
      );
    }

    // Prevent users from changing their own role (avoid removing their own admin access)
    if (id === userId) {
      return NextResponse.json({ error: 'You cannot modify your own role' }, { status: 403 });
    }

    // Update the user role in the database
    await db.update(UserTable).set({ role }).where(eq(UserTable.clerkUserId, id));

    // Return success response
    return NextResponse.json({ success: true, role });
  } catch (error) {
    return handleApiError(error);
  }
}
