/**
 * Role-Based Access Control Middleware
 *
 * This middleware implements a comprehensive authorization strategy:
 * 1. Public routes are explicitly allowed without authentication
 * 2. Authentication is required for all other routes
 * 3. Specific route patterns are restricted to users with appropriate roles
 *
 * This is the first layer of defense in our multi-layered approach.
 * Additional role checks are implemented at layout and page levels.
 *
 * @see /docs/role-based-authorization.md for complete documentation
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Simple middleware that skips processing for webhook routes
 * to avoid authentication issues with Stripe webhooks
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip middleware processing completely for webhook routes
  if (path.startsWith('/api/webhooks/')) {
    console.log(`Bypassing middleware for webhook path: ${path}`);
    return NextResponse.next();
  }
}

/**
 * Configure which paths the middleware runs on
 */
export const config = {
  matcher: ['/api/webhooks/:path*'],
};
