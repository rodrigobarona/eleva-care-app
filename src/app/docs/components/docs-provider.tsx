'use client';

import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import DocsSearchDialog from './search-dialog';

/**
 * Documentation Provider
 *
 * Client component wrapper for RootProvider that configures:
 * - Custom search dialog with portal tag filtering
 * - Theme support (light/dark mode)
 *
 * This is needed because RootProvider's search.SearchDialog prop
 * requires a client component to pass function references.
 *
 * @see https://fumadocs.vercel.app/docs/ui/layouts/root-provider
 */
export function DocsProvider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{
        SearchDialog: DocsSearchDialog,
      }}
    >
      {children}
    </RootProvider>
  );
}

