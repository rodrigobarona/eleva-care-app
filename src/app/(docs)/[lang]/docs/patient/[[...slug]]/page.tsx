import { patientSource } from '@/lib/source';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

/**
 * Patient Help Center Documentation Page
 *
 * Renders MDX content for patient documentation.
 * Uses Fumadocs Core for content management without Fumadocs UI
 * (which requires Tailwind v4).
 */

interface PageProps {
  params: Promise<{
    lang: string;
    slug?: string[];
  }>;
}

export default async function PatientDocsPage({ params }: PageProps) {
  const { lang, slug } = await params;
  const page = patientSource.getPage(slug, lang);

  if (!page) {
    notFound();
  }

  const MDX = page.data.body;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <article className="prose prose-lg max-w-none dark:prose-invert">
          <h1>{page.data.title}</h1>
          {page.data.description && (
            <p className="lead text-muted-foreground">{page.data.description}</p>
          )}
          <MDX />
        </article>

        {/* Table of Contents */}
        {page.data.toc && page.data.toc.length > 0 && (
          <nav className="fixed right-8 top-24 hidden w-64 xl:block">
            <h2 className="mb-4 text-sm font-semibold">On this page</h2>
            <ul className="space-y-2 text-sm">
              {page.data.toc.map((item) => (
                <li key={item.url}>
                  <a
                    href={item.url}
                    className="text-muted-foreground hover:text-foreground"
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
  return patientSource.generateParams();
}

/**
 * Generate metadata for each page
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  const page = patientSource.getPage(slug, lang);

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
