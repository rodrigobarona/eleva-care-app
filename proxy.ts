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

// Debug: Verify file is loaded
console.log('🚀 [PROXY.TS] File loaded and evaluated');

import {
  ADMIN_ROLES,
  ADMIN_ROUTES,
  EXPERT_ROLES,
  EXPERT_ROUTES,
  SPECIAL_AUTH_ROUTES,
} from '@/lib/constants/roles';
import {
  getSeoRedirect,
  isPrivateSegment,
  isStaticFile,
  shouldSkipAuthForApi,
} from '@/lib/constants/routes';
import { locales, routing } from '@/lib/i18n';
import { getUserApplicationRole } from '@/lib/integrations/workos/roles';
import { authkit } from '@workos-inc/authkit-nextjs';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Create internationalization middleware using the routing configuration
 * This ensures pathnames and locale settings are consistent
 */
const handleI18nRouting = createMiddleware(routing);

/**
 * Path matching utilities
 */
function isPathMatch(path: string, pattern: string): boolean {
  if (pattern === path) return true;

  // Handle wildcard patterns (e.g., /admin*)
  if (pattern.endsWith('*')) {
    const basePath = pattern.slice(0, -1);
    return path.startsWith(basePath);
  }

  // Handle regex patterns (e.g., /login(.*) or /admin(.*))
  if (pattern.includes('(.*)')) {
    const basePath = pattern.replace('(.*)', '');
    return path === basePath || path.startsWith(basePath + '/') || path.startsWith(basePath);
  }

  // Handle dynamic username patterns
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
 * Main proxy function using AuthKit for authentication with next-intl
 * Next.js 16 renamed middleware to proxy
 *
 * Pattern (following next-intl docs):
 * 1. Handle special routes (static, cron, SEO) that don't need auth or i18n
 * 2. Run AuthKit to establish auth context
 * 3. Run i18n middleware FIRST (handles locale routing, redirects, rewrites)
 * 4. Preserve AuthKit headers on i18n response
 * 5. Apply authorization checks AFTER routing is determined
 *
 * This ensures:
 * - All pages have auth context (fixes "withAuth not covered" error)
 * - Locale routing works correctly (fixes "invalid locale" error)
 * - Authorization checks happen after routing is complete
 */
export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const url = request.url;

  console.log('\n========================================');
  console.log(`🔍 [MIDDLEWARE START] ${request.method} ${path}`);
  console.log(`📍 Full URL: ${url}`);
  console.log(`🌐 Headers:`, {
    host: request.headers.get('host'),
    referer: request.headers.get('referer'),
    'user-agent': request.headers.get('user-agent')?.substring(0, 50),
  });
  console.log('========================================\n');

  // ==========================================
  // STEP 1: HANDLE SPECIAL ROUTES (no auth/i18n needed)
  // ==========================================

  // Skip for static files and internal APIs
  if (isStaticFile(path) || shouldSkipAuthForApi(path)) {
    console.log(`✅ [STEP 1] Static/internal route, skipping middleware: ${path}\n`);
    return NextResponse.next();
  }

  // Handle cron jobs with QStash authentication
  if (matchPatternsArray(path, SPECIAL_AUTH_ROUTES)) {
    console.log(`✅ [STEP 1] Special auth route detected: ${path}\n`);
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
        console.log('✅ Authorized cron request\n');
        return NextResponse.next();
      }
      console.log('❌ Unauthorized cron request\n');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Handle SEO redirects
  const seoRedirectPath = getSeoRedirect(path);
  if (seoRedirectPath) {
    console.log(`✅ [STEP 1] SEO redirect: ${path} → ${seoRedirectPath}\n`);
    return NextResponse.redirect(new URL(seoRedirectPath, request.url), 301);
  }

  // WorkOS OAuth callback - public route
  if (path.startsWith('/api/auth/')) {
    console.log(`✅ [STEP 1] Auth API route: ${path}\n`);
    return NextResponse.next();
  }

  // ==========================================
  // STEP 2: RUN AUTHKIT (establish auth context)
  // ==========================================
  console.log(`🔐 [STEP 2] Running AuthKit for: ${path}`);
  const {
    session,
    headers: authkitHeaders,
    authorizationUrl,
  } = await authkit(request, {
    debug: process.env.NODE_ENV === 'development',
  });

  console.log(`👤 [STEP 2] Auth result:`, {
    authenticated: !!session.user,
    email: session.user?.email || 'anonymous',
    authorizationUrl: authorizationUrl?.substring(0, 50),
  });
  console.log(
    `📝 [STEP 2] AuthKit headers count: ${authkitHeaders.entries ? Array.from(authkitHeaders.entries()).length : 0}`,
  );

  // ==========================================
  // STEP 3: RUN I18N MIDDLEWARE (handles locale routing)
  // ==========================================
  // Run i18n middleware to handle locale detection, redirects, and rewrites
  // This MUST happen before authorization checks because we need the final routed path
  console.log(`\n🌐 [STEP 3] Calling i18n middleware for: ${path}`);
  const i18nResponse = handleI18nRouting(request);

  console.log(`📊 [STEP 3] i18n Response details:`, {
    status: i18nResponse.status,
    statusText: i18nResponse.statusText,
    redirected: i18nResponse.redirected,
    type: i18nResponse.type,
    url: i18nResponse.url?.substring(0, 100),
  });

  // Get the rewritten pathname after i18n middleware
  const rewrittenPath = i18nResponse.headers.get('x-middleware-rewrite');
  const redirectLocation = i18nResponse.headers.get('location');
  const finalPath = rewrittenPath ? new URL(rewrittenPath).pathname : path;

  console.log(`📍 [STEP 3] Path resolution:`, {
    originalPath: path,
    rewrittenPath: rewrittenPath || 'none',
    redirectLocation: redirectLocation || 'none',
    finalPath,
  });

  // ==========================================
  // STEP 4: PRESERVE AUTH HEADERS ON I18N RESPONSE
  // ==========================================
  // Preserve AuthKit session cookies on the i18n response
  // This ensures withAuth() works in all components
  console.log(`\n🔧 [STEP 4] Preserving AuthKit headers on i18n response`);
  let authHeadersPreserved = 0;
  for (const [key, value] of authkitHeaders) {
    if (key.toLowerCase() === 'set-cookie') {
      i18nResponse.headers.append(key, value);
      authHeadersPreserved++;
      console.log(`  ✓ Appended Set-Cookie header (${value.substring(0, 30)}...)`);
    } else {
      i18nResponse.headers.set(key, value);
      authHeadersPreserved++;
      console.log(`  ✓ Set header: ${key}`);
    }
  }
  console.log(`📝 [STEP 4] Total auth headers preserved: ${authHeadersPreserved}`);

  // ==========================================
  // STEP 5: APPLY AUTHORIZATION CHECKS
  // ==========================================
  // Extract path without locale prefix for authorization checks
  const pathWithoutLocale = locales.some((locale) => finalPath.startsWith(`/${locale}/`))
    ? finalPath.substring(finalPath.indexOf('/', 1))
    : finalPath;

  console.log(`\n🔒 [STEP 5] Authorization check:`, {
    originalPath: path,
    finalPath,
    pathWithoutLocale,
  });

  // Check if this is a protected route
  const isProtectedRoute =
    isPrivateRoute(request) ||
    matchPatternsArray(pathWithoutLocale, ADMIN_ROUTES) ||
    matchPatternsArray(pathWithoutLocale, EXPERT_ROUTES);

  console.log(`🔒 [STEP 5] Route protection:`, {
    isProtectedRoute,
    hasSession: !!session.user,
  });

  // If protected route and no session, redirect to sign-in
  if (isProtectedRoute && !session.user) {
    console.log('❌ [STEP 5] No session on protected route - redirecting to sign-in');
    const redirectResponse = NextResponse.redirect(authorizationUrl!);

    // Preserve auth headers on redirect
    for (const [key, value] of authkitHeaders) {
      if (key.toLowerCase() === 'set-cookie') {
        redirectResponse.headers.append(key, value);
      } else {
        redirectResponse.headers.set(key, value);
      }
    }

    console.log(`🔄 [STEP 5] Redirecting to: ${authorizationUrl}\n`);
    return redirectResponse;
  }

  // For authenticated users on protected routes, check roles
  if (session.user && isProtectedRoute) {
    console.log(`✅ [STEP 5] Authenticated user: ${session.user.email}`);

    const userRole = await getUserApplicationRole(session.user.id);
    console.log(`👤 [STEP 5] User role: ${userRole}`);

    // Check admin routes
    if (matchPatternsArray(pathWithoutLocale, ADMIN_ROUTES)) {
      const isAdmin = ADMIN_ROLES.includes(userRole as (typeof ADMIN_ROLES)[number]);
      console.log(`🔒 [STEP 5] Admin route check: ${isAdmin}`);
      if (!isAdmin) {
        console.log(`🚫 [STEP 5] Access denied: ${path} requires admin role\n`);
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }

    // Check expert routes
    if (matchPatternsArray(pathWithoutLocale, EXPERT_ROUTES)) {
      const isExpert = EXPERT_ROLES.includes(userRole as (typeof EXPERT_ROLES)[number]);
      console.log(`🔒 [STEP 5] Expert route check: ${isExpert}`);
      if (!isExpert) {
        console.log(`🚫 [STEP 5] Access denied: ${path} requires expert role\n`);
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
  }

  // Return the i18n response with auth headers preserved
  console.log(`\n✅ [MIDDLEWARE END] Request completed successfully`);
  console.log(`📊 Final summary:`, {
    originalPath: path,
    finalPath,
    authenticated: !!session.user,
    protected: isProtectedRoute,
    responseStatus: i18nResponse.status,
  });
  console.log('========================================\n');

  return i18nResponse;
}

/**
 * Configure which paths the proxy middleware runs on
 *
 * Pattern combines:
 * - WorkOS AuthKit: Ensure middleware runs on all routes that use withAuth()
 * - next-intl: Exclude static files, Next.js internals, and specific API routes
 *
 * This matcher ensures AuthKit headers are available for ALL pages including:
 * - Root route (/)
 * - All locale-prefixed routes (/en, /es, /pt, etc.)
 * - All page routes (marketing, legal, dashboard, etc.)
 *
 * Excluded:
 * - Static files (images, css, js)
 * - Next.js internals (_next, _vercel)
 * - Public webhooks and cron jobs
 *
 * @see https://github.com/workos/authkit-nextjs#composing-custom-nextjs-middleware-with-authkit
 * @see https://next-intl.dev/docs/routing/middleware
 */
/**
 * CRITICAL: Use the simplest possible matcher for Next.js 16 + Turbopack
 * This is the recommended pattern from both WorkOS and next-intl docs
 */
export const config = {
  matcher: [
    // Match all routes except Next.js internals and static files
    '/((?!_next|_vercel|.*\\..*).*)',
    // Explicitly match root
    '/',
  ],
};
