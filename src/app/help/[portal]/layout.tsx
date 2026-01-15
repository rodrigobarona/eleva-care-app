import { getFumadocsLocale } from '@/lib/fumadocs-i18n';
import { docsOptions } from '@/lib/layout.shared';
import { getPortalSource, isValidPortal, type PortalKey } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Dynamic Portal Help Center Layout
 *
 * Single DocsLayout for all help center portals (patient, expert, workspace).
 * Uses sidebar tabs for switching between portals.
 *
 * Locale detection uses shared getFumadocsLocale() utility which follows
 * Fumadocs i18n pattern and works alongside next-intl.
 *
 * URL Structure (following next-intl as-needed pattern):
 * - English (default): /help/patient (no locale prefix)
 * - Other locales: /pt/help/patient → rewritten to /help/patient with locale cookie
 *
 * @see https://fumadocs.vercel.app/docs/headless/internationalization
 * @see https://fumadocs.vercel.app/docs/ui/layouts/docs
 */

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ portal: string }>;
}

export default async function PortalDocsLayout({ children, params }: LayoutProps) {
  const { portal } = await params;

  if (!isValidPortal(portal)) {
    notFound();
  }

  const source = getPortalSource(portal);
  const locale = await getFumadocsLocale();
  const tree = source.pageTree[locale] ?? source.pageTree.en;

  return (
    <DocsLayout tree={tree} {...docsOptions(locale)}>
      {children}
    </DocsLayout>
  );
}

/**
 * Generate static params for all portals
 */
export function generateStaticParams() {
  const portals: PortalKey[] = ['patient', 'expert', 'workspace'];
  return portals.map((portal) => ({ portal }));
}
