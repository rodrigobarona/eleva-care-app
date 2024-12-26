import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { validateStripeConfig } from '@/lib/stripe';

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/:username", // Allow access to user profile pages like /barona
  "/:username/(.*)", // Allow access to all routes under username like /barona/event-name
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export function middleware() {
  // Validate Stripe configuration on startup
  validateStripeConfig();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
