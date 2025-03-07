import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define types for role-based access control
interface UserMetadata {
  role?: string | string[];
  [key: string]: unknown;
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
const isExpertRoute = createRouteMatcher([]);

// Allowed roles for expert routes (converted to lowercase for case-insensitive comparison)
const allowedRoles = ['community_expert', 'top_expert', 'admin', 'superadmin'].map((role) =>
  role.toLowerCase(),
);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // If user is authenticated and trying to access the root path, redirect to home
  if (userId && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Standard authentication check
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // Role-based access control for expert routes
  if (userId && isExpertRoute(req)) {
    try {
      // Get the auth object with user data
      const authObj = await auth();

      // Log session claims to help debug
      console.log('Session claims:', authObj.sessionClaims);

      // Get the metadata with proper typing - public metadata is in sessionClaims.user_metadata
      // In Clerk v6, publicMetadata is accessed through sessionClaims
      const metadata = authObj.sessionClaims?.metadata as UserMetadata;

      // Log the metadata to help debug
      console.log('User metadata:', metadata);
      console.log('User role:', metadata?.role);

      // Check if user exists and has a role
      if (!metadata?.role) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }

      // Get the user role (string or array) and convert to lowercase for case-insensitive comparison
      const userRole = metadata.role;
      const userRoles = Array.isArray(userRole)
        ? userRole.map((r) => String(r).toLowerCase())
        : [String(userRole).toLowerCase()];

      // Log the processed roles for debugging
      console.log('User roles after processing:', userRoles);
      console.log('Allowed roles:', allowedRoles);

      // Check if user has any of the allowed roles
      const hasRequiredRole = userRoles.some((role) => allowedRoles.includes(role));

      console.log('Has required role:', hasRequiredRole);

      if (!hasRequiredRole) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    } catch (error) {
      // If there's an error checking roles, redirect to unauthorized
      console.error('Error checking user roles:', error);
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|api/webhooks|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Only run for specific API routes that need auth
    '/(api(?!/webhooks))(.*)',
  ],
};
