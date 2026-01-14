import { db } from '@/drizzle/db';
import { RolesTable, UsersTable } from '@/drizzle/schema';
import { hasRole, updateUserRole } from '@/lib/auth/roles.server';
import type { ApiResponse, ApiUser, UpdateRoleRequest } from '@/types/api';
import { WORKOS_ROLES, type WorkOSRole } from '@/types/workos-rbac';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { desc, ilike, sql } from 'drizzle-orm';
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

    // Verify admin role (only superadmin in WorkOS RBAC)
    const isSuperAdmin = await hasRole(WORKOS_ROLES.SUPERADMIN);
    if (!isSuperAdmin) {
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

    // Map roles to users (single role per user)
    const roleMap = new Map<string, WorkOSRole>();
    for (const role of roles) {
      roleMap.set(role.workosUserId, role.role as WorkOSRole);
    }

    const formattedUsers: ApiUser[] = users.map((user) => ({
      id: user.workosUserId,
      email: user.email,
      // Use username or email for display (WorkOS API could be called here for full name if needed)
      name: user.username || user.email,
      role: roleMap.get(user.workosUserId) || WORKOS_ROLES.PATIENT,
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
    const { userId: targetUserId, role } = (await req.json()) as UpdateRoleRequest;
    await updateUserRole(targetUserId, role);

    return NextResponse.json({
      success: true,
      message: `Role updated successfully to: ${role}`,
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
