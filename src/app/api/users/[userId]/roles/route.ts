import type { UserRoles } from '@/lib/auth/roles';
import { getUserRole, hasRole, updateUserRole } from '@/lib/auth/roles.server';
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

    const isAdmin = await hasRole('admin');
    const isSuperAdmin = await hasRole('superadmin');

    if (!isAdmin && !isSuperAdmin && user.id !== params.userId) {
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
    const { roles } = body as { roles: UserRoles };

    await updateUserRole(params.userId, roles);

    // Format roles as readable string for success message
    const rolesStr = Array.isArray(roles) ? roles.join(', ') : roles;

    return NextResponse.json({
      success: true,
      message: `Role(s) updated successfully to: ${rolesStr}`,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: (error as Error).message },
      { status: 500 },
    );
  }
}
