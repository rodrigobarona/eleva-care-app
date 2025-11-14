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

// Enable debug logging with DEBUG_MIDDLEWARE=true
const DEBUG = process.env.DEBUG_MIDDLEWARE === 'true';

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

  if (DEBUG) {
    console.log('\n========================================');
    console.log(`🔍 [MIDDLEWARE] ${request.method} ${path}`);
    console.log('========================================');
  }

  // ==========================================
  // STEP 1: HANDLE SPECIAL ROUTES (no auth/i18n needed)
  // ==========================================

  // Skip for static files and internal APIs
  if (isStaticFile(path) || shouldSkipAuthForApi(path)) {
    return NextResponse.next();
  }

  // Handle cron jobs with QStash authentication
  if (matchPatternsArray(path, SPECIAL_AUTH_ROUTES)) {
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
        return NextResponse.next();
      }
      console.warn('❌ Unauthorized cron request:', path);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Handle SEO redirects
  const seoRedirectPath = getSeoRedirect(path);
  if (seoRedirectPath) {
    return NextResponse.redirect(new URL(seoRedirectPath, request.url), 301);
  }

  // WorkOS OAuth callback - public route
  if (path.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // ==========================================
  // STEP 2: RUN AUTHKIT (establish auth context)
  // ==========================================
  const {
    session,
    headers: authkitHeaders,
    authorizationUrl,
  } = await authkit(request, {
    debug: DEBUG,
  });

  if (DEBUG) {
    console.log(`👤 Auth: ${session.user?.email || 'anonymous'}`);
  }

  // ==========================================
  // STEP 3: CHECK IF AUTH/APP ROUTE (no i18n needed)
  // ==========================================
  // Auth and app routes should NOT have locale in URL for stable links
  // Language preference is stored in user settings (schema-workos.ts)
  const pathSegments = path.split('/').filter(Boolean);
  const firstSegment = pathSegments[0];
  
  const isAuthOrAppRoute = 
    firstSegment === 'login' ||
    firstSegment === 'register' ||
    firstSegment === 'onboarding' ||
    firstSegment === 'unauthorized' ||
    firstSegment === 'dashboard' ||
    firstSegment === 'setup' ||
    firstSegment === 'account' ||
    firstSegment === 'appointments' ||
    firstSegment === 'booking' ||
    firstSegment === 'admin';

  // If auth/app route, skip i18n and use language from user settings
  if (isAuthOrAppRoute) {
    if (DEBUG) {
      console.log(`🔒 Auth/App route (no locale): ${path}`);
    }
    
    const response = NextResponse.next();
    
    // Preserve AuthKit headers
    for (const [key, value] of authkitHeaders) {
      if (key.toLowerCase() === 'set-cookie') {
        response.headers.append(key, value);
      } else {
        response.headers.set(key, value);
      }
    }
    
    // Set path for authorization checks (no locale prefix)
    const finalPath = path;
    
    // Apply authorization checks (same as below)
    const pathWithoutLocale = finalPath;
    const isProtectedRoute =
      isPrivateRoute(request) ||
      matchPatternsArray(pathWithoutLocale, ADMIN_ROUTES) ||
      matchPatternsArray(pathWithoutLocale, EXPERT_ROUTES);

    if (isProtectedRoute && !session.user) {
      if (DEBUG) console.log(`🔒 Redirecting to sign-in: ${path}`);
      const redirectResponse = NextResponse.redirect(authorizationUrl!);
      
      for (const [key, value] of authkitHeaders) {
        if (key.toLowerCase() === 'set-cookie') {
          redirectResponse.headers.append(key, value);
        } else {
          redirectResponse.headers.set(key, value);
        }
      }
      
      return redirectResponse;
    }

    if (session.user && isProtectedRoute) {
      const userRole = await getUserApplicationRole(session.user.id);

      if (matchPatternsArray(pathWithoutLocale, ADMIN_ROUTES)) {
        const isAdmin = ADMIN_ROLES.includes(userRole as (typeof ADMIN_ROLES)[number]);
        if (!isAdmin) {
          console.warn(`🚫 Access denied: ${path} requires admin role`);
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
      }

      if (matchPatternsArray(pathWithoutLocale, EXPERT_ROUTES)) {
        const isExpert = EXPERT_ROLES.includes(userRole as (typeof EXPERT_ROLES)[number]);
        if (!isExpert) {
          console.warn(`🚫 Access denied: ${path} requires expert role`);
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
      }
    }

    if (DEBUG) {
      console.log(`✅ Auth/App complete: ${path}`);
    }
    
    return response;
  }

  // ==========================================
  // STEP 4: RUN I18N MIDDLEWARE (for marketing routes only)
  // ==========================================
  // Run i18n middleware for public marketing routes
  // These routes NEED locale for SEO (e.g., /en/about, /es/about)
  const i18nResponse = handleI18nRouting(request);

  // Get the rewritten pathname after i18n middleware
  const rewrittenPath = i18nResponse.headers.get('x-middleware-rewrite');
  const finalPath = rewrittenPath ? new URL(rewrittenPath).pathname : path;

  if (DEBUG) {
    console.log(`🌐 i18n (marketing): ${path} → ${finalPath}`);
  }

  // ==========================================
  // STEP 5: PRESERVE AUTH HEADERS ON I18N RESPONSE
  // ==========================================
  // Preserve AuthKit session cookies on the i18n response
  // This ensures withAuth() works in all components
  for (const [key, value] of authkitHeaders) {
    if (key.toLowerCase() === 'set-cookie') {
      i18nResponse.headers.append(key, value);
    } else {
      i18nResponse.headers.set(key, value);
    }
  }

  // ==========================================
  // STEP 6: APPLY AUTHORIZATION CHECKS (for marketing routes)
  // ==========================================
  // Extract path without locale prefix for authorization checks
  const pathWithoutLocale = locales.some((locale) => finalPath.startsWith(`/${locale}/`))
    ? finalPath.substring(finalPath.indexOf('/', 1))
    : finalPath;

  // Check if this is a protected route
  const isProtectedRoute =
    isPrivateRoute(request) ||
    matchPatternsArray(pathWithoutLocale, ADMIN_ROUTES) ||
    matchPatternsArray(pathWithoutLocale, EXPERT_ROUTES);

  // If protected route and no session, redirect to sign-in
  if (isProtectedRoute && !session.user) {
    if (DEBUG) console.log(`🔒 Redirecting to sign-in: ${path}`);
    const redirectResponse = NextResponse.redirect(authorizationUrl!);

    // Preserve auth headers on redirect
    for (const [key, value] of authkitHeaders) {
      if (key.toLowerCase() === 'set-cookie') {
        redirectResponse.headers.append(key, value);
      } else {
        redirectResponse.headers.set(key, value);
      }
    }

    return redirectResponse;
  }

  // For authenticated users on protected routes, check roles
  if (session.user && isProtectedRoute) {
    const userRole = await getUserApplicationRole(session.user.id);

    // Check admin routes
    if (matchPatternsArray(pathWithoutLocale, ADMIN_ROUTES)) {
      const isAdmin = ADMIN_ROLES.includes(userRole as (typeof ADMIN_ROLES)[number]);
      if (!isAdmin) {
        console.warn(`🚫 Access denied: ${path} requires admin role`);
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }

    // Check expert routes
    if (matchPatternsArray(pathWithoutLocale, EXPERT_ROUTES)) {
      const isExpert = EXPERT_ROLES.includes(userRole as (typeof EXPERT_ROLES)[number]);
      if (!isExpert) {
        console.warn(`🚫 Access denied: ${path} requires expert role`);
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
  }

  if (DEBUG) {
    console.log(`✅ Complete: ${path} → ${finalPath}`);
  }

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
