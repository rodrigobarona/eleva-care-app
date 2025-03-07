import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define types for role-based access control
interface UserMetadata {
  role?: string | string[];
  [key: string]: unknown;
}

// Debug helper
function logDebug(prefix: string, value: unknown): void {
  console.log(`[DEBUG] ${prefix}:`, value);
}

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/unauthorized(.*)',
  '/:username', // Allow access to user profile pages like /barona
  '/:username/(.*)', // Allow access to all routes under username like /barona/event-name
  '/legal/(.*)', // Allow access to legal pages like /legal/privacy-policy
]);

// Define routes that require expert roles (community_expert and top_expert)
const isExpertRoute = createRouteMatcher([
  '/customers(.*)',
  '/events(.*)',
  '/schedule(.*)',
  '/expert(.*)',
  '/appointments(.*)',
  '/account/identity(.*)',
  '/account/billing(.*)',
]);

// Allowed roles for expert routes (lowercase for case-insensitive comparison)
const allowedRoles = ['community_expert', 'top_expert', 'admin', 'superadmin'].map((role) =>
  role.toLowerCase(),
);

export default clerkMiddleware(async (auth, req) => {
  logDebug('Path', req.nextUrl.pathname);

  const { userId } = await auth();

  // If user is authenticated and trying to access the root path, redirect to home
  if (userId && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Standard authentication check
  if (!isPublicRoute(req)) {
    await auth.protect();
  } else {
    // This is a public route, allow access
    return NextResponse.next();
  }

  // Role-based access control for expert routes
  if (userId && isExpertRoute(req)) {
    try {
      // Get the auth object and session claims
      const authObj = await auth();

      // Log the full auth object for debugging
      logDebug('Auth object', JSON.stringify(authObj, null, 2));

      // Get the metadata from session claims
      const claimsMetadata = authObj.sessionClaims?.metadata as UserMetadata | undefined;
      logDebug('Claims metadata', claimsMetadata);

      // Extract role from metadata
      const userRole = claimsMetadata?.role;
      logDebug('User role from metadata', userRole);

      // Check if role exists
      if (!userRole) {
        logDebug('No role found', 'Redirecting to unauthorized');
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }

      // Process roles to lowercase strings for comparison
      const normalizedRoles: string[] = [];

      if (Array.isArray(userRole)) {
        // If role is an array, add each value
        for (const role of userRole) {
          normalizedRoles.push(String(role).toLowerCase());
        }
      } else {
        // If role is a string or other value, convert to string
        normalizedRoles.push(String(userRole).toLowerCase());
      }

      logDebug('Normalized user roles', normalizedRoles);
      logDebug('Allowed roles', allowedRoles);

      // Check if the user has any allowed role
      const hasRequiredRole = normalizedRoles.some((role) => allowedRoles.includes(role));
      logDebug('Has required role', hasRequiredRole);

      if (!hasRequiredRole) {
        logDebug('Access denied', 'Redirecting to unauthorized');
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    } catch (error) {
      // If there's an error checking roles, redirect to unauthorized
      console.error('[ERROR] checking user roles:', error);
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  // If we got here, allow the request to proceed
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|api/webhooks|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Only run for specific API routes that need auth
    '/(api(?!/webhooks))(.*)',
  ],
};
