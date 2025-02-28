import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { hasCompletedExpertOnboarding } from './lib/auth/expert-onboarding';
import { hasRole } from './lib/auth/roles';

// Define route matchers
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/about(.*)',
  '/api/webhooks(.*)',
  '/api/create-payment-intent(.*)',
  '/api/stripe(.*)',
  '/api/check-username(.*)',
  '/terms(.*)',
  '/privacy(.*)',
  '/contact(.*)',
  '/blog(.*)',
  '/unauthorized(.*)',
]);

const isExpertOnlyRoute = createRouteMatcher(['/expert-onboarding(.*)', '/expert(.*)']);

const isCompletedOnboardingRoute = createRouteMatcher([
  '/schedule(.*)',
  '/events(.*)',
  '/appointments(.*)',
]);

const isIdentityOrBillingRoute = createRouteMatcher([
  '/account/identity(.*)',
  '/account/billing(.*)',
]);

// Username and event slug paths matcher (e.g., /:username or /:username/:eventSlug)
const isUsernamePath = (path: string) => {
  return /^\/[a-zA-Z0-9_-]+(\/(([a-zA-Z0-9_-]+)\/success)?)?$/.test(path);
};

export default clerkMiddleware(
  async (auth, req) => {
    // Custom username/event slug paths are considered public
    if (isUsernamePath(req.nextUrl.pathname)) {
      return NextResponse.next();
    }

    // Allow public routes
    if (isPublicRoute(req)) {
      return NextResponse.next();
    }

    // For all protected routes, we need the user to be authenticated
    const session = await auth.protect();
    const { userId } = session;

    if (!userId) {
      // This shouldn't happen as auth.protect() already redirects,
      // but we include it for safety
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    // Check for expert-only routes
    if (isExpertOnlyRoute(req)) {
      const isTopExpert = await hasRole([userId], 'top_expert');
      const isCommunityExpert = await hasRole([userId], 'community_expert');
      const isExpert = isTopExpert || isCommunityExpert;

      if (!isExpert) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }

    // Check for routes requiring completed onboarding
    if (isCompletedOnboardingRoute(req)) {
      const isTopExpert = await hasRole([userId], 'top_expert');
      const isCommunityExpert = await hasRole([userId], 'community_expert');
      const isExpert = isTopExpert || isCommunityExpert;

      if (!isExpert) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }

      // Check if onboarding is complete
      const hasCompletedOnboarding = await hasCompletedExpertOnboarding(userId);
      if (!hasCompletedOnboarding) {
        return NextResponse.redirect(new URL('/expert-onboarding', req.url));
      }
    }

    // Redirect identity and billing to expert onboarding if not completed
    if (isIdentityOrBillingRoute(req)) {
      const isTopExpert = await hasRole([userId], 'top_expert');
      const isCommunityExpert = await hasRole([userId], 'community_expert');
      const isExpert = isTopExpert || isCommunityExpert;

      if (isExpert) {
        const hasCompletedOnboarding = await hasCompletedExpertOnboarding(userId);
        if (!hasCompletedOnboarding) {
          // Get the step name from the pathname
          const step = req.nextUrl.pathname.includes('identity') ? 'identity' : 'billing';
          return NextResponse.redirect(new URL(`/expert-onboarding/${step}`, req.url));
        }
      }
    }

    return NextResponse.next();
  },
  { debug: process.env.NODE_ENV === 'development' },
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
