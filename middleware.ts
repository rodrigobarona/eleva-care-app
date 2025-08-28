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
import { detectLocaleFromHeaders } from '@/lib/i18n/utils';
import { clerkMiddleware } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Create internationalization middleware with our configuration
 * We disable automatic locale detection to use our custom country-based logic
 * This ensures Portuguese visitors from Portugal get 'pt' not 'pt-BR'
 */
function createCustomI18nMiddleware() {
  const baseMiddleware = createMiddleware({
    locales,
    defaultLocale,
    localePrefix: 'as-needed',
    // Disable automatic locale detection to use our custom logic
    localeDetection: false,
    // Configure the cookie for persistent locale preference
    localeCookie: {
      // One year in seconds for persistent preference across visits
      maxAge: 31536000,
      // Name can be customized if needed
      name: 'ELEVA_LOCALE',
    },
  });

  return async (request: NextRequest) => {
    // Check if there's already a locale in the URL path
    const pathname = request.nextUrl.pathname;
    const hasLocalePrefix = locales.some(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
    );

    // If there's already a locale prefix, use the base middleware as-is
    if (hasLocalePrefix) {
      return baseMiddleware(request);
    }

    // Check for locale in cookie first (user's explicit preference)
    const cookieLocale = request.cookies.get('ELEVA_LOCALE')?.value;
    if (cookieLocale && locales.includes(cookieLocale as (typeof locales)[number])) {
      return baseMiddleware(request);
    }

    // Use custom locale detection for new visitors
    const detectedLocale = detectLocaleFromHeaders(request.headers);

    if (detectedLocale && detectedLocale !== defaultLocale) {
      // Create a modified request with custom locale detection
      const url = request.nextUrl.clone();

      // For routes that need locale prefix, redirect to the detected locale
      if (
        pathname === '/' ||
        pathname.startsWith('/about') ||
        pathname.startsWith('/legal') ||
        pathname.startsWith('/services') ||
        pathname.startsWith('/help') ||
        pathname.startsWith('/contact') ||
        pathname.startsWith('/community') ||
        isUsernameRoute(pathname) ||
        isLocalePublicRoute(pathname)
      ) {
        // Redirect to the detected locale version
        url.pathname = `/${detectedLocale}${pathname === '/' ? '' : pathname}`;
        console.log(
          `🌍 Custom locale detection: Redirecting ${pathname} to ${url.pathname} for detected locale: ${detectedLocale}`,
        );

        const response = NextResponse.redirect(url);
        // Set the locale cookie for future visits
        response.cookies.set('ELEVA_LOCALE', detectedLocale, {
          maxAge: 31536000, // 1 year
          httpOnly: false, // Allow client-side access
          path: '/',
          sameSite: 'lax',
        });
        return response;
      }
    }

    // Fall back to base middleware for all other cases
    return baseMiddleware(request);
  };
}

const handleI18nRouting = createCustomI18nMiddleware();

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
 * @param authObject - The Clerk auth object containing session claims
 * @returns Promise<boolean> indicating if the user is an expert with incomplete setup
 */
async function isExpertWithIncompleteSetup(authObject: {
  sessionClaims?: {
    metadata?: { role?: string | string[] };
    unsafeMetadata?: {
      expertSetup?: {
        events?: boolean;
        payment?: boolean;
        profile?: boolean;
        identity?: boolean;
        availability?: boolean;
        google_account?: boolean;
      };
      setupComplete?: boolean;
    };
  };
}): Promise<boolean> {
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
  const setupComplete = requiredSetupSteps.every(
    (step) => expertSetup[step as keyof typeof expertSetup] === true,
  );

  // Debug logging for expert setup check
  console.log('[DEBUG] Expert setup check:', {
    role: userRoleData,
    setupData: expertSetup,
    complete: setupComplete,
    missingSteps: requiredSetupSteps.filter(
      (step) => expertSetup[step as keyof typeof expertSetup] !== true,
    ),
  });

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
    path.startsWith('/admin') ||
    // Add all API routes to skip i18n middleware
    path.startsWith('/api/')
  );
}

/**
 * Check if a path is in the auth directory and should be publicly accessible
 * This ensures all auth pages are accessible without login
 */
function isAuthRoute(path: string): boolean {
  const segments = path.split('/').filter(Boolean);

  // List of paths that should be public under auth
  const authPaths = ['sign-in', 'sign-up', 'unauthorized', 'onboarding'];

  // Direct auth routes (e.g., /sign-in)
  if (segments.length >= 1 && authPaths.includes(segments[0])) {
    return true;
  }

  // Locale-prefixed auth routes (e.g., /en/sign-in)
  if (
    segments.length >= 2 &&
    locales.includes(segments[0] as (typeof locales)[number]) &&
    authPaths.includes(segments[1])
  ) {
    return true;
  }

  return false;
}

/**
 * Check if a path is the homepage (with or without locale prefix)
 * This ensures the homepage is accessible in all languages without login
 */
function isHomePage(path: string): boolean {
  // Check for root path
  if (path === '/') return true;

  // Check for localized root paths (e.g., /es, /pt)
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 1) {
    // Type-safe check if the segment is a valid locale
    return locales.includes(segments[0] as (typeof locales)[number]);
  }

  return false;
}

/**
 * Check if path is a username route
 * This allows public access to username profile pages
 */
function isUsernameRoute(path: string): boolean {
  // Get path segments
  const segments = path.split('/').filter(Boolean);

  // Username routes have exactly 1 segment that isn't a reserved path
  if (segments.length === 1) {
    const segment = segments[0];
    const isReserved = [
      'dashboard',
      'setup',
      'account',
      'appointments',
      'booking',
      'admin',
      'api',
      'sign-in',
      'sign-up',
      'unauthorized',
      'onboarding',
      ...locales,
    ].includes(segment);

    return !isReserved;
  }

  // Username routes can also have subpaths (username/something)
  if (segments.length > 1) {
    // Skip routes with reserved first segments
    const isReservedFirstSegment = [
      'dashboard',
      'setup',
      'account',
      'appointments',
      'booking',
      'admin',
      'api',
      'sign-in',
      'sign-up',
      'unauthorized',
      'onboarding',
      'dev', // Add dev directory to reserved paths
    ].includes(segments[0]);

    // Skip locale-prefixed reserved paths like /en/dashboard
    const isLocalePrefix = locales.includes(segments[0] as (typeof locales)[number]);
    const isReservedSecondSegment =
      isLocalePrefix &&
      segments.length > 1 &&
      [
        'dashboard',
        'setup',
        'account',
        'appointments',
        'booking',
        'admin',
        'sign-in',
        'sign-up',
        'unauthorized',
        'onboarding',
      ].includes(segments[1]);

    return !isReservedFirstSegment && !isReservedSecondSegment;
  }

  return false;
}

/**
 * Check if path is under a locale directory and should be public
 */
function isLocalePublicRoute(path: string): boolean {
  const segments = path.split('/').filter(Boolean);

  // Check if first segment is a valid locale
  if (segments.length >= 1) {
    const isLocale = locales.includes(segments[0] as (typeof locales)[number]);
    if (isLocale) {
      // Check if second segment exists and is not a reserved path that requires auth
      if (
        segments.length === 1 ||
        !['dashboard', 'setup', 'account', 'appointments', 'booking', 'admin'].includes(segments[1])
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Clerk middleware with next-intl integration for i18n
 * This follows the pattern from the next-intl documentation for Clerk integration
 */
export default clerkMiddleware(async (auth, req: NextRequest) => {
  const path = req.nextUrl.pathname;
  console.log(`🔍 Processing route: ${path}`);

  // Skip middleware for public files, Next.js internals, and webhook routes
  if (
    /\.(.*)$/.test(path) ||
    path.startsWith('/_next') ||
    path.startsWith('/api/webhooks/') ||
    path.startsWith('/api/cron/') ||
    path.startsWith('/api/qstash/') ||
    path.startsWith('/api/internal/') ||
    path.startsWith('/api/healthcheck') ||
    path.startsWith('/api/create-payment-intent') ||
    path.startsWith('/api/og/') ||
    path === '/api/novu'
  ) {
    console.log(`📁 Static/internal route, skipping: ${path}`);
    return NextResponse.next();
  }

  // Handle special cases for webhooks
  if (path.startsWith('/api/webhooks/')) {
    console.log(`🪝 Webhook route allowed: ${path}`);
    return NextResponse.next();
  }

  // Handle special auth routes (cron jobs, etc.)
  if (matchPatternsArray(path, SPECIAL_AUTH_ROUTES)) {
    console.log(`🔑 Special auth route detected: ${path}`);
    if (path.startsWith('/api/cron/')) {
      const isQStashRequest =
        req.headers.get('x-qstash-request') === 'true' ||
        req.headers.has('upstash-signature') ||
        req.headers.has('Upstash-Signature') ||
        req.headers.has('x-upstash-signature') ||
        req.headers.has('x-signature') ||
        req.headers.has('x-internal-qstash-verification') ||
        req.url.includes('signature=');

      const apiKey = req.headers.get('x-api-key');
      const userAgent = req.headers.get('user-agent') || '';
      const isUpstashUserAgent =
        userAgent.toLowerCase().includes('upstash') || userAgent.toLowerCase().includes('qstash');

      // Log headers for debugging
      console.log('📋 Request headers:', Object.fromEntries(req.headers.entries()));

      const isProduction = process.env.NODE_ENV === 'production';
      const isDeploymentFallbackEnabled = process.env.ENABLE_CRON_FALLBACK === 'true';

      // SECURITY NOTE: This fallback bypasses authentication when enabled.
      // Only use in emergencies when QStash is down and cron jobs must run.
      // Disable as soon as QStash connectivity is restored.
      if (
        isQStashRequest ||
        isUpstashUserAgent ||
        apiKey === process.env.CRON_API_KEY ||
        (isProduction && isDeploymentFallbackEnabled)
      ) {
        if (isProduction && isDeploymentFallbackEnabled) {
          console.warn('⚠️ WARNING: Cron job fallback is enabled, bypassing authentication checks');
        }
        console.log('✅ Authorized cron request - allowing access');
        return NextResponse.next();
      }
      console.log('❌ Unauthorized cron request - denying access');
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    // Other special auth routes might have different logic
    return NextResponse.next();
  }

  // Check if this is a username route (public access)
  if (isUsernameRoute(path)) {
    console.log(`👤 Username route detected, allowing public access: ${path}`);
    return handleI18nRouting(req);
  }

  // Check if route is under a locale and should be public
  if (isLocalePublicRoute(path)) {
    console.log(`🌍 Locale public route detected, allowing access: ${path}`);
    return handleI18nRouting(req);
  }

  // Check homepage (with or without locale prefix)
  if (isHomePage(path)) {
    console.log(`🏠 Homepage detected, allowing access: ${path}`);

    // Debug the Accept-Language header and other locale detection inputs
    const acceptLanguage = req.headers.get('accept-language');
    console.log(`🌐 [DEBUG] Accept-Language header: ${acceptLanguage || 'none'}`);
    console.log(
      `🌐 [DEBUG] Browser languages:`,
      acceptLanguage?.split(',').map((l) => l.trim()),
    );
    console.log(`🌐 [DEBUG] Cookie locale:`, req.cookies.get('ELEVA_LOCALE')?.value || 'none');
    console.log(`🌐 [DEBUG] Supported locales:`, locales);

    return handleI18nRouting(req);
  }

  // Check auth routes - explicitly allow without authentication
  if (isAuthRoute(path)) {
    console.log(`🔓 Auth route allowed without login: ${path}`);
    // Apply i18n middleware to auth routes
    return handleI18nRouting(req);
  }

  // Check public routes
  if (matchPatternsArray(path, PUBLIC_ROUTES)) {
    console.log(`🌐 Public route allowed: ${path}`);
    // For public routes, check if user is authenticated and trying to access auth pages
    const { userId } = await auth();
    const isAuthenticated = !!userId;

    // If authenticated user tries to access sign-in/sign-up, redirect to dashboard
    if (isAuthenticated && (path.startsWith('/sign-in') || path.startsWith('/sign-up'))) {
      console.log('👤 Authenticated user trying to access auth page, redirecting to dashboard');
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Apply i18n middleware for public routes
    return handleI18nRouting(req);
  }

  // Special handling for API routes to ensure consistent responses
  if (path.startsWith('/api/')) {
    console.log(`🔌 API route processing: ${path}`);

    // Check authentication first
    const { userId } = await auth();
    if (!userId) {
      console.log('❌ Unauthenticated API request - denying access');
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Get user role data for permission checks
    const authObj = await auth();
    const userMetadata = (authObj.sessionClaims?.metadata as { role?: string | string[] }) || {};
    const userRoleData = userMetadata.role;

    console.log(`👤 User role for API request: ${JSON.stringify(userRoleData)}`);

    // Admin route check for API paths
    if (matchPatternsArray(path, ADMIN_ROUTES)) {
      const isAdmin = checkRoles(userRoleData, ADMIN_ROLES);
      console.log(`🔒 Admin route check: ${path}, isAdmin: ${isAdmin}`);
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Forbidden', details: 'Admin access required' },
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
    }

    // Expert route check for API paths
    if (matchPatternsArray(path, EXPERT_ROUTES)) {
      const isExpert = checkRoles(userRoleData, EXPERT_ROLES);
      console.log(`🔒 Expert route check: ${path}, isExpert: ${isExpert}`);
      if (!isExpert) {
        return NextResponse.json(
          { error: 'Forbidden', details: 'Expert access required' },
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
    }

    // If all checks pass, allow the API request
    return NextResponse.next();
  }

  // Beyond this point, authentication is required
  const { userId } = await auth();

  if (!userId) {
    console.log('❌ Authentication required for route:', path);
    await auth.protect();
    return NextResponse.next();
  }

  // Expert setup redirect - check if it's an expert with incomplete setup
  // Only apply this logic for root path or dashboard (where users land after login)
  if (userId && (path === '/' || path === '/dashboard')) {
    const authObj = await auth();
    const needsSetup = await isExpertWithIncompleteSetup(
      authObj as unknown as {
        sessionClaims?: {
          metadata?: { role?: string | string[] };
          unsafeMetadata?: {
            expertSetup?: {
              events?: boolean;
              payment?: boolean;
              profile?: boolean;
              identity?: boolean;
              availability?: boolean;
              google_account?: boolean;
            };
            setupComplete?: boolean;
          };
        };
      },
    );

    if (needsSetup) {
      console.log('🔄 Expert with incomplete setup detected, redirecting to setup page');
      return NextResponse.redirect(new URL('/setup', req.url));
    }

    // Redirect from root to dashboard for normal users
    if (path === '/') {
      console.log('🔄 Redirecting authenticated user from root to dashboard');
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
      console.log(
        `🔒 Admin route check: ${path}, user roles: ${JSON.stringify(userRoleData)}, isAdmin: ${isAdmin}`,
      );
      if (!isAdmin) {
        return path.startsWith('/api/')
          ? NextResponse.json(
              { error: 'Forbidden' },
              {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          : NextResponse.redirect(
              new URL(process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL || '/unauthorized', req.url),
            );
      }
    }

    // Expert route check
    if (matchPatternsArray(path, EXPERT_ROUTES)) {
      const isExpert = checkRoles(userRoleData, EXPERT_ROLES);
      console.log(
        `🔒 Expert route check: ${path}, user roles: ${JSON.stringify(userRoleData)}, isExpert: ${isExpert}`,
      );
      if (!isExpert) {
        return path.startsWith('/api/')
          ? NextResponse.json(
              { error: 'Forbidden' },
              {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          : NextResponse.redirect(
              new URL(process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL || '/unauthorized', req.url),
            );
      }
    }
  }

  // For private routes, don't use i18n middleware
  if (isPrivateRoute(req)) {
    console.log(`🔒 Private route detected, skipping i18n: ${path}`);
    return NextResponse.next();
  }

  // Apply i18n middleware to all other authenticated routes
  console.log(`🌐 Applying i18n to authenticated route: ${path}`);
  return handleI18nRouting(req);
});

/**
 * Configure which paths the middleware runs on
 * This matches everything except static files and Next.js internals
 * Note: Development routes like /dev/* are handled in the middleware logic
 * through the isUsernameRoute function, not excluded here.
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
    // - api/healthcheck (health monitoring endpoints)
    // - api/create-payment-intent (payment processing endpoint)
    // - api/novu$       (Novu Framework bridge endpoint only, not subpaths)
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|.*\\..*|api/webhooks|api/cron|api/qstash|api/internal|api/healthcheck|api/create-payment-intent|api/novu$).*)',
  ],
};
