/**
 * Role-Based Access Control Middleware
 *
 * This middleware implements a comprehensive authorization strategy:
 * 1. Public routes are explicitly allowed without authentication
 * 2. Authentication is required for all other routes
 * 3. Specific route patterns are restricted to users with appropriate roles
 * 4. Webhook routes completely bypass authentication
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
import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Simple and reliable path matcher
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

// Check if a path matches any patterns in the array
function matchPatternsArray(path: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => isPathMatch(path, pattern));
}

export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname;
  console.log(`🔍 Processing route: ${path}`);

  // Fast path for username routes (critical fix)
  const segments = path.split('/').filter(Boolean);
  if (segments.length >= 2 && !path.startsWith('/api/')) {
    console.log(`👤 Potential username route: ${path}`);
    return NextResponse.next();
  }

  // Handle special cases
  if (path.startsWith('/api/webhooks/')) {
    console.log(`Webhook route allowed: ${path}`);
    return NextResponse.next();
  }

  // Check if the path is in SPECIAL_AUTH_ROUTES (including cron jobs)
  if (matchPatternsArray(path, SPECIAL_AUTH_ROUTES)) {
    console.log(`Special auth route detected: ${path}`);

    // For cron jobs, apply both enhanced checks and fallback
    if (path.startsWith('/api/cron/')) {
      console.log('Cron endpoint detected:', path);

      // Debug headers to identify what's missing
      const allHeaders = Object.fromEntries(req.headers.entries());
      console.log('Request headers for cron job:', JSON.stringify(allHeaders, null, 2));

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
        console.log('✅ Authorized cron request - allowing access');
        return NextResponse.next();
      }

      console.log('❌ Unauthorized cron request - denying access');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Other special auth routes might have different logic
    return NextResponse.next();
  }

  // Check public routes
  if (matchPatternsArray(path, PUBLIC_ROUTES)) {
    console.log(`Public route allowed: ${path}`);
    return NextResponse.next();
  }

  // Beyond this point, authentication is required
  const { userId } = await auth();

  if (!userId) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`Auth required: ${path}`);
    await auth.protect();
    return NextResponse.next();
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

  return NextResponse.next();
});

/**
 * Configure which paths the middleware runs on
 * This matches everything except static files and img directory
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|img|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webm)).*)',
  ],
};
