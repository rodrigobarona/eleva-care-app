import { isValidLocale } from '@/app/i18n';
import MDXContentWrapper from '@/components/atoms/MDXContentWrapper';
import { generatePageMetadata } from '@/lib/seo/metadata-utils';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ locale: string; document: string }>;
}

const validDocuments = ['security', 'dpa'];

// Create a mapping of document types to their display names
const documentDisplayNames = {
  security: 'Security',
  dpa: 'Data Processing Agreement',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, document } = await params;

  if (!isValidLocale(locale) || !validDocuments.includes(document)) {
    return generatePageMetadata({
      locale: 'en',
      path: '/trust/security',
      title: 'Trust Document Not Found',
      description: 'The requested trust document could not be found',
    });
  }

  try {
    const t = await getTranslations({ locale, namespace: 'metadata.trust.documents' });

    // Get translations based on document type using explicit typing
    let title, description, ogTitle, ogDescription, siteName;

    switch (document) {
      case 'security':
        title = t('security.title');
        description = t('security.description');
        ogTitle = t('security.og.title');
        ogDescription = t('security.og.description');
        siteName = t('security.og.siteName');
        break;
      case 'dpa':
        title = t('dpa.title');
        description = t('dpa.description');
        ogTitle = t('dpa.og.title');
        ogDescription = t('dpa.og.description');
        siteName = t('dpa.og.siteName');
        break;
      default:
        throw new Error(`Unknown document type: ${document}`);
    }

    return generatePageMetadata({
      locale,
      path: `/trust/${document}`,
      title,
      description,
      ogTitle,
      ogDescription,
      siteName,
      type: 'article',
      keywords: ['trust', 'security', 'compliance', document, 'eleva care', 'healthcare'],
    });
  } catch {
    console.warn(
      `No translations found for trust document ${document} in locale ${locale}, using fallback`,
    );

    const displayName =
      documentDisplayNames[document as keyof typeof documentDisplayNames] ||
      document.charAt(0).toUpperCase() + document.slice(1);

    return generatePageMetadata({
      locale,
      path: `/trust/${document}`,
      title: `Eleva.care - ${displayName}`,
      description: `Trust & Security - ${displayName}`,
      keywords: ['trust', 'security', document, 'eleva care'],
    });
  }
}

export default async function TrustDocumentPage({ params }: PageProps) {
  const { locale, document } = await params;

  if (!isValidLocale(locale)) {
    redirect('/trust/security');
  }

  if (!validDocuments.includes(document)) {
    return notFound();
  }

  // Map trust document to content namespace
  const contentNamespace = `trust/${document}`;

  return (
    <div className="card mx-auto max-w-4xl">
      <div className="p-6 sm:p-10">
        <MDXContentWrapper locale={locale} namespace={contentNamespace} fallbackLocale="en" />
      </div>
    </div>
  );
}
