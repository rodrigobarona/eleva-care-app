import { isValidLocale } from '@/app/i18n';
import { locales } from '@/lib/i18n/routing';
import { generatePageMetadata } from '@/lib/seo/metadata-utils';
import { mdxComponents } from '@/mdx-components';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

// Static content - cache for 24 hours
// TODO: Migrate to cacheLife('days') when next-intl supports cacheComponents
// Tracking: https://github.com/amannn/next-intl/issues/1493
export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string; document: string }>;
}

const validDocuments = ['terms', 'privacy', 'cookie', 'payment-policies', 'expert-agreement'];

// Create a mapping of document types to their display names
const documentDisplayNames = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  cookie: 'Cookie Policy',
  'payment-policies': 'Payment Policies',
  'expert-agreement': 'Expert Agreement',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, document } = await params;

  if (!isValidLocale(locale) || !validDocuments.includes(document)) {
    return generatePageMetadata({
      locale: 'en',
      path: '/legal/terms',
      title: 'Legal Document Not Found',
      description: 'The requested legal document could not be found',
    });
  }

  try {
    // Dynamically import metadata from MDX file using Next.js 16 native approach
    const { metadata } = await import(`@/content/${document}/${locale}.mdx`);

    return generatePageMetadata({
      locale,
      path: `/legal/${document}`,
      title: metadata.title,
      description: metadata.description,
      ogTitle: metadata.og?.title || undefined,
      ogDescription: metadata.og?.description || undefined,
      siteName: metadata.og?.siteName || undefined,
      type: 'article',
      keywords: ['legal', document, 'eleva care', 'healthcare', 'policy'],
    });
  } catch (error) {
    console.error(`Error loading metadata from MDX for legal/${document}:`, error);
    console.warn(
      `No translations found for legal document ${document} in locale ${locale}, using fallback`,
    );

    const displayName =
      documentDisplayNames[document as keyof typeof documentDisplayNames] ||
      document.charAt(0).toUpperCase() + document.slice(1);

    return generatePageMetadata({
      locale,
      path: `/legal/${document}`,
      title: `Eleva.care - ${displayName}`,
      description: `Legal information - ${displayName}`,
      keywords: ['legal', document, 'eleva care'],
    });
  }
}

export async function generateStaticParams() {
  return locales.flatMap((locale) =>
    validDocuments.map((document) => ({
      locale,
      document,
    })),
  );
}

export default async function LegalDocumentPage({ params }: PageProps) {
  const { locale, document } = await params;

  if (!isValidLocale(locale)) {
    redirect(`/legal/${document}`); // Default locale (en) has no prefix
  }

  if (!validDocuments.includes(document)) {
    return notFound();
  }

  // Native Next.js 16 MDX import - Turbopack optimized
  let LegalContent: React.ComponentType<{ components?: typeof mdxComponents }>;
  try {
    const mdxModule = await import(`@/content/${document}/${locale}.mdx`);
    LegalContent = mdxModule.default;
  } catch (error) {
    console.error(`Failed to load MDX content for ${document}/${locale}:`, error);
    return notFound();
  }

  return <LegalContent components={mdxComponents} />;
}
