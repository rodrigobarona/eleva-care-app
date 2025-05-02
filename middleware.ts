import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';

import { routing } from './lib/i18n/routing';

// Create the internationalization middleware
const handleI18nRouting = createMiddleware({
  locales: routing.locales,
  defaultLocale: routing.defaultLocale,
  localePrefix: routing.localePrefix,
  // Turn off automatic detection - prioritize explicit user selection
  localeDetection: false,
  // Configure the cookie for persistent locale preference
  localeCookie: {
    // One year in seconds for persistent preference across visits
    maxAge: 31536000,
    // Name can be customized if needed
    name: 'ELEVA_LOCALE',
  },
});

// Define routes that REQUIRE authentication (primarily for PAGE protection)
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)', // Protect dashboard and its sub-routes
  '/account(.*)',
  '/admin(.*)',
  '/onboarding(.*)',
  '/appointments(.*)',
  '/bookings(.*)',
  // Add specific API routes here IF you want middleware to block them when logged out
  '/api/admin/(.*)',
  '/api/users/(.*)',
  '/api/settings/(.*)',
]);

export default clerkMiddleware((auth, req) => {
  const pathname = req.nextUrl.pathname;

  // Skip static assets ONLY
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/img') ||
    pathname.includes('.') // Match files with extensions
  ) {
    return;
  }

  // --- API Route Handling ---
  if (pathname.startsWith('/api')) {
    console.log(`Processing API Path: ${pathname}`);
    // Optional: Protect specific API routes via middleware if desired
    // if (isProtectedRoute(req)) { // Check if this API route is in the protected list
    //   console.log(`API Path ${pathname} is PROTECTED, checking auth...`);
    //   auth.protect(); // Will redirect or error if unauthenticated
    // } else {
    //   console.log(`API Path ${pathname} is treated as PUBLIC by middleware.`);
    // }

    // Allow request to proceed to the API handler.
    // Auth checks should happen INSIDE the API handler using auth().userId etc.
    // Crucially, DO NOT run next-intl middleware for API routes.
    return NextResponse.next();
  }

  // --- Web Page Handling ---
  console.log(`Processing Page Path: ${pathname}`);

  // Check if the PAGE route requires authentication
  if (isProtectedRoute(req)) {
    console.log(`Page Path ${pathname} is PROTECTED, checking auth...`);
    auth.protect(); // Handles redirect to sign-in if needed for pages
  } else {
    console.log(`Page Path ${pathname} is PUBLIC.`);
  }

  // Apply internationalization handling ONLY for web pages
  console.log(`Applying i18n routing for ${pathname}`);
  try {
    return handleI18nRouting(req);
  } catch (error) {
    console.error('Error in i18n middleware:', error);
    return NextResponse.next();
  }
});

// Matcher needs to include /api routes for the middleware function to run
export const config = {
  matcher: ['/((?!_next/static|_next/image|img|favicon.ico|.*\\..*).*)', '/(api|trpc)(.*)'],
};
