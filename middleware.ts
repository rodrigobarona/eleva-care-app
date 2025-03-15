import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/unauthorized(.*)',
  '/:username', // Allow access to user profile pages like /barona
  '/:username/(.*)', // Allow access to all routes under username like /barona/event-name
  '/legal/(.*)', // Allow access to legal pages like /legal/privacy-policy
  '/api/webhook/clerk',
  '/api/webhook/stripe',
  '/api/keep-alive',
  '/explore',
  '/experts/:path*',
  '/blog/:path*',
  '/contact',
];

// Check if the current route is public
function isPublicRoute(path: string): boolean {
  return publicRoutes.some((route) => {
    if (route.includes('*')) {
      const routeWithoutWildcard = route.replace('*', '');
      return path.startsWith(routeWithoutWildcard);
    }
    if (route.includes('(.*)')) {
      const routeWithoutWildcard = route.replace('(.*)', '');
      return path.startsWith(routeWithoutWildcard);
    }
    if (route.startsWith('/:')) {
      const segments = path.split('/').filter(Boolean);
      return segments.length === 1;
    }
    return path === route;
  });
}

export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname;

  // Get auth info
  const { userId } = await auth();

  // If user is authenticated and trying to access the root path, redirect to home
  if (userId && path === '/') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Allow access to public routes
  if (isPublicRoute(path)) {
    return NextResponse.next();
  }

  // Standard authentication check for protected routes
  await auth.protect();

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
