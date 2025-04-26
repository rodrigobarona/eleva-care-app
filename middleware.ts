import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { routing } from './i18n/routing';
import { defaultLocale, locales } from './i18n/routing';
import type { Locale } from './i18n/routing';

// Create the next-intl middleware with our centralized routing configuration
const intlMiddleware = createMiddleware(routing);

// Define which routes should be public
const publicRoutes = [
  // Public static pages
  '/',
  '/about',
  '/legal/privacy',
  '/legal/terms',
  // Username routes (public profiles and booking)
  '/[username]',
  '/[username]/[eventSlug]',
  '/[username]/[eventSlug]/success',
  '/[username]/[eventSlug]/payment-processing',
];

// Non-default locales that will have a prefix
// Use explicit type assertions to help TypeScript narrow the types
const nonDefaultLocales: Array<Exclude<Locale, typeof defaultLocale>> = locales.filter(
  (locale): locale is Exclude<Locale, typeof defaultLocale> => locale !== defaultLocale,
);

// Create a route matcher for public routes (with and without locale prefix)
const isPublicRoute = createRouteMatcher([
  // Include routes without locale prefix (base routes)
  ...publicRoutes,
  // Include routes with locale prefixes from routing config
  ...routing.locales.flatMap((locale) => publicRoutes.map((route) => `/${locale}${route}`)),
]);

// Function to check if a pathname matches dynamic routes with real values
function matchesDynamicRoute(pathname: string, pattern: string): boolean {
  // Replace dynamic parts with regex patterns
  const normalizedPattern = pattern
    .replace(/\[username\]/g, '([\\w-]+)')
    .replace(/\[eventSlug\]/g, '([\\w-]+)');

  // Create a regex with start/end anchors
  const regex = new RegExp(`^${normalizedPattern.replace(/\//g, '\\/')}$`);
  return regex.test(pathname);
}

// Check if the path is a username route
function isUsernameRoute(pathname: string): boolean {
  // Simple check: path with single segment and no special characters
  const usernamePattern = /^\/[\w-]+\/?$/;
  return usernamePattern.test(pathname);
}

// Extract username from the path
function extractUsername(pathname: string): string {
  return pathname.replace(/^\//, '').replace(/\/$/, '');
}

// Middleware for handling locale-specific logic
function handleLocalizedPaths(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip static assets, API routes, etc.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/img') ||
    pathname.includes('.')
  ) {
    return null;
  }

  // Check if this is already a localized path
  const hasLocalePrefix = nonDefaultLocales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  // If it's already localized, let next-intl handle it
  if (hasLocalePrefix) {
    return null;
  }

  // For non-localized paths, get user's preferred locale from cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE');
  const preferredLocale = localeCookie?.value as Locale | undefined;

  // Check if preferredLocale is a non-default locale
  const isNonDefaultLocale = preferredLocale && preferredLocale !== defaultLocale;

  // If user prefers a non-default locale, redirect to that locale version
  if (isNonDefaultLocale) {
    // Special handling for the root path
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = `/${preferredLocale}`;
      return NextResponse.redirect(url);
    }

    // Check if this is a known route pattern
    for (const route of publicRoutes) {
      if (route === '/') continue; // Root already handled

      if (matchesDynamicRoute(pathname, route)) {
        const url = request.nextUrl.clone();
        url.pathname = `/${preferredLocale}${pathname}`;
        return NextResponse.redirect(url);
      }
    }
  }

  // No redirection needed, continue with the current path
  return null;
}

/**
 * Middleware for the application:
 * 1. Process i18n routing for locale detection and redirects
 * 2. Allow public routes without authentication
 * 3. Require authentication for all other routes
 * 4. Restrict specific route patterns to users with roles
 * 5. Allow webhook routes to bypass authentication
 */
export default clerkMiddleware(async (auth, req) => {
  // First, check if we need to redirect based on user's preferred locale
  const redirectResponse = handleLocalizedPaths(req);
  if (redirectResponse) return redirectResponse;

  // Check if it's a public route that needs to be handled
  if (isPublicRoute(req)) {
    // Handle i18n routing for public routes
    return intlMiddleware(req);
  }

  // Skip static assets, API routes, etc.
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/api') ||
    req.nextUrl.pathname.startsWith('/img') ||
    req.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Protect all other routes
  await auth.protect();

  // After protection, also apply i18n middleware to handle localization for authenticated routes
  return intlMiddleware(req);
});

export const config = {
  // Match all request paths except for static files and specific extensions
  matcher: [
    // Match all paths except _next, img, static files and API routes
    '/((?!_next/static|_next/image|img|favicon.ico|.*\\.).*)',
  ],
};
