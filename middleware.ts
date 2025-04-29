import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';

import { routing } from './lib/i18n/routing';

// Create the internationalization middleware using the routing config
const handleI18nRouting = createIntlMiddleware({
  locales: routing.locales,
  defaultLocale: routing.defaultLocale,
  localePrefix: routing.localePrefix,
  localeDetection: true,
});

// Define routes that REQUIRE authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/account(.*)',
  '/admin(.*)',
  '/onboarding(.*)',
  '/appointments(.*)',
  '/bookings(.*)',
]);

export default clerkMiddleware((auth, req) => {
  // Skip static assets (important to do this first)
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/img') ||
    req.nextUrl.pathname.includes('.') ||
    req.nextUrl.pathname.startsWith('/api')
  ) {
    return;
  }

  // For debugging
  console.log(`Processing Path: ${req.nextUrl.pathname}`);

  // Check if the route requires authentication
  if (isProtectedRoute(req)) {
    console.log(`Path ${req.nextUrl.pathname} is PROTECTED, checking auth...`);
    auth.protect();
  } else {
    console.log(`Path ${req.nextUrl.pathname} is PUBLIC.`);
  }

  // Apply internationalization handling AFTER potential auth check
  console.log(`Applying i18n routing for ${req.nextUrl.pathname}`);
  try {
    return handleI18nRouting(req);
  } catch (error) {
    console.error('Error in i18n middleware:', error);
    return NextResponse.next();
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|img|favicon.ico|.*\\..*).*)', '/(api|trpc)(.*)'],
};
