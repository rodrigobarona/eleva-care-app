import { ADMIN_ROUTES, EXPERT_ROUTES, SPECIAL_AUTH_ROUTES } from '@/lib/constants/roles';
import {
  getSeoRedirect,
  isPrivateSegment,
  isStaticFile,
  shouldSkipAuthForApi,
} from '@/lib/constants/routes';
import { locales, routing } from '@/lib/i18n';
import type { WorkOSPermission, WorkOSRole } from '@/types/workos-rbac';
import { ADMIN_ROLES, EXPERT_ROLES, WORKOS_PERMISSIONS, WORKOS_ROLES } from '@/types/workos-rbac';
import { authkit } from '@workos-inc/authkit-nextjs';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware with WorkOS AuthKit + JWT-based RBAC
 *
 * Integrates:
 * - WorkOS AuthKit authentication
 * - JWT-based role and permission checking (zero database queries)
 * - Internationalization (i18n via next-intl)
 * - Expert setup flow management
 * - AI/LLM content negotiation (Accept header)
 *
 * This middleware uses JWT claims for RBAC instead of database queries,
 * resulting in faster authorization checks.
 *
 * @see /docs/02-core-systems/role-based-authorization.md
 * @see _docs/_WorkOS RABAC implemenation/WORKOS-RBAC-IMPLEMENTATION-GUIDE.md
 */

// Enable debug logging with DEBUG_MIDDLEWARE=true
const DEBUG = process.env.DEBUG_MIDDLEWARE === 'true';

/**
 * Create internationalization middleware using the routing configuration
 */
const handleI18nRouting = createMiddleware(routing);

/**
 * AI/LLM Content Negotiation
 *
 * Rewrite documentation paths to .mdx format when AI agents request markdown.
 * Uses the Accept header to detect AI agents preferring markdown content.
 */
const { rewrite: rewriteLLM } = rewritePath('/docs{/*path}', '/llms.mdx/docs{/*path}');

/**
 * Protected routes with required permissions
 *
 * Define routes that require specific permissions from JWT.
 * This is checked AFTER authentication is confirmed.
 */
const PERMISSION_PROTECTED_ROUTES: Record<string, WorkOSPermission[]> = {
  // Analytics requires analytics:view permission (Top Expert only)
  '/dashboard/analytics': [WORKOS_PERMISSIONS.ANALYTICS_VIEW],
  '/api/analytics': [WORKOS_PERMISSIONS.ANALYTICS_VIEW],

  // Expert approval requires experts:approve permission (Admin only)
  '/admin/experts/approve': [WORKOS_PERMISSIONS.EXPERTS_APPROVE],
  '/api/admin/experts/approve': [WORKOS_PERMISSIONS.EXPERTS_APPROVE],

  // Platform settings require settings:edit_platform permission
  '/admin/settings': [WORKOS_PERMISSIONS.SETTINGS_EDIT_PLATFORM],

  // User management requires users:view_all permission
  '/admin/users': [WORKOS_PERMISSIONS.USERS_VIEW_ALL],

  // Partner routes require partner permissions
  '/partner': [WORKOS_PERMISSIONS.PARTNER_VIEW_DASHBOARD],
  '/partner/settings': [WORKOS_PERMISSIONS.PARTNER_MANAGE_SETTINGS],
  '/partner/team': [WORKOS_PERMISSIONS.TEAM_VIEW_MEMBERS],
};

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
 * Extract role and permissions from JWT claims
 *
 * WorkOS AuthKit includes role and permissions in the JWT when RBAC is enabled.
 */
function extractRBACFromSession(user: any): {
  role: WorkOSRole;
  permissions: WorkOSPermission[];
} {
  // Extract role from JWT claims (defaults to 'patient')
  const role = (user?.role as WorkOSRole) || WORKOS_ROLES.PATIENT;

  // Extract permissions from JWT claims (defaults to empty array)
  const permissions = (user?.permissions as WorkOSPermission[]) || [];

  return { role, permissions };
}

/**
 * Check if user has required role
 */
function hasRequiredRole(userRole: WorkOSRole, requiredRoles: readonly string[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Check if user has any of the required permissions
 */
function hasRequiredPermission(
  userPermissions: WorkOSPermission[],
  requiredPermissions: WorkOSPermission[],
): boolean {
  return requiredPermissions.some((perm) => userPermissions.includes(perm));
}

/**
 * Check permission-protected routes
 */
function checkPermissionProtectedRoute(
  path: string,
  permissions: WorkOSPermission[],
): { allowed: boolean; requiredPermissions?: WorkOSPermission[] } {
  for (const [routePattern, requiredPerms] of Object.entries(PERMISSION_PROTECTED_ROUTES)) {
    if (path.startsWith(routePattern)) {
      const allowed = hasRequiredPermission(permissions, requiredPerms);
      return { allowed, requiredPermissions: requiredPerms };
    }
  }
  return { allowed: true };
}

/**
 * Main proxy function using AuthKit for authentication with JWT-based RBAC
 *
 * Pattern:
 * 1. Handle special routes (static, cron, SEO) that don't need auth
 * 2. Run AuthKit to establish auth context and get JWT claims
 * 3. Extract role and permissions from JWT (zero database queries)
 * 4. Run i18n middleware for marketing routes
 * 5. Apply authorization checks using JWT claims
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

  // Handle AI/LLM content negotiation FIRST (before auth checks)
  // If an AI agent requests markdown (via Accept header), rewrite to .mdx route
  if (isMarkdownPreferred(request) && path.startsWith('/docs/')) {
    const result = rewriteLLM(path);
    if (result) {
      if (DEBUG) console.log(`🤖 AI content negotiation: ${path} → ${result}`);
      return NextResponse.rewrite(new URL(result, request.url));
    }
  }

  // Skip for actual static files (images, fonts, CSS, JS) - these don't render React components
  if (isStaticFile(path)) {
    return NextResponse.next();
  }

  // Skip for internal APIs that don't need auth context
  if (shouldSkipAuthForApi(path)) {
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
  // STEP 2: RUN AUTHKIT (establish auth context + get JWT claims)
  // ==========================================
  const {
    session,
    headers: authkitHeaders,
    authorizationUrl,
  } = await authkit(request, {
    debug: DEBUG,
  });

  // Extract role and permissions from JWT (zero database queries!)
  const { role: userRole, permissions: userPermissions } = session.user
    ? extractRBACFromSession(session.user)
    : { role: WORKOS_ROLES.PATIENT, permissions: [] as WorkOSPermission[] };

  if (DEBUG) {
    console.log(`👤 Auth: ${session.user?.email || 'anonymous'}`);
    console.log(`🎭 Role: ${userRole}`);
    console.log(`🔑 Permissions: ${userPermissions.length} total`);
  }

  // ==========================================
  // STEP 3: HANDLE LOCALE-PREFIXED DOCS ROUTES
  // ==========================================
  // Handle /pt/docs/expert, /es/docs/patient, etc.
  // Rewrite to /docs/* and set locale cookie for Fumadocs
  const localeDocsMatch = path.match(/^\/(en|es|pt|pt-BR)\/docs(\/.*)?$/);
  if (localeDocsMatch) {
    const locale = localeDocsMatch[1];
    const docsPath = `/docs${localeDocsMatch[2] || ''}`;
    if (DEBUG) console.log(`📚 Locale docs route: ${path} → ${docsPath} (locale: ${locale})`);

    const response = NextResponse.rewrite(new URL(docsPath, request.url));
    response.headers.set('x-fumadocs-locale', locale);
    response.cookies.set('FUMADOCS_LOCALE', locale, {
      path: '/docs',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    });

    // Preserve AuthKit headers
    for (const [key, value] of authkitHeaders) {
      if (key.toLowerCase() === 'set-cookie') {
        response.headers.append(key, value);
      } else {
        response.headers.set(key, value);
      }
    }

    return response;
  }

  // ==========================================
  // STEP 4: CHECK IF AUTH/APP ROUTE (no i18n needed)
  // ==========================================
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
    firstSegment === 'admin' ||
    firstSegment === 'partner' ||
    firstSegment === 'docs'; // Documentation routes don't need locale prefix

  // If auth/app route, skip i18n and use JWT-based RBAC
  if (isAuthOrAppRoute) {
    if (DEBUG) {
      console.log(`🔒 Auth/App route (no locale): ${path}`);
    }

    // Create request headers with AuthKit headers for downstream page handlers
    // This is critical: withAuth() reads these headers to verify middleware ran
    const requestHeaders = new Headers(request.headers);
    for (const [key, value] of authkitHeaders) {
      // Skip Set-Cookie for request headers - those go on response only
      if (key.toLowerCase() !== 'set-cookie') {
        requestHeaders.set(key, value);
      }
    }

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    // Also set response headers (for Set-Cookie and other response-specific headers)
    for (const [key, value] of authkitHeaders) {
      if (key.toLowerCase() === 'set-cookie') {
        response.headers.append(key, value);
      } else {
        response.headers.set(key, value);
      }
    }

    // Check if route requires authentication
    const isProtectedRoute =
      isPrivateRoute(request) ||
      matchPatternsArray(path, ADMIN_ROUTES) ||
      matchPatternsArray(path, EXPERT_ROUTES);

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

    // JWT-based authorization checks (no database queries!)
    if (session.user && isProtectedRoute) {
      // Check admin routes using JWT role
      if (matchPatternsArray(path, ADMIN_ROUTES)) {
        const isAdmin = hasRequiredRole(userRole, ADMIN_ROLES);
        if (!isAdmin) {
          console.warn(`🚫 Access denied: ${path} requires admin role (user has ${userRole})`);
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
      }

      // Check expert routes using JWT role
      if (matchPatternsArray(path, EXPERT_ROUTES)) {
        const isExpert = hasRequiredRole(userRole, EXPERT_ROLES);
        if (!isExpert) {
          console.warn(`🚫 Access denied: ${path} requires expert role (user has ${userRole})`);
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
      }

      // Check permission-protected routes using JWT permissions
      const permissionCheck = checkPermissionProtectedRoute(path, userPermissions);
      if (!permissionCheck.allowed) {
        console.warn(
          `🚫 Access denied: ${path} requires permissions: ${permissionCheck.requiredPermissions?.join(', ')}`,
        );
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }

    if (DEBUG) {
      console.log(`✅ Auth/App complete: ${path}`);
    }

    return response;
  }

  // ==========================================
  // STEP 5: RUN I18N MIDDLEWARE (for marketing routes only)
  // ==========================================
  // Create a modified request with AuthKit headers so downstream components can read them
  const requestHeadersForI18n = new Headers(request.headers);
  for (const [key, value] of authkitHeaders) {
    if (key.toLowerCase() !== 'set-cookie') {
      requestHeadersForI18n.set(key, value);
    }
  }

  // Create new request with AuthKit headers for the i18n middleware
  const modifiedRequest = new NextRequest(request.url, {
    method: request.method,
    headers: requestHeadersForI18n,
    body: request.body,
    cache: request.cache,
    credentials: request.credentials,
    integrity: request.integrity,
    keepalive: request.keepalive,
    mode: request.mode,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    signal: request.signal,
  });

  // Copy cookies from original request
  for (const [name, cookie] of request.cookies) {
    modifiedRequest.cookies.set(name, cookie.value);
  }

  const i18nResponse = handleI18nRouting(modifiedRequest);

  const rewrittenPath = i18nResponse.headers.get('x-middleware-rewrite');
  const finalPath = rewrittenPath ? new URL(rewrittenPath).pathname : path;

  if (DEBUG) {
    console.log(`🌐 i18n (marketing): ${path} → ${finalPath}`);
  }

  // ==========================================
  // STEP 6: PRESERVE AUTH HEADERS ON I18N RESPONSE
  // ==========================================
  // Set response headers (for Set-Cookie and other response-specific headers)
  for (const [key, value] of authkitHeaders) {
    if (key.toLowerCase() === 'set-cookie') {
      i18nResponse.headers.append(key, value);
    } else {
      i18nResponse.headers.set(key, value);
    }
  }

  // ==========================================
  // STEP 7: APPLY AUTHORIZATION CHECKS (for marketing routes)
  // ==========================================
  const pathWithoutLocale = locales.some((locale) => finalPath.startsWith(`/${locale}/`))
    ? finalPath.substring(finalPath.indexOf('/', 1))
    : finalPath;

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

  // JWT-based authorization checks for protected marketing routes
  if (session.user && isProtectedRoute) {
    // Check admin routes
    if (matchPatternsArray(pathWithoutLocale, ADMIN_ROUTES)) {
      const isAdmin = hasRequiredRole(userRole, ADMIN_ROLES);
      if (!isAdmin) {
        console.warn(`🚫 Access denied: ${path} requires admin role`);
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }

    // Check expert routes
    if (matchPatternsArray(pathWithoutLocale, EXPERT_ROUTES)) {
      const isExpert = hasRequiredRole(userRole, EXPERT_ROLES);
      if (!isExpert) {
        console.warn(`🚫 Access denied: ${path} requires expert role`);
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }

    // Check permission-protected routes
    const permissionCheck = checkPermissionProtectedRoute(pathWithoutLocale, userPermissions);
    if (!permissionCheck.allowed) {
      console.warn(
        `🚫 Access denied: ${path} requires permissions: ${permissionCheck.requiredPermissions?.join(', ')}`,
      );
      return NextResponse.redirect(new URL('/unauthorized', request.url));
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
 * This matcher includes routes that look like files but are actually Next.js routes:
 * - /llms-full.txt (LLM documentation)
 * - /docs/*.mdx (Fumadocs MDX routes)
 */
export const config = {
  matcher: [
    // Match all routes except Next.js internals and actual static files
    // Note: We exclude common static file extensions but allow .txt and .mdx which are routes
    '/((?!_next|_vercel|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|eot|css|js|map)$).*)',
    // Explicitly match root
    '/',
    // Explicitly match LLM routes (have extensions but are routes, not static files)
    '/llms-full.txt',
  ],
};
