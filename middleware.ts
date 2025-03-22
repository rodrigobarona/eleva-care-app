/**
 * Role-Based Access Control Middleware
 *
 * This middleware implements a comprehensive authorization strategy:
 * 1. Public routes are explicitly allowed without authentication
 * 2. Authentication is required for all other routes
 * 3. Specific route patterns are restricted to users with appropriate roles
 * 4. Webhook routes completely bypass authentication
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
  // Enable verbose debugging for username/eventSlug paths
  const isEventPath = path.split('/').filter(Boolean).length >= 2 && !path.startsWith('/api/');

  if (isEventPath) {
    console.log(`Checking pattern match for event path: ${path}`);
  }

  return patterns.some((pattern) => {
    // For event paths, log each pattern being checked
    if (isEventPath) {
      console.log(`  Testing pattern: ${pattern}`);
    }

    // Handle wildcard patterns (e.g., /admin*)
    if (pattern.includes('*')) {
      const basePath = pattern.replace('*', '');
      const matches = path.startsWith(basePath);
      if (isEventPath && matches) {
        console.log(`  ✓ Matched wildcard pattern: ${pattern}`);
      }
      return matches;
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
        const matches = regex.test(path);
        if (isEventPath && matches) {
          console.log(`  ✓ Matched regex pattern: ${pattern}`);
        }
        return matches;
      } catch {
        console.error('Invalid regex pattern:', pattern);
        return false;
      }
    }

    // Handle parameter patterns with wildcards (e.g., /:username/(.*))
    if (pattern.startsWith('/:') && pattern.includes('(.*)')) {
      // Pattern like '/:username/(.*)' should match paths like '/johndoe/event-slug'
      // This specifically handles two-segment paths where first segment is a username and second is any content

      // Get the path segments and ensure we have at least one segment
      const pathSegments = path.split('/').filter(Boolean);

      if (pathSegments.length === 0) return false;

      // For user profile pages with subpages (e.g., /username/event-slug, /username/event-slug/checkout)
      // This covers all routes under /[username]/, including:
      // - /[username]/[eventSlug]
      // - /[username]/[eventSlug]/checkout
      // - /[username]/[eventSlug]/payment-processing
      // - /[username]/[eventSlug]/success

      if (isEventPath) {
        console.log(`  ✓ Matched username wildcard pattern: ${pattern} for path: ${path}`);
        console.log(`    Path segments: ${pathSegments.join(', ')}`);
      }

      return true; // If we get here, it's a match
    }

    // Handle simple parameter patterns (e.g., /:username)
    if (pattern.startsWith('/:')) {
      const segments = path.split('/').filter(Boolean);
      const matches = segments.length === 1;

      if (isEventPath && matches) {
        console.log(`  ✓ Matched simple parameter pattern: ${pattern}`);
      }

      return matches;
    }

    // Exact match
    const exactMatch = path === pattern;
    if (isEventPath && exactMatch) {
      console.log(`  ✓ Exact match for pattern: ${pattern}`);
    }
    return exactMatch;
  });
}

export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname;

  // Skip middleware processing completely for webhook routes
  if (path.startsWith('/api/webhooks/')) {
    console.log(`Bypassing middleware for webhook path: ${path}`);
    return NextResponse.next();
  }

  // Special case for QStash requests to cron endpoints
  if (path.startsWith('/api/cron/')) {
    // Check for QStash request header first
    const isQStashRequest = req.headers.get('x-qstash-request') === 'true';
    if (isQStashRequest) {
      console.log(`Bypassing middleware for QStash cron job: ${path}`);
      return NextResponse.next();
    }

    // If not a QStash request, continue with API key check
    const apiKey = req.headers.get('x-api-key');
    if (apiKey === process.env.CRON_API_KEY) {
      return NextResponse.next();
    }

    // Neither QStash header nor valid API key - unauthorized
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Check for public routes - no auth needed
  if (matchesPattern(path, PUBLIC_ROUTES)) {
    console.log(`Public route access allowed: ${path}`);
    return NextResponse.next();
  }

  console.log(`Non-public route: ${path} - checking authentication`);

  // 2. Handle special auth routes (like cron jobs with API keys)
  if (matchesPattern(path, SPECIAL_AUTH_ROUTES)) {
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
    console.log(`Redirecting to sign-in: User not authenticated for protected route: ${path}`);
    await auth.protect();
    return NextResponse.next();
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
          new URL(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`, req.url),
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
          new URL(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`, req.url),
        );
      }
    }
  }

  // All checks passed, allow the request
  return NextResponse.next();
});

/**
 * Configure which paths the middleware runs on
 * This matches everything except static files and img directory
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|img|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webm)).*)',
  ],
};
