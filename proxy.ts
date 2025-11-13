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
  SPECIAL_AUTH_ROUTES,
} from '@/lib/constants/roles';
import {
  getSeoRedirect,
  isPrivateSegment,
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
const handleI18nRouting = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: true, // Enable automatic locale detection
  localeCookie: {
    maxAge: 31536000, // 1 year
    name: 'ELEVA_LOCALE',
  },
});

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
  console.log(`🔍 Processing route: ${path}`);

  // ==========================================
  // STEP 1: HANDLE SPECIAL ROUTES (no auth/i18n needed)
  // ==========================================
  
  // Skip for static files and internal APIs
  if (isStaticFile(path) || shouldSkipAuthForApi(path)) {
    console.log(`📁 Static/internal route, skipping: ${path}`);
    return NextResponse.next();
  }

  // Handle cron jobs with QStash authentication
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
        console.log('✅ Authorized cron request');
        return NextResponse.next();
      }
      console.log('❌ Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Handle SEO redirects
  const seoRedirectPath = getSeoRedirect(path);
  if (seoRedirectPath) {
    console.log(`🔀 SEO redirect: ${path} → ${seoRedirectPath}`);
    return NextResponse.redirect(new URL(seoRedirectPath, request.url), 301);
  }

  // WorkOS OAuth callback - public route
  if (path.startsWith('/api/auth/')) {
    console.log(`🔓 Auth API route: ${path}`);
    return NextResponse.next();
  }

  // ==========================================
  // STEP 2: RUN AUTHKIT (establish auth context)
  // ==========================================
  console.log(`🔐 Running AuthKit for: ${path}`);
  const {
    session,
    headers: authkitHeaders,
    authorizationUrl,
  } = await authkit(request, {
    debug: process.env.NODE_ENV === 'development',
  });

  console.log(`👤 Auth: ${session.user?.email || 'anonymous'}`);

  // ==========================================
  // STEP 3: RUN I18N MIDDLEWARE (handles locale routing)
  // ==========================================
  // Run i18n middleware to handle locale detection, redirects, and rewrites
  // This MUST happen before authorization checks because we need the final routed path
  console.log(`🌐 Applying i18n routing: ${path}`);
  const i18nResponse = handleI18nRouting(request);
  
  // Get the rewritten pathname after i18n middleware
  const rewrittenPath = i18nResponse.headers.get('x-middleware-rewrite');
  const finalPath = rewrittenPath ? new URL(rewrittenPath).pathname : path;
  console.log(`📍 Final path after i18n: ${finalPath}`);

  // ==========================================
  // STEP 4: PRESERVE AUTH HEADERS ON I18N RESPONSE
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
  // STEP 5: APPLY AUTHORIZATION CHECKS
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
    console.log('❌ No session on protected route - redirecting to sign-in');
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
    console.log(`✅ Authenticated: ${session.user.email}`);
    
    const userRole = await getUserApplicationRole(session.user.id);

    // Check admin routes
    if (matchPatternsArray(pathWithoutLocale, ADMIN_ROUTES)) {
      const isAdmin = ADMIN_ROLES.includes(userRole as (typeof ADMIN_ROLES)[number]);
      if (!isAdmin) {
        console.log(`🚫 Access denied: ${path} requires admin role`);
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }

    // Check expert routes
    if (matchPatternsArray(pathWithoutLocale, EXPERT_ROUTES)) {
      const isExpert = EXPERT_ROLES.includes(userRole as (typeof EXPERT_ROLES)[number]);
      if (!isExpert) {
        console.log(`🚫 Access denied: ${path} requires expert role`);
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
  }

  // Return the i18n response with auth headers preserved
  console.log(`✅ Request completed: ${path} -> ${finalPath}`);
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
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt (metadata)
     * - Files with extensions (.png, .jpg, .css, .js, etc.)
     * - .well-known (security files)
     * - api/webhooks (public webhooks)
     * - api/cron, api/qstash (cron jobs)
     * - api/internal (internal APIs)
     * - api/healthcheck, api/health (health checks)
     * - _vercel, _botid (Vercel internals)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|.*\\..*|\\.well-known|api/webhooks|api/cron|api/qstash|api/internal|api/healthcheck|api/health|_vercel|_botid).*)',
  ],
};


