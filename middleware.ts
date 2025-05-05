import { defaultLocale, locales } from '@/lib/i18n';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
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

  // Skip middleware for public files and Next.js internals
  if (/\.(.*)$/.test(pathname) || pathname.startsWith('/_next') || pathname.includes('/api/')) {
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
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
