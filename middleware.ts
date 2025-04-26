import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';

import { locales } from './i18n/routing';

// Create the internationalization middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/about',
  '/legal',
  '/legal/privacy',
  '/legal/terms',
  '/sign-in',
  '/sign-up',
  '/[username]',
  '/[username]/[eventSlug]',
  '/[username]/[eventSlug]/success',
  '/[username]/[eventSlug]/payment-processing',
];

// Create a route matcher for public routes
const isPublicRoute = createRouteMatcher([
  ...publicRoutes,
  // Create patterns for localized routes
  ...locales.map((locale) => `/${locale}`), // Add explicit locale root paths
  ...locales.flatMap((locale) =>
    publicRoutes.map((route) => (route === '/' ? `/${locale}` : `/${locale}${route}`)),
  ),
]);

// Use Clerk middleware with next-intl
export default clerkMiddleware((auth, req) => {
  // Skip static assets
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/img') ||
    req.nextUrl.pathname.includes('.')
  ) {
    return;
  }

  // Check if this is a public route or API route
  const isPublic = isPublicRoute(req) || req.nextUrl.pathname.startsWith('/api');

  // For debugging
  console.log(`Path: ${req.nextUrl.pathname}, Public: ${isPublic}`);

  if (isPublic) {
    // Apply internationalization for public routes
    try {
      // @ts-expect-error - Type mismatch between Clerk and next-intl
      return intlMiddleware(req);
    } catch (error) {
      console.error('Error in i18n middleware:', error);
      return NextResponse.next();
    }
  }

  // For protected routes, require authentication
  return auth.protect().then(() => {
    try {
      // @ts-expect-error - Type mismatch between Clerk and next-intl
      return intlMiddleware(req);
    } catch (error) {
      console.error('Error in i18n middleware after auth:', error);
      return NextResponse.next();
    }
  });
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|img|favicon.ico|.*\\.).*)'],
};
