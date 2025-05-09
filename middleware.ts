/**
 * Role-Based Access Control and Internationalization Middleware
 *
 * This middleware implements a comprehensive authorization strategy with i18n support:
 * 1. Public routes are explicitly allowed without authentication
 * 2. Authentication is required for all other routes
 * 3. Specific route patterns are restricted to users with appropriate roles
 * 4. Webhook routes completely bypass authentication
 * 5. Internationalization is applied to public and authenticated routes (but not private routes)
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
import { defaultLocale, locales } from '@/lib/i18n';
import { clerkMiddleware } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Create internationalization middleware with our configuration
 */
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  // Enable automatic locale detection
  localeDetection: true,
  // Configure the cookie for persistent locale preference
  localeCookie: {
    // One year in seconds for persistent preference across visits
    maxAge: 31536000,
    // Name can be customized if needed
    name: 'ELEVA_LOCALE',
  },
});

/**
 * Simple and reliable path matcher
 * @param path - The current path to check
 * @param pattern - The pattern to match against
 * @returns boolean indicating if the path matches the pattern
 */
function isPathMatch(path: string, pattern: string): boolean {
  // Handle exact matches
  if (pattern === path) return true;

  // Handle wildcard patterns (e.g., /admin*)
  if (pattern.endsWith('*')) {
    const basePath = pattern.slice(0, -1);
    return path.startsWith(basePath);
  }

  // Handle username patterns specifically
  if (pattern === '/:username') {
    const segments = path.split('/').filter(Boolean);
    return segments.length === 1;
  }

  // Handle username with subpaths pattern
  if (pattern === '/:username/(.*)') {
    const segments = path.split('/').filter(Boolean);
    return segments.length >= 2;
  }

  // Handle regex-like patterns
  if (pattern.includes('(') && pattern.includes(')')) {
    try {
      const regexPattern = pattern
        .replace(/\//g, '\\/') // Escape forward slashes
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

  return false;
}

/**
 * Check if a path matches any patterns in the array
 * @param path - The current path to check
 * @param patterns - Array of patterns to match against
 * @returns boolean indicating if the path matches any pattern
 */
function matchPatternsArray(path: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => isPathMatch(path, pattern));
}

/**
 * Check if a user is an expert with incomplete setup
 * @param authObject - The Clerk auth object
 * @returns Promise<boolean> indicating if the user is an expert with incomplete setup
 */
// @ts-expect-error - We need to access Clerk auth object properties
async function isExpertWithIncompleteSetup(authObject): Promise<boolean> {
  const userRoleData = authObject?.sessionClaims?.metadata?.role;
  if (!userRoleData) return false;

  // Check if user has an expert role
  const isExpert = checkRoles(userRoleData, EXPERT_ROLES);
  if (!isExpert) return false;

  // Get expert setup data from unsafeMetadata
  const expertSetup = authObject?.sessionClaims?.unsafeMetadata?.expertSetup;
  if (!expertSetup) return true; // If no setup data, consider setup incomplete

  // Required setup steps that must be present for a complete setup
  const requiredSetupSteps = [
    'events',
    'payment',
    'profile',
    'identity',
    'availability',
    'google_account',
  ];

  // Check if all required steps are present AND true
  const setupComplete = requiredSetupSteps.every((step) => expertSetup[step] === true);

  // Return true if setup is incomplete (any required step is missing or false)
  return !setupComplete;
}

/**
 * Define routes that should not use i18n (private routes)
 */
function isPrivateRoute(request: NextRequest): boolean {
  const path = request.nextUrl.pathname;

  return (
    path.startsWith('/dashboard') ||
    path.startsWith('/setup') ||
    path.startsWith('/account') ||
    path.startsWith('/appointments') ||
    path.startsWith('/booking') ||
    path.startsWith('/admin')
  );
}

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const path = req.nextUrl.pathname;

  // Skip middleware for public files, Next.js internals, and webhook routes
  if (
    /\.(.*)$/.test(path) ||
    path.startsWith('/_next') ||
    path.startsWith('/api/webhooks/') ||
    path.startsWith('/api/cron/') ||
    path.startsWith('/api/qstash/') ||
    path.startsWith('/api/internal/') ||
    path.startsWith('/api/healthcheck/') ||
    path.startsWith('/api/create-payment-intent')
  ) {
    return NextResponse.next();
  }

  // Fast path for username routes (critical fix)
  const segments = path.split('/').filter(Boolean);
  if (segments.length >= 2 && !path.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Handle special cases for webhooks
  if (path.startsWith('/api/webhooks/')) {
    return NextResponse.next();
  }

  // Check if the path is in SPECIAL_AUTH_ROUTES (including cron jobs)
  if (matchPatternsArray(path, SPECIAL_AUTH_ROUTES)) {
    // For cron jobs, apply both enhanced checks and fallback
    if (path.startsWith('/api/cron/')) {
      // More flexible detection of QStash requests
      const isQStashRequest =
        req.headers.get('x-qstash-request') === 'true' ||
        req.headers.has('upstash-signature') ||
        req.headers.has('x-upstash-signature') ||
        req.headers.has('x-signature') ||
        req.url.includes('signature=');

      const apiKey = req.headers.get('x-api-key');
      const userAgent = req.headers.get('user-agent') || '';

      // Accept requests from UpStash User-Agent too
      const isUpstashUserAgent =
        userAgent.toLowerCase().includes('upstash') || userAgent.toLowerCase().includes('qstash');

      // FALLBACK: If this is a production environment and UpStash is struggling to connect
      // Make cron endpoints accessible without auth in production (FALLBACK MECHANISM)
      const isProduction = process.env.NODE_ENV === 'production';
      const isDeploymentFallbackEnabled = process.env.ENABLE_CRON_FALLBACK === 'true';

      if (
        isQStashRequest ||
        isUpstashUserAgent ||
        apiKey === process.env.CRON_API_KEY ||
        (isProduction && isDeploymentFallbackEnabled)
      ) {
        return NextResponse.next();
      }

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Other special auth routes might have different logic
    return NextResponse.next();
  }

  // Check public routes
  if (matchPatternsArray(path, PUBLIC_ROUTES)) {
    // For public routes, check if user is authenticated and trying to access auth pages
    const { userId } = await auth();
    const isAuthenticated = !!userId;

    // If authenticated user tries to access sign-in/sign-up, redirect to dashboard
    if (isAuthenticated && (path.startsWith('/sign-in') || path.startsWith('/sign-up'))) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Apply i18n middleware for public routes
    return intlMiddleware(req);
  }

  // Beyond this point, authentication is required
  const { userId } = await auth();

  if (!userId) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await auth.protect();
    return NextResponse.next();
  }

  // Expert setup redirect - check if it's an expert with incomplete setup
  // Only apply this logic for root path or dashboard (where users land after login)
  if (userId && (path === '/' || path === '/dashboard')) {
    const authObj = await auth();
    const needsSetup = await isExpertWithIncompleteSetup(authObj);

    if (needsSetup) {
      return NextResponse.redirect(new URL('/setup', req.url));
    }

    // Redirect from root to dashboard for normal users
    if (path === '/') {
      return NextResponse.redirect(
        new URL(
          process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || '/dashboard',
          req.url,
        ),
      );
    }
  }

  // Handle role-based access
  if (userId) {
    const authObj = await auth();
    const userMetadata = (authObj.sessionClaims?.metadata as { role?: string | string[] }) || {};
    const userRoleData = userMetadata.role;

    // Admin route check
    if (matchPatternsArray(path, ADMIN_ROUTES)) {
      const isAdmin = checkRoles(userRoleData, ADMIN_ROLES);
      if (!isAdmin) {
        return path.startsWith('/api/')
          ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
          : NextResponse.redirect(
              new URL(process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL || '/unauthorized', req.url),
            );
      }
    }

    // Expert route check
    if (matchPatternsArray(path, EXPERT_ROUTES)) {
      const isExpert = checkRoles(userRoleData, EXPERT_ROLES);
      if (!isExpert) {
        return path.startsWith('/api/')
          ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
          : NextResponse.redirect(
              new URL(process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL || '/unauthorized', req.url),
            );
      }
    }
  }

  // For private routes, don't use i18n middleware
  if (isPrivateRoute(req)) {
    return NextResponse.next();
  }

  // Apply i18n middleware to all other authenticated routes
  return intlMiddleware(req);
});

/**
 * Configure which paths the middleware runs on
 * This matches everything except static files and Next.js internals
 */
export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - _next/static    (Next.js static files)
    // - _next/image     (Next.js image optimization files)
    // - favicon.ico, robots.txt, etc. (static files)
    // - api/webhooks/   (webhook endpoints)
    // - api/cron/       (scheduled jobs endpoints)
    // - api/qstash/     (qstash verification endpoint)
    // - api/internal/   (internal services communication)
    // - api/healthcheck/ (health monitoring endpoints)
    // - api/create-payment-intent (payment processing endpoint)
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/webhooks/|api/cron/|api/qstash/|api/internal/|api/healthcheck/|api/create-payment-intent).*)',
  ],
};
