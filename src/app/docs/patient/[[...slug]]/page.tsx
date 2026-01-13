import { patientSource } from '@/lib/source';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { MDXContent } from 'mdx/types';
import type { TOCItemType } from 'fumadocs-core/toc';
import { mdxComponents } from '@/mdx-components';
import { getLocale } from 'next-intl/server';
import * as Sentry from '@sentry/nextjs';

/**
 * Patient Help Center Documentation Page
 *
 * Renders MDX content for patient documentation.
 * Uses Fumadocs Core for content management.
 *
 * Sentry Integration:
 * - Sets 'docs.persona' tag to 'patient' for filtering
 * - Adds breadcrumb for page navigation
 * - Creates span for MDX content rendering
 * 
 * Note: This page is outside the [locale] segment, so we get the locale
 * from next-intl's server context instead of URL params.
 */

interface PageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

// Type for the page data with MDX content
interface PageData {
  title: string;
  description?: string;
  body: MDXContent;
  toc: TOCItemType[];
}

export default async function PatientDocsPage({ params }: PageProps) {
  const { slug } = await params;
  
  // Get locale - this might fail if next-intl isn't configured for this route
  let locale = 'en';
  try {
    locale = await getLocale();
  } catch (e) {
    console.error('[PatientDocsPage] Failed to get locale, using default:', e);
  }
  
  // The Fumadocs source includes locale in the slug path due to content structure
  // Prepend locale to slug for correct page lookup
  const fullSlug = slug ? [locale, ...slug] : [locale];
  const pagePath = slug ? `/docs/patient/${slug.join('/')}` : '/docs/patient';
  
  // Set Sentry context for this specific documentation page
  Sentry.setTag('docs.persona', 'patient');
  Sentry.setTag('docs.page', pagePath);
  Sentry.setTag('docs.locale', locale);
  
  // Add breadcrumb for page navigation tracking
  Sentry.addBreadcrumb({
    category: 'docs.navigation',
    message: `Viewing patient docs: ${pagePath}`,
    level: 'info',
    data: {
      persona: 'patient',
      slug: slug?.join('/') || 'index',
      locale,
    },
  });
  
  const page = patientSource.getPage(fullSlug, locale);

  if (!page) {
    // Track 404s in documentation for monitoring missing content
    Sentry.addBreadcrumb({
      category: 'docs.error',
      message: `Documentation page not found: ${pagePath}`,
      level: 'warning',
      data: { fullSlug, locale },
    });
    notFound();
  }

  // Cast to the correct type since fumadocs-mdx provides body and toc
  const data = page.data as unknown as PageData;
  const MDXContent = data.body;
  
  // Set page title context for better error reports
  Sentry.setContext('documentation_page', {
    title: data.title,
    description: data.description,
    path: pagePath,
    persona: 'patient',
    locale,
    tocItems: data.toc?.length || 0,
  });

  return (
    <main className="min-h-screen">
      <div className="flex gap-8">
        {/* Main content - matches legal/trust card styling */}
        <div className="docs-content-card mx-auto max-w-4xl flex-1">
          <div className="p-6 sm:p-10">
            <article className="docs-prose">
              <MDXContent components={mdxComponents} />
            </article>
          </div>
        </div>

        {/* Table of Contents - right sidebar */}
        {data.toc && data.toc.length > 0 && (
          <nav className="docs-toc sticky top-24 hidden h-fit w-56 shrink-0 xl:block">
            <h2 className="docs-toc-title mb-4 text-sm">On this page</h2>
            <ul className="space-y-2 text-sm">
              {data.toc.map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    className="docs-toc-link block py-1"
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </main>
  );
}

/**
 * Generate static params for all patient documentation pages
 */
export async function generateStaticParams() {
  // Generate params for all locales
  const allParams = patientSource.generateParams();
  // Return just the slug params (locale is handled by next-intl)
  return allParams.map(({ slug }) => ({ slug }));
}

/**
 * Generate metadata for each page
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  
  // Prepend locale to slug for correct page lookup
  const fullSlug = slug ? [locale, ...slug] : [locale];
  const page = patientSource.getPage(fullSlug, locale);

  if (!page) {
    return {};
  }

  return {
    title: `${page.data.title} | Patient Help Center | Eleva Care`,
    description: page.data.description,
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      type: 'article',
    },
  };
}
