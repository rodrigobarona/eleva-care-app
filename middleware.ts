import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';

import { locales } from './i18n/routing';

// Create the internationalization middleware
const intlMiddleware = createIntlMiddleware({
  // Locales from your i18n configuration
  locales,
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/about',
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
  // Include routes with locale prefixes
  ...locales.flatMap((locale) => publicRoutes.map((route) => `/${locale}${route}`)),
]);

// Combine Clerk auth and next-intl middleware
export default clerkMiddleware((auth, req) => {
  // Skip static assets
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/img') ||
    req.nextUrl.pathname.includes('.')
  ) {
    return;
  }

  // For public routes or API routes, don't require authentication
  if (isPublicRoute(req) || req.nextUrl.pathname.startsWith('/api')) {
    return intlMiddleware(req as unknown as NextRequest);
  }

  // For protected routes, require authentication
  return auth.protect().then(() => {
    return intlMiddleware(req as unknown as NextRequest);
  });
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|img|favicon.ico|.*\\.).*)'],
};
