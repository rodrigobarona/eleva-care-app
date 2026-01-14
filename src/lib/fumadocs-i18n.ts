import { defineI18n } from 'fumadocs-core/i18n';
import { cookies, headers } from 'next/headers';

/**
 * Fumadocs i18n Configuration
 *
 * Configures internationalization for Fumadocs content.
 * This works alongside next-intl which handles UI translations.
 *
 * hideLocale: 'default-locale' means:
 * - English (default): /docs/expert (no prefix)
 * - Other locales: /pt/docs/expert → rewritten to /docs/expert with cookie
 *
 * This follows the Fumadocs recommended pattern for i18n:
 * @see https://fumadocs.vercel.app/docs/headless/internationalization
 *
 * Supported locales:
 * - en: English (default)
 * - es: Spanish
 * - pt: Portuguese (Portugal)
 * - pt-BR: Portuguese (Brazil)
 */
export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'es', 'pt', 'pt-BR'],
  hideLocale: 'default-locale',
});

/**
 * Language type from Fumadocs i18n config
 */
export type FumadocsLanguage = (typeof i18n.languages)[number];

/**
 * Validate locale is supported by Fumadocs
 */
export function isValidFumadocsLocale(locale: string): locale is FumadocsLanguage {
  return i18n.languages.includes(locale as FumadocsLanguage);
}

/**
 * Get locale for Fumadocs from cookie or header
 *
 * Locale detection priority (following Fumadocs i18n pattern):
 * 1. FUMADOCS_LOCALE cookie (set via /pt/docs/* URLs by proxy middleware)
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

  // Priority 1: FUMADOCS_LOCALE cookie (set via /pt/docs/* URLs)
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

/**
 * UI Translations for Fumadocs Components
 *
 * These translations are used by Fumadocs UI components
 * like search, table of contents, and navigation.
 */
export const translations = {
  en: {
    displayName: 'English',
    search: 'Search documentation...',
    searchNoResults: 'No results found',
    toc: 'On this page',
    editPage: 'Edit this page',
    lastUpdated: 'Last updated',
    nextPage: 'Next',
    previousPage: 'Previous',
    backToTop: 'Back to top',
  },
  es: {
    displayName: 'Español',
    search: 'Buscar documentación...',
    searchNoResults: 'No se encontraron resultados',
    toc: 'En esta página',
    editPage: 'Editar esta página',
    lastUpdated: 'Última actualización',
    nextPage: 'Siguiente',
    previousPage: 'Anterior',
    backToTop: 'Volver arriba',
  },
  pt: {
    displayName: 'Português',
    search: 'Pesquisar documentação...',
    searchNoResults: 'Nenhum resultado encontrado',
    toc: 'Nesta página',
    editPage: 'Editar esta página',
    lastUpdated: 'Última atualização',
    nextPage: 'Próximo',
    previousPage: 'Anterior',
    backToTop: 'Voltar ao topo',
  },
  'pt-BR': {
    displayName: 'Português (Brasil)',
    search: 'Pesquisar documentação...',
    searchNoResults: 'Nenhum resultado encontrado',
    toc: 'Nesta página',
    editPage: 'Editar esta página',
    lastUpdated: 'Última atualização',
    nextPage: 'Próximo',
    previousPage: 'Anterior',
    backToTop: 'Voltar ao topo',
  },
} as const;

/**
 * Type for supported locales (from translations)
 */
export type FumadocsLocale = keyof typeof translations;

/**
 * Get translations for a specific locale
 */
export function getTranslations(locale: string) {
  return translations[locale as FumadocsLocale] ?? translations.en;
}

