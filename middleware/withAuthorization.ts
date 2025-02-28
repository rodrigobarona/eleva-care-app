import { hasPermission, hasRole, type UserRole } from '@/lib/auth/roles';
import { auth } from '@clerk/nextjs/server';
import { type NextRequest, NextResponse } from 'next/server';

export function withRoleAuthorization(roles: UserRole[]) {
  return async function middleware(req: NextRequest) {
    const authData = await auth();
    const userId = authData.userId;

    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    // Check if user has any of the required roles
    const hasRequiredRole = await Promise.any(
      roles.map(async (role) => await hasRole(userId, role)),
    ).catch(() => false);

    if (!hasRequiredRole) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    return NextResponse.next();
  };
}

export function withPermissionAuthorization(permissions: string[]) {
  return async function middleware(req: NextRequest) {
    const authData = await auth();
    const userId = authData.userId;

    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    // Check if user has any of the required permissions
    const hasRequiredPermission = await Promise.any(
      permissions.map(async (permission) => await hasPermission(userId, permission)),
    ).catch(() => false);

    if (!hasRequiredPermission) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    return NextResponse.next();
  };
}
