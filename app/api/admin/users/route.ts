import type { UserRole } from '@/lib/auth/roles';
import { hasRole, updateUserRole } from '@/lib/auth/roles.server';
import type { ApiResponse, ApiUser, UpdateRoleRequest } from '@/types/api';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const ITEMS_PER_PAGE = 10;

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        } as ApiResponse<null>,
        { status: 401 },
      );
    }

    // Verify admin role
    const isAdmin = await hasRole('admin');
    const isSuperAdmin = await hasRole('superadmin');
    if (!isAdmin && !isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
        } as ApiResponse<null>,
        { status: 403 },
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const page = Number.parseInt(url.searchParams.get('page') || '1');
    const search = url.searchParams.get('search') || '';

    // Fetch users
    const clerk = await clerkClient();
    const users = await clerk.users.getUserList({
      query: search,
      limit: ITEMS_PER_PAGE,
      offset: (page - 1) * ITEMS_PER_PAGE,
    });

    // Get total count for pagination
    const totalUsers = await clerk.users.getCount();

    const formattedUsers: ApiUser[] = users.data.map((user) => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      name: user.firstName || '',
      role: (user.publicMetadata.role as UserRole) || 'user',
    }));

    return NextResponse.json({
      success: true,
      data: {
        users: formattedUsers,
        total: totalUsers,
      },
    } as ApiResponse<{ users: ApiUser[]; total: number }>);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId: targetUserId, role } = (await req.json()) as UpdateRoleRequest;
    await updateUserRole(targetUserId, role);
    return NextResponse.json({ success: true } as ApiResponse<null>);
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
