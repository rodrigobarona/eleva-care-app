import { db } from '@/drizzle/db';
import { RolesTable, UsersTable } from '@/drizzle/schema-workos';
import type { UserRoles } from '@/lib/auth/roles';
import { hasRole, updateUserRole } from '@/lib/auth/roles.server';
import type { ApiResponse, ApiUser, UpdateRoleRequest } from '@/types/api';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { desc, ilike, or, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

const ITEMS_PER_PAGE = 10;

export async function GET(req: Request) {
  try {
    const { user } = await withAuth();

    if (!user) {
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

    // Build query conditions
    // Note: firstName/lastName removed from UsersTable (Phase 5)
    // Search by email only for now. Future: could search WorkOS API for name-based search
    const conditions = search ? ilike(UsersTable.email, `%${search}%`) : undefined;

    // Fetch users from database
    const users = await db
      .select({
        id: UsersTable.id,
        workosUserId: UsersTable.workosUserId,
        email: UsersTable.email,
        username: UsersTable.username,
        createdAt: UsersTable.createdAt,
      })
      .from(UsersTable)
      .where(conditions)
      .limit(ITEMS_PER_PAGE)
      .offset((page - 1) * ITEMS_PER_PAGE)
      .orderBy(desc(UsersTable.createdAt));

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(UsersTable)
      .where(conditions);

    // Fetch roles for each user
    const userIds = users.map((u) => u.workosUserId);
    const roles = await db
      .select({
        workosUserId: RolesTable.workosUserId,
        role: RolesTable.role,
      })
      .from(RolesTable)
      .where(sql`${RolesTable.workosUserId} = ANY(${userIds})`);

    // Map roles to users
    const roleMap = new Map<string, UserRoles[]>();
    for (const role of roles) {
      const existing = roleMap.get(role.workosUserId) || [];
      existing.push(role.role as UserRoles);
      roleMap.set(role.workosUserId, existing);
    }

    const formattedUsers: ApiUser[] = users.map((user) => ({
      id: user.workosUserId,
      email: user.email,
      // Use username or email for display (WorkOS API could be called here for full name if needed)
      name: user.username || user.email,
      role: roleMap.get(user.workosUserId)?.[0] || 'user',
    }));

    return NextResponse.json({
      success: true,
      data: {
        users: formattedUsers,
        total: Number(count),
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
    const { userId: targetUserId, roles } = (await req.json()) as UpdateRoleRequest;
    await updateUserRole(targetUserId, roles);

    // Format roles as readable string for success message
    const rolesStr = Array.isArray(roles) ? roles.join(', ') : roles;

    return NextResponse.json({
      success: true,
      message: `Roles updated successfully to: ${rolesStr}`,
    } as ApiResponse<null>);
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
