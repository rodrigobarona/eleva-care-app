import { getUserRole, hasRole, updateUserRole } from '@/lib/auth/roles.server';
import { WORKOS_ROLES, type WorkOSRole } from '@/types/workos-rbac';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(_request: NextRequest, props: { params: Promise<{ userId: string }> }) {
  try {
    const params = await props.params;
    const { user } = await withAuth();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 },
      );
    }

    const isSuperAdmin = await hasRole(WORKOS_ROLES.SUPERADMIN);

    if (!isSuperAdmin && user.id !== params.userId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    const role = await getUserRole();
    return NextResponse.json({ role });
  } catch (error) {
    console.error('Error fetching user role:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch user role' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ userId: string }> }) {
  try {
    const params = await props.params;
    const body = await request.json();
    const { role } = body as { role: WorkOSRole };

    await updateUserRole(params.userId, role);

    return NextResponse.json({
      success: true,
      message: `Role updated successfully to: ${role}`,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: (error as Error).message },
      { status: 500 },
    );
  }
}
