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
import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Routes that can be accessed without authentication
 */
const PUBLIC_ROUTES = [
  // Public pages
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/unauthorized(.*)',
  '/:username', // Public expert profiles (e.g., /barona)
  '/:username/(.*)', // Public routes under usernames (e.g., /barona/event-name)
  '/legal/(.*)', // Legal pages (privacy policy, terms, etc.)
  '/explore',
  '/experts/:path*',
  '/blog/:path*',
  '/contact',

  // Public API endpoints
  '/api/webhook(s)?/.*', // All webhook endpoints for external services
  '/api/keep-alive', // Health check endpoint
];

/**
 * Routes that require admin role
 */
const ADMIN_ROUTES = [
  // Admin pages
  '/admin(.*)',

  // Admin API endpoints
  '/api/admin(.*)',
  '/api/categories(.*)', // To manage categories experts
];

/**
 * Routes that require expert role (includes community_expert, top_expert)
 */
const EXPERT_ROUTES = [
  // Expert pages
  '/booking(.*)',
  '/appointments(.*)',
  '/account/identity(.*)',
  '/account/billing(.*)',

  // Expert API endpoints
  '/api/expert(.*)',
  '/api/appointments(.*)',
  '/api/records(.*)',
  '/api/meetings(.*)',
  '/api/customers(.*)',
  '/api/stripe(.*)', // Expert stripe connect operations
];

/**
 * Special routes that require custom authentication (e.g., API key)
 */
const SPECIAL_AUTH_ROUTES = [
  '/api/cron(.*)', // Cron jobs (requires API key)
];

/**
 * Check if a path matches any pattern in the list
 */
function matchesPattern(path: string, patterns: string[]): boolean {
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
 * Check if a user has any of the required roles
 */
function hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean {
  // Convert everything to lowercase for case-insensitive comparison
  const normalizedUserRoles = userRoles.map((r) => r.toLowerCase());
  const normalizedRequiredRoles = requiredRoles.map((r) => r.toLowerCase());

  return normalizedUserRoles.some((role) => normalizedRequiredRoles.includes(role));
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
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // 5. Check role-based restrictions
  if (userId) {
    // Get user metadata from the auth session
    const authObj = await auth();
    // Safely access the role data with type assertions
    const userMetadata = (authObj.sessionClaims?.metadata as { role?: string | string[] }) || {};
    const userRoleData = userMetadata.role;

    // Convert role data to array format
    const userRoles = Array.isArray(userRoleData)
      ? userRoleData
      : typeof userRoleData === 'string'
        ? [userRoleData]
        : [];

    // Check admin routes
    if (matchesPattern(path, ADMIN_ROUTES)) {
      const isAdmin = hasAnyRole(userRoles, ['admin', 'superadmin']);
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

    // Check expert routes
    if (matchesPattern(path, EXPERT_ROUTES)) {
      const isExpert = hasAnyRole(userRoles, [
        'community_expert',
        'top_expert',
        'admin',
        'superadmin',
      ]);
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
