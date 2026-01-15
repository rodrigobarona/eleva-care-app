import { getFumadocsLocale } from '@/lib/fumadocs-i18n';
import { docsOptions } from '@/lib/layout.shared';
import { getPortalSource, isValidPortal, type PortalKey } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Dynamic Portal Documentation Layout
 *
 * Single DocsLayout for all documentation portals (patient, expert, workspace, developer).
 * Uses sidebar tabs for switching between portals.
 *
 * Locale detection uses shared getFumadocsLocale() utility which follows
 * Fumadocs i18n pattern and works alongside next-intl.
 *
 * URL Structure (following next-intl as-needed pattern):
 * - English (default): /docs/patient (no locale prefix)
 * - Other locales: /pt/docs/patient → rewritten to /docs/patient with locale cookie
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
  const portals: PortalKey[] = ['patient', 'expert', 'workspace', 'developer'];
  return portals.map((portal) => ({ portal }));
}
