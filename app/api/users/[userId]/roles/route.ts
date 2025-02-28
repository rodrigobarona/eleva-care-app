import { assignRole, getUserRoles, hasRole, removeRole, type UserRole } from '@/lib/auth/roles';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(_request: NextRequest, props: { params: Promise<{ userId: string }> }) {
  try {
    const params = await props.params;
    const { userId: currentUserId } = await auth();

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 },
      );
    }

    // Check if user has admin privileges
    const isAdmin = await hasRole(currentUserId, 'admin');
    const isSuperAdmin = await hasRole(currentUserId, 'superadmin');

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
  try {
    const params = await props.params;
    const { userId: currentUserId } = await auth();

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 },
      );
    }

    // Check if user has admin privileges
    const isAdmin = await hasRole(currentUserId, 'admin');
    const isSuperAdmin = await hasRole(currentUserId, 'superadmin');

    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions to assign roles' },
        { status: 403 },
      );
    }

    // Only superadmins can assign the superadmin role
    const body = await request.json();
    const { role } = body as { role: UserRole };

    if (role === 'superadmin' && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only superadmins can assign the superadmin role' },
        { status: 403 },
      );
    }

    await assignRole(params.userId, role, currentUserId);

    return NextResponse.json({
      success: true,
      message: `Role '${role}' assigned successfully`,
    });
  } catch (error) {
    console.error('Error assigning user role:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to assign user role' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ userId: string }> }) {
  try {
    const params = await props.params;
    const { userId: currentUserId } = await auth();

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 },
      );
    }

    // Check if user has admin privileges
    const isAdmin = await hasRole(currentUserId, 'admin');
    const isSuperAdmin = await hasRole(currentUserId, 'superadmin');

    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions to remove roles' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { role } = body as { role: UserRole };

    // Only superadmins can remove the superadmin role
    if (role === 'superadmin' && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only superadmins can remove the superadmin role' },
        { status: 403 },
      );
    }

    // Get current roles to check if it's the last one
    const currentRoles = await getUserRoles(params.userId);
    if (currentRoles.length <= 1) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Users must have at least one role' },
        { status: 400 },
      );
    }

    await removeRole(params.userId, role);

    return NextResponse.json({
      success: true,
      message: `Role '${role}' removed successfully`,
    });
  } catch (error) {
    console.error('Error removing user role:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to remove user role' },
      { status: 500 },
    );
  }
}
