import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'es', 'pt', 'pt-BR'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale = 'en' as const;

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Use as-needed to only show locale prefix for non-default locales
  localePrefix: 'as-needed',
  // Using the same paths across all locales for simplicity
  pathnames: {
    // ----------------
    // Static routes first (higher priority)
    // ----------------
    '/': '/',
    '/about': '/about',
    '/dashboard': '/dashboard',
    '/sign-in': '/sign-in',
    '/sign-up': '/sign-up',
    '/legal': '/legal',
    '/legal/privacy': '/legal/privacy',
    '/legal/terms': '/legal/terms',
    '/legal/cookie': '/legal/cookie',
    '/legal/dpa': '/legal/dpa',
    '/legal/payment-policies': '/legal/payment-policies',
    '/legal/practitioner-agreement': '/legal/practitioner-agreement',
    '/legal/security': '/legal/security',
    '/help': '/help',
    '/contact': '/contact',
    '/community': '/community',
    '/services/pregnancy': '/services/pregnancy',
    '/services/postpartum': '/services/postpartum',
    '/services/menopause': '/services/menopause',

    // ----------------
    // Dynamic routes last (lower priority)
    // ----------------
    '/[username]': '/[username]',
    '/[username]/[eventSlug]': '/[username]/[eventSlug]',
    '/[username]/[eventSlug]/success': '/[username]/[eventSlug]/success',
    '/[username]/[eventSlug]/payment-processing': '/[username]/[eventSlug]/payment-processing',
  },
});

/**
 * Get the consistent path for any locale
 * This version always returns the same path regardless of locale
 * @param path - The path
 * @returns The original path
 */
export function getLocalizedPath(path: string): string {
  return path;
}

/**
 * Check if a path is a static route rather than a dynamic route
 * @param path - The path to check
 * @returns boolean indicating if the path is a static route
 */
export function isStaticRoute(path: string): boolean {
  return !path.includes('[') && !path.includes(']');
}
