/**
 * Next.js Middleware with WorkOS AuthKit
 *
 * Integrates:
 * - WorkOS AuthKit authentication (replaces Clerk)
 * - Role-based access control (RBAC)
 * - Internationalization (i18n via next-intl)
 * - Expert setup flow management
 *
 * @see /docs/02-core-systems/role-based-authorization.md for complete documentation
 */
import {
  ADMIN_ROLES,
  ADMIN_ROUTES,
  EXPERT_ROLES,
  EXPERT_ROUTES,
  PUBLIC_ROUTES,
  SPECIAL_AUTH_ROUTES,
} from '@/lib/constants/roles';
import {
  getSeoRedirect,
  isAuthPath,
  isPrivateSegment,
  isPublicContentPath,
  isReservedRoute,
  isStaticFile,
  shouldSkipAuthForApi,
} from '@/lib/constants/routes';
import { defaultLocale, locales } from '@/lib/i18n';
import { getUserApplicationRole } from '@/lib/integrations/workos/roles';
import { authkit } from '@workos-inc/authkit-nextjs';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Create internationalization middleware with custom configuration
 */
function createCustomI18nMiddleware() {
  const baseMiddleware = createMiddleware({
    locales,
    defaultLocale,
    localePrefix: 'as-needed',
    localeDetection: true, // Enable automatic locale detection
    localeCookie: {
      maxAge: 31536000, // 1 year
      name: 'ELEVA_LOCALE',
    },
  });

  return async (request: NextRequest) => {
    // Let next-intl middleware handle all locale routing
    return baseMiddleware(request);
  };
}

const handleI18nRouting = createCustomI18nMiddleware();

/**
 * Path matching utilities
 */
function isPathMatch(path: string, pattern: string): boolean {
  if (pattern === path) return true;
  if (pattern.endsWith('*')) {
    const basePath = pattern.slice(0, -1);
    return path.startsWith(basePath);
  }
  if (pattern === '/:username') {
    const segments = path.split('/').filter(Boolean);
    return segments.length === 1;
  }
  if (pattern === '/:username/(.*)') {
    const segments = path.split('/').filter(Boolean);
    return segments.length >= 2;
  }
  return false;
}

function matchPatternsArray(path: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => isPathMatch(path, pattern));
}

/**
 * Check if request is for a private route (requires authentication)
 */
function isPrivateRoute(request: NextRequest): boolean {
  const path = request.nextUrl.pathname;
  const segments = path.split('/').filter(Boolean);

  // Skip locale prefix if present
  const startIndex = locales.includes(segments[0] as (typeof locales)[number]) ? 1 : 0;
  const firstSegment = segments[startIndex];

  return firstSegment ? isPrivateSegment(firstSegment) || path.startsWith('/api/') : false;
}

/**
 * Check if path is an authentication route
 */
function isAuthRoute(path: string): boolean {
  const segments = path.split('/').filter(Boolean);

  // Check first segment (no locale)
  if (segments.length >= 1 && isAuthPath(segments[0])) {
    return true;
  }

  // Check second segment (with locale prefix)
  if (
    segments.length >= 2 &&
    locales.includes(segments[0] as (typeof locales)[number]) &&
    isAuthPath(segments[1])
  ) {
    return true;
  }

  return false;
}

function isHomePage(path: string): boolean {
  if (path === '/') return true;
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 1) {
    return locales.includes(segments[0] as (typeof locales)[number]);
  }
  return false;
}

function isUsernameRoute(path: string): boolean {
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 1) {
    const segment = segments[0];
    // Check against centralized RESERVED_ROUTES constant + locales
    const isReserved =
      isReservedRoute(segment) || locales.includes(segment as (typeof locales)[number]);
    return !isReserved;
  }

  if (segments.length > 1) {
    // Check if first segment is reserved or is a locale
    const isReservedFirstSegment = isReservedRoute(segments[0]);
    const isLocalePrefix = locales.includes(segments[0] as (typeof locales)[number]);

    // If first segment is locale, check if second segment is reserved
    const isReservedSecondSegment =
      isLocalePrefix && segments.length > 1 && isReservedRoute(segments[1]);

    return !isReservedFirstSegment && !isReservedSecondSegment;
  }

  return false;
}

/**
 * Check if path is a public route with locale prefix
 */
function isLocalePublicRoute(path: string): boolean {
  const segments = path.split('/').filter(Boolean);

  if (segments.length >= 1) {
    const isLocale = locales.includes(segments[0] as (typeof locales)[number]);
    if (isLocale) {
      // If only locale segment, or second segment is not private
      return segments.length === 1 || (segments[1] ? !isPrivateSegment(segments[1]) : true);
    }
  }

  return false;
}

/**
 * Main proxy function using AuthKit for authentication
 * Next.js 16 renamed middleware to proxy
 */
export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  console.log(`🔍 Processing route: ${path}`);

  // Skip proxy for static files and special API routes
  if (isStaticFile(path) || shouldSkipAuthForApi(path)) {
    console.log(`📁 Static/internal route, skipping: ${path}`);
    return NextResponse.next();
  }

  // Handle special auth routes (cron jobs with QStash)
  if (matchPatternsArray(path, SPECIAL_AUTH_ROUTES)) {
    console.log(`🔑 Special auth route detected: ${path}`);
    if (path.startsWith('/api/cron/')) {
      const isQStashRequest =
        request.headers.get('x-qstash-request') === 'true' ||
        request.headers.has('upstash-signature') ||
        request.headers.has('Upstash-Signature') ||
        request.headers.has('x-upstash-signature') ||
        request.headers.has('x-signature') ||
        request.headers.has('x-internal-qstash-verification') ||
        request.url.includes('signature=');

      const apiKey = request.headers.get('x-api-key');
      const userAgent = request.headers.get('user-agent') || '';
      const isUpstashUserAgent =
        userAgent.toLowerCase().includes('upstash') || userAgent.toLowerCase().includes('qstash');

      if (
        isQStashRequest ||
        isUpstashUserAgent ||
        apiKey === process.env.CRON_API_KEY ||
        (process.env.NODE_ENV === 'production' && process.env.ENABLE_CRON_FALLBACK === 'true')
      ) {
        console.log('✅ Authorized cron request - allowing access');
        return NextResponse.next();
      }
      console.log('❌ Unauthorized cron request - denying access');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Handle SEO redirects (centralized in routes.ts)
  const seoRedirectPath = getSeoRedirect(path);
  if (seoRedirectPath) {
    console.log(`🔀 SEO redirect: ${path} → ${seoRedirectPath}`);
    return NextResponse.redirect(new URL(seoRedirectPath, request.url), 301);
  }

  // WorkOS auth API routes are public (OAuth callback flow)
  if (path.startsWith('/api/auth/')) {
    console.log(`🔓 Auth API route: ${path}`);
    return NextResponse.next();
  }

  // =============================================
  // RUN I18N MIDDLEWARE FIRST FOR LOCALE ROUTING
  // =============================================
  // For public routes, let next-intl handle locale routing first
  // (next-intl automatically rewrites "/" to "/en" internally with localePrefix: 'as-needed')

  // Extract path without locale prefix for route matching
  const pathWithoutLocale = locales.some((locale) => path.startsWith(`/${locale}/`))
    ? path.substring(path.indexOf('/', 1))
    : path;

  // Determine if route is public (but may still need auth context)
  const isPublicContentRoute =
    isLocalePublicRoute(path) ||
    isHomePage(path) ||
    isPublicContentPath(path) ||
    isPublicContentPath(pathWithoutLocale) ||
    matchPatternsArray(path, PUBLIC_ROUTES);

  // Auth routes: skip i18n routing (sign-in, sign-up are not localized)
  if (isAuthRoute(path)) {
    console.log(`🔓 Auth route (no i18n): ${path}`);
    return NextResponse.next();
  }

  // Username routes need AuthKit context (for unpublished profile checks)
  // but should be accessible to everyone
  const needsAuthContext = isUsernameRoute(path);

  // For public content routes (no auth needed), apply i18n first and return
  if (isPublicContentRoute && !needsAuthContext) {
    console.log(`🌐 Public route with i18n: ${path}`);
    return await handleI18nRouting(request);
  }

  // =============================================
  // RUN AUTHKIT FOR PROTECTED ROUTES
  // =============================================
  // AuthKit middleware runs for protected routes only
  const {
    session,
    headers: authkitHeaders,
    authorizationUrl,
  } = await authkit(request, {
    debug: process.env.NODE_ENV === 'development',
  });

  // =============================================
  // PROTECTED ROUTES - Require Authentication
  // =============================================

  // Username routes with auth context (accessible to everyone, auth used for owner checks)
  if (needsAuthContext) {
    console.log(
      `👤 Username route with auth context: ${path}, user: ${session.user?.email || 'anonymous'}`,
    );

    // Apply i18n routing with auth headers preserved
    const response = await handleI18nRouting(request);

    // Preserve AuthKit headers (session cookies) so withAuth() can work in components
    for (const [key, value] of authkitHeaders) {
      if (key.toLowerCase() === 'set-cookie') {
        response.headers.append(key, value);
      } else {
        response.headers.set(key, value);
      }
    }

    return response;
  }

  // If no user session on protected route, redirect to sign-in
  if (!session.user) {
    console.log('❌ No session on protected route - redirecting to sign-in');
    const response = NextResponse.redirect(authorizationUrl!);

    // Preserve AuthKit headers (session cookies)
    for (const [key, value] of authkitHeaders) {
      if (key.toLowerCase() === 'set-cookie') {
        response.headers.append(key, value);
      } else {
        response.headers.set(key, value);
      }
    }
    return response;
  }

  // User is authenticated
  console.log(`👤 Authenticated user: ${session.user.email}`);

  // Get user's application role from database
  const userRole = await getUserApplicationRole(session.user.id);

  // Check admin routes
  if (matchPatternsArray(path, ADMIN_ROUTES)) {
    const isAdmin = ADMIN_ROLES.includes(userRole as (typeof ADMIN_ROLES)[number]);
    console.log(`🔒 Admin route check: ${path}, isAdmin: ${isAdmin}`);

    if (!isAdmin) {
      return path.startsWith('/api/')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Check expert routes
  if (matchPatternsArray(path, EXPERT_ROUTES)) {
    const isExpert = EXPERT_ROLES.includes(userRole as (typeof EXPERT_ROLES)[number]);
    console.log(`🔒 Expert route check: ${path}, isExpert: ${isExpert}`);

    if (!isExpert) {
      return path.startsWith('/api/')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // For private routes, skip i18n
  if (isPrivateRoute(request)) {
    console.log(`🔒 Private route, skipping i18n: ${path}`);

    // Forward request with AuthKit headers
    const response = NextResponse.next({
      request: { headers: new Headers(request.headers) },
    });

    for (const [key, value] of authkitHeaders) {
      if (key.toLowerCase() === 'set-cookie') {
        response.headers.append(key, value);
      } else {
        response.headers.set(key, value);
      }
    }

    return response;
  }

  // Apply i18n to authenticated routes
  console.log(`🌐 Applying i18n to authenticated route: ${path}`);
  const response = await handleI18nRouting(request);

  // Preserve AuthKit headers (session cookies)
  for (const [key, value] of authkitHeaders) {
    if (key.toLowerCase() === 'set-cookie') {
      response.headers.append(key, value);
    } else {
      response.headers.set(key, value);
    }
  }

  return response;
}

/**
 * Configure which paths the middleware runs on
 * Note: api/webhooks includes the Novu bridge at /api/webhooks/novu
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|.*\\..*|\\.well-known|api/webhooks|api/cron|api/qstash|api/internal|api/healthcheck|api/health|api/create-payment-intent|_vercel|_botid).*)',
  ],
};
