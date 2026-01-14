import type { ApiResponse } from '@/types/api';
import { WORKOS_ROLES } from '@/types/workos-rbac';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';

import { hasRole } from './roles.server';

/**
 * Middleware to protect admin routes
 * Returns a NextResponse with 401/403 if not authenticated or not an admin
 * Returns null if authenticated and admin, allowing the route to proceed
 */
export async function adminAuthMiddleware(): Promise<NextResponse | null> {
  try {
    // Check if user is authenticated
    const { user } = await withAuth();
    const userId = user?.id;
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        } as ApiResponse<null>,
        { status: 401 },
      );
    }

    // Check if user has admin role (only superadmin is admin in WorkOS RBAC)
    const isSuperAdmin = await hasRole(WORKOS_ROLES.SUPERADMIN);

    if (!isSuperAdmin) {
      console.warn(`Non-admin user ${userId} attempted to access admin route`);
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden. Admin access required.',
        } as ApiResponse<null>,
        { status: 403 },
      );
    }

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
