import * as Sentry from '@sentry/nextjs';
import { docsMdxComponents } from '@/components/help/mdx-components';
import type { FumadocsLanguage } from '@/lib/fumadocs-i18n.config';
import { getPortalSource, isValidPortal, type PortalKey } from '@/lib/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import type { MDXContent } from 'mdx/types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * Portal Documentation Page
 *
 * Renders MDX content for help center portals.
 * Locale comes from URL params via [locale] segment.
 *
 * URL Structure:
 * - /help/patient (locale = 'en')
 * - /pt/help/patient/faq (locale = 'pt')
 *
 * @see https://fumadocs.vercel.app/docs/ui/layouts/page
 */

interface PageProps {
  params: Promise<{
    locale: string;
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
};

/**
 * Map next-intl locale to Fumadocs language
 */
function mapToFumadocsLocale(locale: string): FumadocsLanguage {
  if (locale === 'pt-BR' || locale === 'pt') return 'pt';
  if (locale === 'es') return 'en';
  return 'en';
}

/**
 * Normalize slug to array format for Fumadocs
 * Index pages have undefined slug, which needs to be converted to empty array
 */
function normalizeSlug(slug: string[] | undefined): string[] {
  return slug ?? [];
}

export default async function PortalDocsPage({ params }: PageProps) {
  const { locale, portal, slug } = await params;

  if (!isValidPortal(portal)) {
    notFound();
  }

  const fumadocsLocale = mapToFumadocsLocale(locale);
  const source = getPortalSource(portal);
  const pagePath = slug ? `/help/${portal}/${slug.join('/')}` : `/help/${portal}`;

  // Sentry tracking
  Sentry.setTag('docs.portal', portal);
  Sentry.setTag('docs.page', pagePath);
  Sentry.setTag('docs.locale', fumadocsLocale);

  Sentry.addBreadcrumb({
    category: 'docs.navigation',
    message: `Viewing ${portal} docs: ${pagePath}`,
    level: 'info',
    data: { portal, slug: slug?.join('/') || 'index', locale: fumadocsLocale },
  });

  // Get page with locale from URL params
  const page = source.getPage(normalizeSlug(slug), fumadocsLocale);

  if (!page) {
    Sentry.addBreadcrumb({
      category: 'docs.error',
      message: `Documentation page not found: ${pagePath}`,
      level: 'warning',
      data: { slug, locale: fumadocsLocale },
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
    locale: fumadocsLocale,
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
  const portals: PortalKey[] = ['patient', 'expert', 'workspace'];
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
  const { locale, portal, slug } = await params;

  if (!isValidPortal(portal)) {
    return {};
  }

  const fumadocsLocale = mapToFumadocsLocale(locale);
  const source = getPortalSource(portal);
  const page = source.getPage(normalizeSlug(slug), fumadocsLocale);

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

