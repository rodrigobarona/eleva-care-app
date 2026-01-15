'use client';

import { i18n, translations, type FumadocsLocale } from '@/lib/fumadocs-i18n.config';
import { defineI18nUI } from 'fumadocs-ui/i18n';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import HelpSearchDialog from './search-dialog';

interface DocsProviderProps {
  children: ReactNode;
  locale: FumadocsLocale;
}

/**
 * Documentation Provider
 *
 * Client component wrapper for RootProvider that configures:
 * - Fumadocs i18n provider for UI translations
 * - Custom search dialog with portal tag filtering
 * - Theme support (light/dark mode)
 *
 * This is needed because RootProvider's search.SearchDialog prop
 * requires a client component to pass function references.
 *
 * @see https://fumadocs.vercel.app/docs/ui/layouts/root-provider
 * @see https://fumadocs.vercel.app/docs/ui/internationalization
 */
export function DocsProvider({ children, locale }: DocsProviderProps) {
  // Create Fumadocs i18n provider for the current locale
  const { provider } = defineI18nUI(i18n, { translations });
  const fumadocsI18n = provider(locale);

  return (
    <RootProvider
      i18n={fumadocsI18n}
      search={{
        SearchDialog: HelpSearchDialog,
      }}
    >
      {children}
    </RootProvider>
  );
}

