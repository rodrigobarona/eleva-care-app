import * as Sentry from '@sentry/nextjs';
import { getFumadocsLocale } from '@/lib/fumadocs-i18n';
import { getPortalSource, isValidPortal, type PortalKey } from '@/lib/source';
import { docsMdxComponents } from '../../mdx-components';
import type { TOCItemType } from 'fumadocs-core/toc';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/docs/page';
import type { MDXContent } from 'mdx/types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * Dynamic Portal Documentation Page
 *
 * Renders MDX content for any documentation portal.
 * Portal is determined by the [portal] route segment.
 *
 * Locale detection uses shared getFumadocsLocale() utility which follows
 * Fumadocs i18n pattern and works alongside next-intl.
 *
 * URL Structure (following next-intl as-needed pattern):
 * - English (default): /docs/patient (no locale prefix)
 * - Other locales: /pt/docs/patient → rewritten to /docs/patient with locale cookie
 *
 * @see https://fumadocs.vercel.app/docs/headless/internationalization
 * @see https://fumadocs.vercel.app/docs/ui/layouts/page
 */

interface PageProps {
  params: Promise<{
    portal: string;
    slug?: string[];
  }>;
}

interface PageData {
  title: string;
  description?: string;
  body: MDXContent;
  toc: TOCItemType[];
}

const portalTitles: Record<PortalKey, string> = {
  patient: 'Patient Help Center',
  expert: 'Expert Resources',
  workspace: 'Workspace Portal',
  developer: 'Developer API',
};

export default async function PortalDocsPage({ params }: PageProps) {
  const { portal, slug } = await params;

  if (!isValidPortal(portal)) {
    notFound();
  }

  const source = getPortalSource(portal);
  const locale = await getFumadocsLocale();
  const pagePath = slug ? `/docs/${portal}/${slug.join('/')}` : `/docs/${portal}`;

  // Sentry tracking
  Sentry.setTag('docs.portal', portal);
  Sentry.setTag('docs.page', pagePath);
  Sentry.setTag('docs.locale', locale);

  Sentry.addBreadcrumb({
    category: 'docs.navigation',
    message: `Viewing ${portal} docs: ${pagePath}`,
    level: 'info',
    data: { portal, slug: slug?.join('/') || 'index', locale },
  });

  // For index pages, pass empty array instead of undefined
  const slugArray = slug ?? [];

  // Pass slug and locale separately - Fumadocs handles locale internally
  const page = source.getPage(slugArray, locale);

  if (!page) {
    Sentry.addBreadcrumb({
      category: 'docs.error',
      message: `Documentation page not found: ${pagePath}`,
      level: 'warning',
      data: { slug, locale },
    });
    notFound();
  }

  const data = page.data as unknown as PageData;
  const MDXContent = data.body;

  Sentry.setContext('documentation_page', {
    title: data.title,
    description: data.description,
    path: pagePath,
    portal,
    locale,
    tocItems: data.toc?.length || 0,
  });

  return (
    <DocsPage toc={data.toc}>
      <DocsTitle>{data.title}</DocsTitle>
      {data.description && <DocsDescription>{data.description}</DocsDescription>}
      <DocsBody>
        <MDXContent components={docsMdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  const portals: PortalKey[] = ['patient', 'expert', 'workspace', 'developer'];
  const allParams: { portal: string; slug?: string[] }[] = [];

  for (const portal of portals) {
    const source = getPortalSource(portal);
    const params = source.generateParams();

    for (const { slug } of params) {
      allParams.push({ portal, slug });
    }
  }

  return allParams;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { portal, slug } = await params;

  if (!isValidPortal(portal)) {
    return {};
  }

  const source = getPortalSource(portal);
  const locale = await getFumadocsLocale();

  // Pass slug and locale separately - Fumadocs handles locale internally
  const page = source.getPage(slug, locale);

  if (!page) {
    return {};
  }

  const portalTitle = portalTitles[portal as PortalKey];

  return {
    title: `${page.data.title} | ${portalTitle} | Eleva Care`,
    description: page.data.description,
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      type: 'article',
    },
  };
}
