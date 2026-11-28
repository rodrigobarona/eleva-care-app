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
import { clerkClient, clerkMiddleware } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Verbose request logging, disabled by default.
 *
 * The proxy runs on almost every request, so unconditional console.log calls
 * (string formatting, JSON.stringify, log ingestion) add measurable Fluid Active
 * CPU. Set PROXY_DEBUG=true to turn the logs back on while debugging routing.
 * Warnings and errors are still always logged.
 */
const PROXY_DEBUG = process.env.PROXY_DEBUG === 'true';
const debugLog: (...args: unknown[]) => void = PROXY_DEBUG
  ? (...args) => console.log(...args)
  : () => {};

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
        pathname.startsWith('/trust') ||
        pathname.startsWith('/services') ||
        pathname.startsWith('/help') ||
        pathname.startsWith('/contact') ||
        pathname.startsWith('/community') ||
        pathname.startsWith('/history') ||
        pathname.startsWith('/my-packs') ||
        pathname.startsWith('/pack-purchase') ||
        isUsernameRoute(pathname) ||
        isLocalePublicRoute(pathname)
      ) {
        // Redirect to the detected locale version
        url.pathname = `/${detectedLocale}${pathname === '/' ? '' : pathname}`;
        debugLog(
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

  // Handle path parameter patterns like /experts/:path*
  if (pattern.includes(':') && !pattern.includes('(')) {
    const regexPattern = pattern
      .replace(/\//g, '\\/') // Escape forward slashes
      .replace(/:[\w]+\*/g, '.*') // :path* → .*
      .replace(/:[\w]+/g, '[^/]+'); // :param → one segment
    try {
      return new RegExp(`^${regexPattern}$`).test(path);
    } catch {
      return false;
    }
  }

  // Handle regex-like patterns e.g. /legal/(.*), /sign-in(.*)
  if (pattern.includes('(') && pattern.includes(')')) {
    try {
      const regexPattern = pattern.replace(/\//g, '\\/'); // Escape forward slashes only
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
 * Minimal shape of the auth object returned by Clerk's `auth()` in middleware.
 * Avoids coupling to Clerk's internal type exports which vary across versions.
 */
interface MiddlewareAuthObject {
  userId: string | null;
  sessionClaims?: {
    metadata?: unknown;
    unsafeMetadata?: unknown;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

/**
 * Check if a user is an expert with incomplete setup
 * @param authObj - The Clerk auth object containing session claims
 * @returns Promise<boolean> indicating if the user is an expert with incomplete setup
 */
async function isExpertWithIncompleteSetup(authObj: MiddlewareAuthObject): Promise<boolean> {
  const userRoleData = await getUserRoles(authObj);
  if (!userRoleData) return false;

  const isExpert = checkRoles(userRoleData, EXPERT_ROLES);
  if (!isExpert) return false;

  // Expert setup data lives in unsafeMetadata. The production session token does
  // not include that claim, and treating it as "no setup" sent every expert from
  // /dashboard to /setup, so fall back to the (cached) Clerk user.
  const claimsUnsafe = authObj.sessionClaims?.unsafeMetadata as Record<string, unknown> | undefined;
  const unsafeMetaSource =
    claimsUnsafe ??
    (authObj.userId ? (await getClerkUserMeta(authObj.userId))?.unsafeMetadata : undefined);
  const unsafeMeta = unsafeMetaSource as
    | {
        expertSetup?: {
          events?: boolean;
          payment?: boolean;
          profile?: boolean;
          identity?: boolean;
          availability?: boolean;
          google_account?: boolean;
        };
        setupComplete?: boolean;
      }
    | undefined;

  const expertSetup = unsafeMeta?.expertSetup;
  if (!expertSetup) return true;

  const requiredSetupSteps = [
    'events',
    'payment',
    'profile',
    'identity',
    'availability',
    'google_account',
  ];

  const setupComplete = requiredSetupSteps.every(
    (step) => expertSetup[step as keyof typeof expertSetup] === true,
  );

  if (PROXY_DEBUG) {
    debugLog('[DEBUG] Expert setup check:', {
      role: userRoleData,
      setupData: expertSetup,
      complete: setupComplete,
      missingSteps: requiredSetupSteps.filter(
        (step) => expertSetup[step as keyof typeof expertSetup] !== true,
      ),
    });
  }

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
      'dev',
      '.well-known',
      'about',
      'legal',
      'trust',
      'history',
      'my-packs',
      'pack-purchase',
      'services',
      'help',
      'contact',
      'community',
      'support',
      'explore',
      'blog',
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
      'dev',
      '.well-known',
      'about',
      'legal',
      'trust',
      'history',
      'my-packs',
      'pack-purchase',
      'services',
      'help',
      'contact',
      'community',
      'support',
      'explore',
      'blog',
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
        'about',
        'legal',
        'trust',
        'history',
        'my-packs',
        'pack-purchase',
        'services',
        'help',
        'contact',
        'community',
        'support',
        'explore',
        'blog',
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
 * Resolve user roles reliably for middleware authorization.
 *
 * Tries sessionClaims.metadata.role first (fast, from JWT).
 * Falls back to Clerk API (publicMetadata.role) when session claims
 * don't contain role data — which happens when the Clerk JWT session
 * token template hasn't been configured to include publicMetadata.
 *
 * Results are cached per-request so multiple role checks don't cause
 * repeated API calls.
 */
const roleCache = new WeakMap<object, string | string[] | undefined>();

/**
 * Short-lived per-instance cache for the Clerk API fallback, keyed by userId.
 *
 * `auth()` returns a fresh object on every call, so the WeakMap above rarely hits
 * and the fallback could call the Clerk API several times per request. Fluid
 * instances are reused across requests, so this also avoids one Clerk API call per
 * navigation. Role changes therefore take up to API_ROLE_CACHE_TTL_MS to apply in
 * the proxy (pages and server actions still check roles themselves).
 *
 * The real fix is to expose `metadata` (publicMetadata) in the Clerk session token
 * so the fast path above always hits.
 */
const API_ROLE_CACHE_TTL_MS = 30_000;
const API_ROLE_CACHE_MAX_ENTRIES = 1_000;
type ClerkUserMeta = {
  role: string | string[] | undefined;
  unsafeMetadata: Record<string, unknown> | undefined;
};
const apiRoleCache = new Map<string, ClerkUserMeta & { expiresAt: number }>();

/**
 * Role + unsafeMetadata for a user from the Clerk API (cached per instance).
 * Used only when the session token doesn't carry these claims.
 */
async function getClerkUserMeta(userId: string): Promise<ClerkUserMeta | undefined> {
  const cached = apiRoleCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached;

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const meta: ClerkUserMeta = {
      role: user.publicMetadata?.role as string | string[] | undefined,
      unsafeMetadata: user.unsafeMetadata as Record<string, unknown> | undefined,
    };
    if (apiRoleCache.size >= API_ROLE_CACHE_MAX_ENTRIES) {
      apiRoleCache.clear();
    }
    apiRoleCache.set(userId, { ...meta, expiresAt: Date.now() + API_ROLE_CACHE_TTL_MS });
    return meta;
  } catch (error) {
    console.error('Failed to fetch user metadata from Clerk API:', error);
    return undefined;
  }
}

async function getUserRoles(authObj: MiddlewareAuthObject): Promise<string | string[] | undefined> {
  if (roleCache.has(authObj)) {
    return roleCache.get(authObj);
  }

  // Fast path: read from JWT session claims. The production session token exposes
  // the role as a top-level `role` claim; `metadata.role` is the documented shape.
  const claims = authObj.sessionClaims as
    | { metadata?: { role?: string | string[] }; role?: string | string[] }
    | null
    | undefined;
  const claimsRole = claims?.metadata?.role ?? claims?.role;

  if (claimsRole) {
    roleCache.set(authObj, claimsRole);
    return claimsRole;
  }

  // Fallback: fetch from Clerk API when JWT doesn't contain role data
  if (authObj.userId) {
    const meta = await getClerkUserMeta(authObj.userId);
    if (meta) {
      roleCache.set(authObj, meta.role);
      return meta.role;
    }
  }

  roleCache.set(authObj, undefined);
  return undefined;
}

/**
 * Proxy function with Clerk middleware and next-intl integration for i18n
 * This follows the Next.js 16 proxy convention (previously middleware.ts)
 * Integrates with Clerk for authentication and next-intl for internationalization
 */
const proxyHandler = clerkMiddleware(async (auth, req: NextRequest) => {
  const path = req.nextUrl.pathname;
  debugLog(`🔍 Processing route: ${path}`);

  // Skip middleware for public files, Next.js internals, and webhook routes
  if (
    /\.(.*)$/.test(path) ||
    path.startsWith('/_next') ||
    path.startsWith('/.well-known') || // Standard web convention paths (security.txt, app links, etc.)
    path.startsWith('/api/webhooks/') ||
    path.startsWith('/api/cron/') ||
    path.startsWith('/api/qstash/') ||
    path.startsWith('/api/internal/') ||
    path.startsWith('/api/healthcheck') ||
    path.startsWith('/api/health/') || // Individual service health checks
    path.startsWith('/api/create-payment-intent') ||
    path.startsWith('/api/create-pack-checkout') ||
    path.startsWith('/api/og/') ||
    path === '/api/novu' ||
    // BotID routes - let BotID handle these directly
    path.startsWith('/_vercel/insights/') ||
    path.startsWith('/_botid/')
  ) {
    debugLog(`📁 Static/internal route, skipping: ${path}`);
    return NextResponse.next();
  }

  // Handle special auth routes (cron jobs, etc.)
  if (matchPatternsArray(path, SPECIAL_AUTH_ROUTES)) {
    debugLog(`🔑 Special auth route detected: ${path}`);
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
        debugLog('✅ Authorized cron request - allowing access');
        return NextResponse.next();
      }
      debugLog('❌ Unauthorized cron request - denying access');
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

  // Handle redirects from old /legal/ URLs to new /trust/ URLs for SEO
  if (path.includes('/legal/security') || path.includes('/legal/dpa')) {
    const newPath = path
      .replace('/legal/security', '/trust/security')
      .replace('/legal/dpa', '/trust/dpa');
    debugLog(`🔀 Redirecting old legal URL to trust: ${path} → ${newPath}`);
    return NextResponse.redirect(new URL(newPath, req.url), 301); // Permanent redirect
  }

  // Check if this is a username route (public access)
  if (isUsernameRoute(path)) {
    debugLog(`👤 Username route detected, allowing public access: ${path}`);
    return handleI18nRouting(req);
  }

  // Check if route is under a locale and should be public
  if (isLocalePublicRoute(path)) {
    debugLog(`🌍 Locale public route detected, allowing access: ${path}`);
    return handleI18nRouting(req);
  }

  // Check homepage (with or without locale prefix)
  if (isHomePage(path)) {
    debugLog(`🏠 Homepage detected, allowing access: ${path}`);

    return handleI18nRouting(req);
  }

  // Check auth routes - explicitly allow without authentication
  if (isAuthRoute(path)) {
    debugLog(`🔓 Auth route allowed without login: ${path}`);
    // Apply i18n middleware to auth routes
    return handleI18nRouting(req);
  }

  // Check public routes
  if (matchPatternsArray(path, PUBLIC_ROUTES)) {
    debugLog(`🌐 Public route allowed: ${path}`);
    // For public routes, check if user is authenticated and trying to access auth pages
    const { userId } = await auth();
    const isAuthenticated = !!userId;

    // If authenticated user tries to access sign-in/sign-up, redirect to dashboard
    if (isAuthenticated && (path.startsWith('/sign-in') || path.startsWith('/sign-up'))) {
      debugLog('👤 Authenticated user trying to access auth page, redirecting to dashboard');
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Apply i18n middleware for public routes
    return handleI18nRouting(req);
  }

  // Special handling for API routes to ensure consistent responses
  if (path.startsWith('/api/')) {
    debugLog(`🔌 API route processing: ${path}`);

    // Check authentication first
    const { userId } = await auth();
    if (!userId) {
      debugLog('❌ Unauthenticated API request - denying access');
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
    const userRoleData = await getUserRoles(authObj);

    debugLog(`👤 User role for API request: ${JSON.stringify(userRoleData)}`);

    // Admin route check for API paths
    if (matchPatternsArray(path, ADMIN_ROUTES)) {
      const isAdmin = checkRoles(userRoleData, ADMIN_ROLES);
      debugLog(`🔒 Admin route check: ${path}, isAdmin: ${isAdmin}`);
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
      debugLog(`🔒 Expert route check: ${path}, isExpert: ${isExpert}`);
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
    debugLog('❌ Authentication required for route:', path);
    await auth.protect();
    return NextResponse.next();
  }

  // Expert setup redirect - check if it's an expert with incomplete setup
  // Only apply this logic for root path or dashboard (where users land after login)
  if (userId && (path === '/' || path === '/dashboard')) {
    const authObj = await auth();
    const needsSetup = await isExpertWithIncompleteSetup(authObj);

    if (needsSetup) {
      debugLog('🔄 Expert with incomplete setup detected, redirecting to setup page');
      return NextResponse.redirect(new URL('/setup', req.url));
    }

    // Redirect from root to dashboard for normal users
    if (path === '/') {
      debugLog('🔄 Redirecting authenticated user from root to dashboard');
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
    const userRoleData = await getUserRoles(authObj);

    // Admin route check
    if (matchPatternsArray(path, ADMIN_ROUTES)) {
      const isAdmin = checkRoles(userRoleData, ADMIN_ROLES);
      debugLog(
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
      debugLog(
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
    debugLog(`🔒 Private route detected, skipping i18n: ${path}`);
    return NextResponse.next();
  }

  // Apply i18n middleware to all other authenticated routes
  debugLog(`🌐 Applying i18n to authenticated route: ${path}`);
  return handleI18nRouting(req);
});

/**
 * Marketing pages that never read the Clerk session on the server.
 * Paths are matched after stripping an optional locale prefix.
 */
const CLERK_FREE_PAGE_PATTERN = /^\/(?:about|history|legal(?:\/.*)?|trust(?:\/.*)?)?$/;

/**
 * Whether a request can skip clerkMiddleware and go straight to i18n routing.
 *
 * clerkMiddleware authenticates every request it sees (cookie parsing, JWT
 * verification, handshake checks). On static marketing pages that work is
 * wasted: nothing on the server reads the session there, and the client-side
 * ClerkProvider manages the session on its own. Skipping it cuts proxy CPU on
 * the most visited pages.
 *
 * Conservative on purpose:
 * - GET/HEAD only: server actions are POSTs to the page URL and may call auth().
 * - Never when Clerk handshake/dev-browser query params are present.
 * - Never for /legal/security and /legal/dpa, which the handler redirects.
 * - Pages under these paths must not call auth()/currentUser(); if one starts
 *   to, remove it from CLERK_FREE_PAGE_PATTERN.
 */
function canSkipClerk(request: NextRequest): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;

  for (const key of request.nextUrl.searchParams.keys()) {
    if (key.startsWith('__clerk')) return false;
  }

  const path = request.nextUrl.pathname;
  if (path.includes('/legal/security') || path.includes('/legal/dpa')) return false;

  const segments = path.split('/');
  const hasLocalePrefix = locales.includes(segments[1] as (typeof locales)[number]);
  const pathWithoutLocale = hasLocalePrefix ? `/${segments.slice(2).join('/')}` : path;
  const normalized =
    pathWithoutLocale.length > 1 && pathWithoutLocale.endsWith('/')
      ? pathWithoutLocale.slice(0, -1)
      : pathWithoutLocale;

  return CLERK_FREE_PAGE_PATTERN.test(normalized);
}

export function proxy(request: NextRequest, event: import('next/server').NextFetchEvent) {
  if (canSkipClerk(request)) {
    return handleI18nRouting(request);
  }
  return proxyHandler(request, event);
}

/**
 * Configure which paths the proxy runs on
 * This matches everything except static files and Next.js internals
 * Note: Development routes like /dev/* are handled in the proxy logic
 * through the isUsernameRoute function, not excluded here.
 */
export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - _next/static    (Next.js static files)
    // - _next/image     (Next.js image optimization files)
    // - favicon.ico, robots.txt, etc. (static files)
    // - .well-known/    (standard web convention paths - note: dot is literal, not regex)
    // - api/webhooks/   (webhook endpoints)
    // - api/cron/       (scheduled jobs endpoints)
    // - api/qstash/     (qstash verification endpoint)
    // - api/internal/   (internal services communication)
    // - api/healthcheck (health monitoring endpoints)
    // - api/create-payment-intent (payment processing endpoint)
    // - api/create-pack-checkout  (pack purchase checkout endpoint)
    // - api/novu$       (Novu Framework bridge endpoint only, not subpaths)
    // - _vercel/, _botid/ (Vercel and BotID internal paths)
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|.*\\..*|\\.well-known|api/webhooks|api/cron|api/qstash|api/internal|api/healthcheck|api/health|api/create-payment-intent|api/create-pack-checkout|api/novu$|_vercel|_botid).*)',
  ],
};
