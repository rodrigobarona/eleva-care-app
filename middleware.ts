/**
 * Role-Based Access Control Middleware
 *
 * This middleware implements a comprehensive authorization strategy:
 * 1. Public routes are explicitly allowed without authentication
 * 2. Authentication is required for all other routes
 * 3. Specific route patterns are restricted to users with appropriate roles
 *
 * This is the first layer of defense in our multi-layered approach.
 * Additional role checks are implemented at layout and page levels.
 *
 * @see /docs/role-based-authorization.md for complete documentation
 */
import { checkRoles } from '@/lib/auth/roles.server';
import {
  ADMIN_ROLES,
  ADMIN_ROUTES,
  EXPERT_ROLES,
  EXPERT_ROUTES,
  PUBLIC_ROUTES,
  SPECIAL_AUTH_ROUTES,
} from '@/lib/constants/roles';
import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Check if a path matches any pattern in the list
 */
function matchesPattern(path: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => {
    // Handle wildcard patterns (e.g., /admin*)
    if (pattern.includes('*')) {
      const basePath = pattern.replace('*', '');
      return path.startsWith(basePath);
    }

    // Handle regex-like patterns (e.g., /api/webhook(s)?/.*)
    if (pattern.includes('(') && pattern.includes(')')) {
      try {
        const regexPattern = pattern
          .replace(/\(/g, '\\(')
          .replace(/\)/g, '\\)')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(path);
      } catch {
        console.error('Invalid regex pattern:', pattern);
        return false;
      }
    }

    // Handle parameter patterns (e.g., /:username)
    if (pattern.startsWith('/:')) {
      const segments = path.split('/').filter(Boolean);
      return segments.length === 1;
    }

    // Exact match
    return path === pattern;
  });
}

/**
 * The main middleware function
 */
export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname;

  // 1. Check for public routes - no auth needed
  if (matchesPattern(path, PUBLIC_ROUTES)) {
    return NextResponse.next();
  }

  // 2. Handle special auth routes (like cron jobs with API keys)
  if (matchesPattern(path, SPECIAL_AUTH_ROUTES)) {
    // For cron jobs, check API key instead of clerk auth
    if (path.startsWith('/api/cron')) {
      const apiKey = req.headers.get('x-api-key');
      if (apiKey !== process.env.CRON_API_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.next();
    }

    // Add other special auth checks here if needed
  }

  // Get auth info - from this point, auth is required
  const { userId } = await auth();

  // 3. If not authenticated, protect the route
  if (!userId) {
    // If this is an API route, return a JSON error
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For page routes, let Clerk handle the redirect to sign-in
    await auth.protect();
  }

  // 4. If user is authenticated but trying to access the root path, redirect to dashboard
  if (userId && path === '/') {
    return NextResponse.redirect(
      new URL(process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || '/dashboard', req.url),
    );
  }

  // 5. Check role-based restrictions
  if (userId) {
    // Get user metadata from the auth session
    const authObj = await auth();
    // Safely access the role data with type assertions
    const userMetadata = (authObj.sessionClaims?.metadata as { role?: string | string[] }) || {};
    const userRoleData = userMetadata.role;

    // Check admin routes using the centralized helper
    if (matchesPattern(path, ADMIN_ROUTES)) {
      const isAdmin = checkRoles(userRoleData, ADMIN_ROLES);
      if (!isAdmin) {
        // For API routes, return JSON error
        if (path.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        // For page routes, redirect to unauthorized
        return NextResponse.redirect(
          new URL(`/${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`, req.url),
        );
      }
    }

    // Check expert routes using the centralized helper
    if (matchesPattern(path, EXPERT_ROUTES)) {
      const isExpert = checkRoles(userRoleData, EXPERT_ROLES);
      if (!isExpert) {
        // For API routes, return JSON error
        if (path.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        // For page routes, redirect to unauthorized
        return NextResponse.redirect(
          new URL(`/${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`, req.url),
        );
      }
    }
  }

  // All checks passed, allow the request
  return NextResponse.next();
});

/**
 * Configure the middleware to run on all routes except static files
 */
export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',
  ],
};
