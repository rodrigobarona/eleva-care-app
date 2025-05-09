import { ADMIN_ROLES } from '@/lib/constants/roles';
import { defaultLocale, locales } from '@/lib/i18n';
import { clerkClient, clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

// Create internationalization middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  // Enable automatic locale detection
  localeDetection: true,
  // Configure the cookie for persistent locale preference
  localeCookie: {
    // One year in seconds for persistent preference across visits
    maxAge: 31536000,
    // Name can be customized if needed
    name: 'ELEVA_LOCALE',
  },
});

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/', // Homepage
  '/about', // About page
  '/legal/(.*)', // Legal pages
  '/services/(.*)', // Services pages
  '/help', // Help
  '/contact', // Contact
  '/community', // Community
  '/sign-in(.*)', // Sign in
  '/sign-up(.*)', // Sign up
  '/unauthorized(.*)', // Unauthorized
  '/([^/]+)', // Username routes
  '/([^/]+)/([^/]+)', // Username/eventSlug routes
  '/([^/]+)/([^/]+)/(.*)', // Username/eventSlug/subpages
]);

// Define admin routes that require admin role
const isAdminRoute = createRouteMatcher([
  '/admin(.*)', // Admin dashboard and subpages
  '/api/admin(.*)', // Admin API routes
]);

// Define routes that should not use i18n (private routes)
const isPrivateRoute = createRouteMatcher([
  '/dashboard(.*)', // Dashboard
  '/setup(.*)', // Setup
  '/account(.*)', // Account
  '/appointments(.*)', // Appointments
  '/booking(.*)', // Booking
  '/admin(.*)', // Admin
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Skip middleware for public files, Next.js internals, and webhook routes
  if (
    /\.(.*)$/.test(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/webhooks/') ||
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/api/qstash/') ||
    pathname.startsWith('/api/internal/') ||
    pathname.startsWith('/api/healthcheck/') ||
    pathname.startsWith('/api/create-payment-intent')
  ) {
    return NextResponse.next();
  }

  // Special handling for admin routes
  if (isAdminRoute(request)) {
    console.log('Admin route detected:', pathname);

    // Protect admin routes
    const { userId } = await auth();
    if (!userId) {
      console.warn('Admin route access attempt without authentication');
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    try {
      // Get user metadata directly using clerkClient
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(userId);
      const userRoles = user.publicMetadata.role;

      console.log('User roles for admin route:', JSON.stringify(userRoles));

      let isUserAdmin = false;
      if (Array.isArray(userRoles)) {
        isUserAdmin = userRoles.some((role) =>
          ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]),
        );
      } else if (typeof userRoles === 'string') {
        isUserAdmin = ADMIN_ROLES.includes(userRoles as (typeof ADMIN_ROLES)[number]);
      }

      if (!isUserAdmin) {
        console.warn(`Non-admin user ${userId} attempted to access admin route ${pathname}`);
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    return NextResponse.next();
  }

  // Handle authentication for non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect();
  } else {
    // For public routes, check if user is authenticated and trying to access auth pages
    const { userId } = await auth();
    const isAuthenticated = !!userId;

    // If authenticated user tries to access sign-in/sign-up, redirect to dashboard
    if (isAuthenticated && (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up'))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // For private routes, don't use i18n middleware
  if (isPrivateRoute(request)) {
    return NextResponse.next();
  }

  // Apply i18n middleware to all other routes
  return intlMiddleware(request);
});

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - _next/static    (Next.js static files)
    // - _next/image     (Next.js image optimization files)
    // - favicon.ico, robots.txt, etc. (static files)
    // - api/webhooks/   (webhook endpoints)
    // - api/cron/       (scheduled jobs endpoints)
    // - api/qstash/     (qstash verification endpoint)
    // - api/internal/   (internal services communication)
    // - api/healthcheck/ (health monitoring endpoints)
    // - api/create-payment-intent (payment processing endpoint)
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/webhooks/|api/cron/|api/qstash/|api/internal/|api/healthcheck/|api/create-payment-intent).*)',
  ],
};
