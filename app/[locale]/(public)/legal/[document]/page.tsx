import { isValidLocale } from '@/app/i18n';
import MDXContentWrapper from '@/components/atoms/MDXContentWrapper';
import { generatePageMetadata } from '@/lib/seo/metadata-utils';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

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
    const t = await getTranslations({ locale, namespace: 'metadata.legal.documents' });

    // Get translations based on document type using explicit typing
    let title, description, ogTitle, ogDescription, siteName;

    switch (document) {
      case 'terms':
        title = t('terms.title');
        description = t('terms.description');
        ogTitle = t('terms.og.title');
        ogDescription = t('terms.og.description');
        siteName = t('terms.og.siteName');
        break;
      case 'privacy':
        title = t('privacy.title');
        description = t('privacy.description');
        ogTitle = t('privacy.og.title');
        ogDescription = t('privacy.og.description');
        siteName = t('privacy.og.siteName');
        break;
      case 'cookie':
        title = t('cookie.title');
        description = t('cookie.description');
        ogTitle = t('cookie.og.title');
        ogDescription = t('cookie.og.description');
        siteName = t('cookie.og.siteName');
        break;
      case 'payment-policies':
        title = t('payment-policies.title');
        description = t('payment-policies.description');
        ogTitle = t('payment-policies.og.title');
        ogDescription = t('payment-policies.og.description');
        siteName = t('payment-policies.og.siteName');
        break;
      case 'expert-agreement':
        title = t('expert-agreement.title');
        description = t('expert-agreement.description');
        ogTitle = t('expert-agreement.og.title');
        ogDescription = t('expert-agreement.og.description');
        siteName = t('expert-agreement.og.siteName');
        break;
      default:
        throw new Error(`Unknown document type: ${document}`);
    }

    return generatePageMetadata({
      locale,
      path: `/legal/${document}`,
      title,
      description,
      ogTitle,
      ogDescription,
      siteName,
      type: 'article',
      keywords: ['legal', document, 'eleva care', 'healthcare', 'policy'],
    });
  } catch {
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

export default async function LegalDocumentPage({ params }: PageProps) {
  const { locale, document } = await params;

  if (!isValidLocale(locale)) {
    redirect('/legal/terms');
  }

  if (!validDocuments.includes(document)) {
    return notFound();
  }

  return (
    <div className="card mx-auto max-w-4xl">
      <div className="p-6 sm:p-10">
        <MDXContentWrapper locale={locale} namespace={document} fallbackLocale="en" />
      </div>
    </div>
  );
}
