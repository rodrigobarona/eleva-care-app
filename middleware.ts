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
import { defaultLocale, locales } from '@/lib/i18n';
import { detectLocaleFromHeaders } from '@/lib/i18n/utils';
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
    localeDetection: false,
    localeCookie: {
      maxAge: 31536000, // 1 year
      name: 'ELEVA_LOCALE',
    },
  });

  return async (request: NextRequest) => {
    const pathname = request.nextUrl.pathname;
    const hasLocalePrefix = locales.some(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
    );

    if (hasLocalePrefix) {
      return baseMiddleware(request);
    }

    const cookieLocale = request.cookies.get('ELEVA_LOCALE')?.value;
    if (cookieLocale && locales.includes(cookieLocale as (typeof locales)[number])) {
      return baseMiddleware(request);
    }

    const detectedLocale = detectLocaleFromHeaders(request.headers);
    if (detectedLocale && detectedLocale !== defaultLocale) {
      if (
        pathname === '/' ||
        pathname.startsWith('/about') ||
        pathname.startsWith('/legal') ||
        pathname.startsWith('/trust') ||
        pathname.startsWith('/services') ||
        pathname.startsWith('/help') ||
        pathname.startsWith('/contact') ||
        pathname.startsWith('/community') ||
        isUsernameRoute(pathname) ||
        isLocalePublicRoute(pathname)
      ) {
        const url = request.nextUrl.clone();
        url.pathname = `/${detectedLocale}${pathname === '/' ? '' : pathname}`;

        const response = NextResponse.redirect(url);
        response.cookies.set('ELEVA_LOCALE', detectedLocale, {
          maxAge: 31536000,
          httpOnly: false,
          path: '/',
          sameSite: 'lax',
        });
        return response;
      }
    }

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

function isPrivateRoute(request: NextRequest): boolean {
  const path = request.nextUrl.pathname;
  return (
    path.startsWith('/dashboard') ||
    path.startsWith('/setup') ||
    path.startsWith('/account') ||
    path.startsWith('/appointments') ||
    path.startsWith('/booking') ||
    path.startsWith('/admin') ||
    path.startsWith('/api/')
  );
}

function isAuthRoute(path: string): boolean {
  const segments = path.split('/').filter(Boolean);
  const authPaths = ['sign-in', 'sign-up', 'unauthorized', 'onboarding'];

  if (segments.length >= 1 && authPaths.includes(segments[0])) {
    return true;
  }

  if (
    segments.length >= 2 &&
    locales.includes(segments[0] as (typeof locales)[number]) &&
    authPaths.includes(segments[1])
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
      '.well-known',
      ...locales,
    ].includes(segment);
    return !isReserved;
  }

  if (segments.length > 1) {
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
    ].includes(segments[0]);

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

function isLocalePublicRoute(path: string): boolean {
  const segments = path.split('/').filter(Boolean);

  if (segments.length >= 1) {
    const isLocale = locales.includes(segments[0] as (typeof locales)[number]);
    if (isLocale) {
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
 * Main middleware using AuthKit for authentication
 */
export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  console.log(`🔍 Processing route: ${path}`);

  // Skip middleware for static files, Next.js internals, and webhook routes
  if (
    /\.(.*)$/.test(path) ||
    path.startsWith('/_next') ||
    path.startsWith('/.well-known') ||
    path.startsWith('/api/webhooks/') ||
    path.startsWith('/api/cron/') ||
    path.startsWith('/api/qstash/') ||
    path.startsWith('/api/internal/') ||
    path.startsWith('/api/healthcheck') ||
    path.startsWith('/api/health/') ||
    path.startsWith('/api/create-payment-intent') ||
    path.startsWith('/api/og/') ||
    path === '/api/novu' ||
    path.startsWith('/_vercel/insights/') ||
    path.startsWith('/_botid/')
  ) {
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

  // Handle SEO redirects
  if (path.includes('/legal/security') || path.includes('/legal/dpa')) {
    const newPath = path
      .replace('/legal/security', '/trust/security')
      .replace('/legal/dpa', '/trust/dpa');
    return NextResponse.redirect(new URL(newPath, request.url), 301);
  }

  // Public routes that don't need authentication
  if (
    isUsernameRoute(path) ||
    isLocalePublicRoute(path) ||
    isHomePage(path) ||
    isAuthRoute(path) ||
    matchPatternsArray(path, PUBLIC_ROUTES)
  ) {
    console.log(`🌐 Public route: ${path}`);
    return handleI18nRouting(request);
  }

  // WorkOS auth API routes are public (OAuth callback flow)
  if (path.startsWith('/api/auth/')) {
    console.log(`🔓 Auth API route: ${path}`);
    return NextResponse.next();
  }

  // =============================================
  // PROTECTED ROUTES - Require Authentication
  // =============================================

  // Get session using AuthKit
  const {
    session,
    headers: authkitHeaders,
    authorizationUrl,
  } = await authkit(request, {
    debug: process.env.NODE_ENV === 'development',
  });

  // If no user session, redirect to sign-in
  if (!session.user) {
    console.log('❌ No session - redirecting to sign-in');
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
  return handleI18nRouting(request);
}

/**
 * Configure which paths the middleware runs on
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|.*\\..*|\\.well-known|api/webhooks|api/cron|api/qstash|api/internal|api/healthcheck|api/health|api/create-payment-intent|api/novu$|_vercel|_botid).*)',
  ],
};
