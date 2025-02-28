import { db } from '@/drizzle/db';
import { UserRoleTable } from '@/drizzle/schema';
import { getUserRoles, hasRole } from '@/lib/auth/roles';
import { checkHasRole } from '@/lib/auth/server-auth';
import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  try {
    const { userId: currentUserId } = await auth();

    // request is not a NextRequest object, it's a Request object
    console.log('request', request);

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 },
      );
    }

    // Check if user has admin privileges
    const isAdmin = await hasRole([currentUserId], 'admin');
    const isSuperAdmin = await hasRole([currentUserId], 'superadmin');

    if (!isAdmin && !isSuperAdmin && currentUserId !== params.userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions to view user roles' },
        { status: 403 },
      );
    }

    const roles = await getUserRoles(params.userId);

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch user roles' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  try {
    // Verify the requester has admin or superadmin role
    const authorized = await checkHasRole(['superadmin', 'admin']);

    if (!authorized) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    const { userId } = params;
    const { userId: currentUserId } = await auth();

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 },
      );
    }

    // Get the role from the request body
    const { role } = await request.json();

    if (!role) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Role is required' },
        { status: 400 },
      );
    }

    // Check if the role is valid
    const validRoles = ['superadmin', 'admin', 'top_expert', 'community_expert', 'user'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Bad Request', message: 'Invalid role' }, { status: 400 });
    }

    // Only superadmins can assign the superadmin role
    if (role === 'superadmin') {
      const isSuperAdmin = await checkHasRole(['superadmin']);
      if (!isSuperAdmin) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Only superadmins can assign the superadmin role' },
          { status: 403 },
        );
      }
    }

    // Check if the user already has this role
    const existingRole = await db.query.UserRoleTable.findFirst({
      where: and(eq(UserRoleTable.clerkUserId, userId), eq(UserRoleTable.role, role)),
    });

    if (existingRole) {
      return NextResponse.json(
        { error: 'Conflict', message: 'User already has this role' },
        { status: 409 },
      );
    }

    // Add the role
    await db.insert(UserRoleTable).values({
      clerkUserId: userId,
      role,
      assignedBy: currentUserId,
    });

    return NextResponse.json({ message: 'Role added successfully' });
  } catch (error) {
    console.error('Error adding role:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to add role' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  try {
    // Verify the requester has admin or superadmin role
    const authorized = await checkHasRole(['superadmin', 'admin']);

    if (!authorized) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    const { userId } = params;

    // Get the role from the request body
    const { role } = await request.json();

    if (!role) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Role is required' },
        { status: 400 },
      );
    }

    // Check if the role is valid
    const validRoles = ['superadmin', 'admin', 'top_expert', 'community_expert', 'user'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Bad Request', message: 'Invalid role' }, { status: 400 });
    }

    // Only superadmins can remove the superadmin role
    if (role === 'superadmin') {
      const isSuperAdmin = await checkHasRole(['superadmin']);
      if (!isSuperAdmin) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Only superadmins can remove the superadmin role' },
          { status: 403 },
        );
      }
    }

    // Check if the user has this role
    const existingRole = await db.query.UserRoleTable.findFirst({
      where: and(eq(UserRoleTable.clerkUserId, userId), eq(UserRoleTable.role, role)),
    });

    if (!existingRole) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User does not have this role' },
        { status: 404 },
      );
    }

    // Make sure we're not removing the last role
    const userRoles = await db.query.UserRoleTable.findMany({
      where: eq(UserRoleTable.clerkUserId, userId),
    });

    if (userRoles.length <= 1) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Cannot remove the last role from a user' },
        { status: 400 },
      );
    }

    // Remove the role
    await db
      .delete(UserRoleTable)
      .where(and(eq(UserRoleTable.clerkUserId, userId), eq(UserRoleTable.role, role)));

    return NextResponse.json({ message: 'Role removed successfully' });
  } catch (error) {
    console.error('Error removing role:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to remove role' },
      { status: 500 },
    );
  }
}
