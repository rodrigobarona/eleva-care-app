import type { ApiResponse } from '@/types/api';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { ADMIN_ROLES } from '../constants/roles';
import type { UserRoles } from './roles';

/**
 * Middleware to protect admin routes
 * Returns a NextResponse with 401/403 if not authenticated or not an admin
 * Returns null if authenticated and admin, allowing the route to proceed
 */
export async function adminAuthMiddleware(): Promise<NextResponse | null> {
  try {
    // Check if user is authenticated
    const { userId } = await auth();

    console.log('Admin middleware - userId:', userId);

    if (!userId) {
      console.warn('Admin middleware - No userId found');
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        } as ApiResponse<null>,
        { status: 401 },
      );
    }

    // Get user directly from Clerk to check roles
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const userRoles = user.publicMetadata.role as UserRoles;

    console.log('Admin middleware - User roles:', JSON.stringify(userRoles));

    // Check if user has admin role
    let isUserAdmin = false;

    if (Array.isArray(userRoles)) {
      isUserAdmin = userRoles.some((role) =>
        ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]),
      );
    } else if (typeof userRoles === 'string') {
      isUserAdmin = ADMIN_ROLES.includes(userRoles as (typeof ADMIN_ROLES)[number]);
    }

    if (!isUserAdmin) {
      console.warn(`Non-admin user ${userId} attempted to access admin route`);
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden. Admin access required.',
        } as ApiResponse<null>,
        { status: 403 },
      );
    }

    console.log('Admin middleware - Access granted for admin user:', userId);
    // Allow the request to proceed
    return null;
  } catch (error) {
    console.error('Admin authentication error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication failed',
      } as ApiResponse<null>,
      { status: 401 },
    );
  }
}
