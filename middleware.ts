import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';

import { defaultLocale, locales, routing } from './lib/i18n/routing';
import type { Locale } from './lib/i18n/routing';
import { detectLocaleFromHeaders } from './lib/i18n/utils';

// Create the internationalization middleware
const handleI18nRouting = createMiddleware({
  locales: routing.locales,
  defaultLocale: routing.defaultLocale,
  localePrefix: routing.localePrefix,
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

// List of static paths to check against to prioritize over dynamic routes
const staticPaths = Object.keys(routing.pathnames).filter((path) => !path.includes('['));

// Legal document types supported by the application
const legalDocuments = ['terms', 'privacy', 'cookie', 'dpa'];

/**
 * Check if the requested path corresponds to a known static route
 * This helps prioritize static routes over dynamic routes
 */
function isStaticRoute(pathname: string): boolean {
  // Get pathname without locale prefix
  const pathnameWithoutLocale = getPathnameWithoutLocale(pathname);

  // Check if the path matches any of our static paths
  return staticPaths.some((path) => path === pathnameWithoutLocale);
}

/**
 * Handle /legal routes with or without a specific document
 * @param pathname The pathname without locale prefix
 * @returns The pathname to redirect to or null if no redirection needed
 */
function handleLegalRoutes(pathname: string, url: URL): NextResponse | null {
  // If it's exactly /legal, redirect to /legal/terms as the default
  if (pathname === '/legal') {
    const locale = url.pathname.split('/')[1];
    const isValidLocale = locales.includes(locale as Locale);

    // Preserve locale in the redirect if it exists
    const basePath = isValidLocale ? `/${locale}` : '';
    const redirectUrl = new URL(`${basePath}/legal/terms`, url.origin);
    console.log(`[middleware] Redirecting /legal to default document: ${redirectUrl.pathname}`);
    return NextResponse.redirect(redirectUrl);
  }

  // Check if it's a legal path with a document (e.g., /legal/terms)
  if (pathname.startsWith('/legal/')) {
    const document = pathname.split('/')[2];

    // If the document is not valid, redirect to the default
    if (!document || !legalDocuments.includes(document)) {
      const locale = url.pathname.split('/')[1];
      const isValidLocale = locales.includes(locale as Locale);

      // Preserve locale in the redirect if it exists
      const basePath = isValidLocale ? `/${locale}` : '';
      const redirectUrl = new URL(`${basePath}/legal/terms`, url.origin);
      console.log(
        `[middleware] Redirecting invalid legal document to default: ${redirectUrl.pathname}`,
      );
      return NextResponse.redirect(redirectUrl);
    }
  }

  return null;
}

export default clerkMiddleware((auth, req) => {
  const pathname = req.nextUrl.pathname;

  // Skip static assets ONLY
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/img') ||
    pathname.includes('.') // Match files with extensions
  ) {
    console.log(`[middleware] Skipping static asset: ${pathname}`);
    return;
  }

  // --- API Route Handling ---
  if (pathname.startsWith('/api')) {
    console.log(`[middleware] Processing API Path: ${pathname}`);
    // Allow request to proceed to the API handler.
    return NextResponse.next();
  }

  // --- Web Page Handling ---
  console.log(`[middleware] Processing path: ${pathname}`);

  // Get the pathname without locale prefix (if any) to help with matching
  const pathnameWithoutLocale = getPathnameWithoutLocale(pathname);
  console.log(`[middleware] Pathname without locale: ${pathnameWithoutLocale}`);

  // Handle legal routes specially
  if (pathnameWithoutLocale === '/legal' || pathnameWithoutLocale.startsWith('/legal/')) {
    const legalRouteResponse = handleLegalRoutes(pathnameWithoutLocale, req.nextUrl);
    if (legalRouteResponse) {
      return legalRouteResponse;
    }
  }

  // IMPORTANT: First check if this is a static route to prioritize it over dynamic routes
  const isKnownStaticRoute = isStaticRoute(pathname);
  if (isKnownStaticRoute) {
    console.log(`[middleware] Identified as static path: ${pathname}`);
  }

  // Check if the PAGE route requires authentication
  if (isProtectedRoute(req)) {
    console.log(`[middleware] Path ${pathname} is PROTECTED, checking auth...`);
    auth.protect(); // Handles redirect to sign-in if needed for pages
  } else {
    console.log(`[middleware] Path ${pathname} is PUBLIC.`);
  }

  // Apply internationalization handling ONLY for web pages
  console.log(`[middleware] Applying i18n routing for ${pathname}`);
  try {
    // Check for a cookie-based locale preference first
    const cookieLocale = req.cookies.get('ELEVA_LOCALE')?.value;

    // If no cookie exists, try to detect locale from headers
    if (!cookieLocale) {
      // Get locale from Accept-Language header and Vercel geolocation headers
      const detectedLocale = detectLocaleFromHeaders(req.headers);

      if (detectedLocale && detectedLocale !== defaultLocale) {
        // If we detected a supported non-default locale, add it to the URL
        // This will be picked up by next-intl middleware
        const url = req.nextUrl.clone();
        url.pathname = `/${detectedLocale}${pathnameWithoutLocale === '/' ? '' : pathnameWithoutLocale}`;
        console.log(
          `[middleware] Detected locale ${detectedLocale}, redirecting to: ${url.pathname}`,
        );

        // Set the cookie to remember this locale
        const response = NextResponse.redirect(url);
        response.cookies.set('ELEVA_LOCALE', detectedLocale, {
          maxAge: 31536000, // 1 year
          path: '/',
        });
        return response;
      }
    }

    const response = handleI18nRouting(req);

    // Log information about redirect
    const location = response.headers.get('location');
    if (location) {
      console.log(`[middleware] Redirecting to: ${location}`);
    }

    return response;
  } catch (error) {
    console.error('[middleware] Error in i18n middleware:', error);
    return NextResponse.next();
  }
});

// Helper function to strip locale prefix from pathname
function getPathnameWithoutLocale(pathname: string): string {
  const segments = pathname.split('/');
  // If the first segment is a locale, remove it
  if (segments.length > 1 && locales.includes(segments[1] as Locale)) {
    return `/${segments.slice(2).join('/')}`;
  }
  return pathname;
}

// Matcher needs to include /api routes for the middleware function to run
export const config = {
  // Skip all static assets and explicitly include API/TRPC routes
  matcher: ['/((?!_next/static|_next/image|img|favicon.ico|.*\\..*).*)', '/(api|trpc)(.*)'],
};
