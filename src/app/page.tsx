/**
 * Root Page - Let next-intl middleware handle locale routing
 *
 * This file should not exist in a next-intl setup with localePrefix: 'as-needed'.
 * The root path "/" is automatically handled by next-intl middleware, which:
 * 1. Detects the user's locale from headers/cookies
 * 2. Serves the default locale (en) WITHOUT showing /en in the URL
 * 3. Only shows locale prefix for non-default locales (e.g., /es, /pt)
 *
 * However, we need this file to prevent 404 errors when Next.js tries to
 * render the root route before middleware runs.
 *
 * Solution: Return null and let middleware handle everything.
 */
export default function RootPage() {
  // Return null - middleware will handle the request before this renders
  return null;
}

