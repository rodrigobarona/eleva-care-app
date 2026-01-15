import { cookies, headers } from 'next/headers';

import {
  type FumadocsLanguage,
  type FumadocsLocale,
  getTranslations,
  i18n,
  isValidFumadocsLocale,
  translations,
} from './fumadocs-i18n.config';

// Re-export client-safe config
export { i18n, translations, getTranslations, isValidFumadocsLocale };
export type { FumadocsLanguage, FumadocsLocale };

/**
 * Fumadocs Server-side i18n Utilities
 *
 * This file contains server-only utilities for locale detection.
 * For client-safe config, import directly from fumadocs-i18n.config.ts.
 */

/**
 * Get locale for Fumadocs from cookie or header
 *
 * Locale detection priority (following Fumadocs i18n pattern):
 * 1. FUMADOCS_LOCALE cookie (set via /pt/help/* URLs by proxy middleware)
 * 2. x-fumadocs-locale header (set by proxy middleware during rewrite)
 * 3. NEXT_LOCALE cookie (set by next-intl for marketing pages - shared preference)
 * 4. Default to 'en' (i18n.defaultLanguage)
 *
 * This works alongside next-intl:
 * - Marketing routes use next-intl middleware with URL prefixes (/pt/about)
 * - Docs routes use Fumadocs with cookie/header-based locale detection
 * - Both share the NEXT_LOCALE cookie for consistent preference
 *
 * @see https://fumadocs.vercel.app/docs/headless/internationalization
 */
export async function getFumadocsLocale(): Promise<FumadocsLanguage> {
  const cookieStore = await cookies();
  const headerStore = await headers();

  // Priority 1: FUMADOCS_LOCALE cookie (set via /pt/help/* URLs)
  const fumadocsLocale = cookieStore.get('FUMADOCS_LOCALE')?.value;
  if (fumadocsLocale && isValidFumadocsLocale(fumadocsLocale)) {
    return fumadocsLocale;
  }

  // Priority 2: x-fumadocs-locale header (from proxy rewrite)
  const headerLocale = headerStore.get('x-fumadocs-locale');
  if (headerLocale && isValidFumadocsLocale(headerLocale)) {
    return headerLocale;
  }

  // Priority 3: NEXT_LOCALE cookie (from next-intl marketing pages)
  const nextLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (nextLocale && isValidFumadocsLocale(nextLocale)) {
    return nextLocale;
  }

  // Default to Fumadocs default language
  return i18n.defaultLanguage as FumadocsLanguage;
}
