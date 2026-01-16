import * as Sentry from '@sentry/nextjs';
import { docsMdxComponents } from '@/components/help/mdx-components';
import type { FumadocsLanguage } from '@/lib/fumadocs-i18n.config';
import { locales } from '@/lib/i18n/routing';
import { getPortalSource, isValidPortal, type PortalKey } from '@/lib/source';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import type { MDXContent } from 'mdx/types';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';

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

const portalTitles: Record<PortalKey, string> = {
  patient: 'Patient Help Center',
  expert: 'Expert Resources',
  workspace: 'Workspace Portal',
};

/**
 * Maps next-intl locale codes to Fumadocs language codes.
 *
 * Fumadocs only supports 'en' and 'pt', so we map:
 * - 'pt-BR' or 'pt' => 'pt' (Portuguese)
 * - 'es' => 'en' (Spanish falls back to English - no Spanish docs yet)
 * - All others => 'en' (default to English)
 *
 * @param locale - The next-intl locale code (e.g., 'pt-BR', 'es', 'en')
 * @returns FumadocsLanguage code ('en' or 'pt')
 *
 * @example
 * ```tsx
 * mapToFumadocsLocale('pt-BR'); // => 'pt'
 * mapToFumadocsLocale('pt');    // => 'pt'
 * mapToFumadocsLocale('es');    // => 'en' (fallback)
 * mapToFumadocsLocale('en');    // => 'en'
 * mapToFumadocsLocale('fr');    // => 'en' (default)
 * ```
 */
function mapToFumadocsLocale(locale: string): FumadocsLanguage {
  if (locale === 'pt-BR' || locale === 'pt') return 'pt';
  if (locale === 'es') return 'en';
  return 'en';
}

/**
 * Normalizes slug array for Fumadocs page lookup.
 *
 * Index pages have undefined slug, which needs to be converted to an empty
 * array for Fumadocs getPage() to work correctly.
 *
 * @param slug - Optional slug array from URL params
 * @returns Normalized slug array (empty array if undefined)
 *
 * @example
 * ```tsx
 * normalizeSlug(undefined);      // => []
 * normalizeSlug(['faq']);        // => ['faq']
 * normalizeSlug(['a', 'b']);     // => ['a', 'b']
 * ```
 */
function normalizeSlug(slug: string[] | undefined): string[] {
  return slug ?? [];
}

/** Zod schema for validating PageData from Fumadocs */
const PageDataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  body: z.custom<MDXContent>((val) => typeof val === 'function', {
    message: 'body must be an MDX component',
  }),
  toc: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      depth: z.number(),
    }),
  ),
});

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

  // Validate page data with Zod schema instead of unsafe double-cast
  const parseResult = PageDataSchema.safeParse(page.data);

  if (!parseResult.success) {
    Sentry.captureException(new Error('Invalid page data structure'), {
      extra: {
        pagePath,
        portal,
        locale: fumadocsLocale,
        zodErrors: parseResult.error.flatten(),
      },
    });
    notFound();
  }

  const data = parseResult.data;
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

/**
 * Generates static parameters for all locale/portal/slug combinations.
 * Includes locale to enable static pre-rendering for all supported locales.
 *
 * @returns Array of locale, portal, and slug parameter combinations
 */
export function generateStaticParams(): Array<{
  locale: string;
  portal: string;
  slug?: string[];
}> {
  const portals: PortalKey[] = ['patient', 'expert', 'workspace'];
  const allParams: { locale: string; portal: string; slug?: string[] }[] = [];

  for (const locale of locales) {
    for (const portal of portals) {
      const source = getPortalSource(portal);
      const params = source.generateParams();

      for (const { slug } of params) {
        allParams.push({ locale, portal, slug });
      }
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
