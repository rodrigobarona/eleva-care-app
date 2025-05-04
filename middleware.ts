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

/**
 * Check if the URL path already contains a valid locale
 */
function hasValidLocaleInPath(pathname: string): boolean {
  const segments = pathname.split('/');
  return segments.length > 1 && locales.includes(segments[1] as Locale);
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
    // Debug Accept-Language header to help with troubleshooting
    const acceptLanguage = req.headers.get('accept-language');
    console.log(`[middleware] Accept-Language header: ${acceptLanguage || 'none'}`);

    // Debug IP country from headers
    const ipCountry = req.headers.get('x-vercel-ip-country');
    console.log(`[middleware] IP Country: ${ipCountry || 'unknown'}`);

    // Check if the URL already contains a valid locale in the path
    // If it does, respect this choice and don't try to auto-detect
    if (hasValidLocaleInPath(pathname)) {
      const pathLocale = pathname.split('/')[1];
      console.log(
        `[middleware] Valid locale '${pathLocale}' found in URL path, respecting user's choice`,
      );
      return handleI18nRouting(req);
    }

    // Check for a cookie-based locale preference next
    const cookieLocale = req.cookies.get('ELEVA_LOCALE')?.value;
    if (cookieLocale) {
      console.log(`[middleware] Found locale cookie: ${cookieLocale}`);
      // Let next-intl middleware handle the cookie-based locale
      return handleI18nRouting(req);
    }

    // If no explicit locale in path or cookie exists, try to detect locale from headers
    // Get locale from Accept-Language header and Vercel geolocation headers
    const detectedLocale = detectLocaleFromHeaders(req.headers);

    if (detectedLocale) {
      console.log(`[middleware] Detected locale from headers: ${detectedLocale}`);

      if (detectedLocale !== defaultLocale) {
        // If we detected a supported non-default locale, add it to the URL
        // This will be picked up by next-intl middleware
        const url = req.nextUrl.clone();
        url.pathname = `/${detectedLocale}${pathnameWithoutLocale === '/' ? '' : pathnameWithoutLocale}`;
        console.log(
          `[middleware] Detected non-default locale ${detectedLocale}, redirecting to: ${url.pathname}`,
        );

        // Set the cookie to remember this locale
        const response = NextResponse.redirect(url);
        response.cookies.set('ELEVA_LOCALE', detectedLocale, {
          maxAge: 31536000, // 1 year
          path: '/',
        });
        return response;
      }
      console.log(`[middleware] Detected default locale ${detectedLocale}, no redirect needed`);
    } else {
      console.log('[middleware] Could not detect locale from headers, falling back to default');
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
