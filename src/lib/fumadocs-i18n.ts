import { defineI18n } from 'fumadocs-core/i18n';

/**
 * Fumadocs i18n Configuration
 *
 * Configures internationalization for Fumadocs content.
 * This works alongside next-intl which handles UI translations.
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
 * Type for supported locales
 */
export type FumadocsLocale = keyof typeof translations;

/**
 * Get translations for a specific locale
 */
export function getTranslations(locale: string) {
  return translations[locale as FumadocsLocale] ?? translations.en;
}


