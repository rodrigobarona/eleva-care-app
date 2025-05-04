import { isValidLocale } from '@/app/i18n';
import MDXContentWrapper from '@/components/atoms/MDXContentWrapper';
import { LEGAL_DOCUMENTS } from '@/lib/constants/legal';
import type { LegalDocumentType } from '@/lib/constants/legal';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ locale: string; document: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, document } = await params;

  if (!isValidLocale(locale) || !LEGAL_DOCUMENTS.includes(document as LegalDocumentType)) {
    return {
      title: 'Legal Document Not Found',
      description: 'The requested legal document could not be found',
    };
  }

  // Get translations
  const metadataT = await getTranslations('metadata.legal');
  const footerT = await getTranslations('footer.nav.legal');

  // Get document display name safely
  const docType = document as LegalDocumentType;

  // Simple capitalization as fallback
  let displayName = docType.charAt(0).toUpperCase() + docType.slice(1);

  // Attempt to get translated name depending on document type
  if (docType === 'terms') displayName = footerT('terms');
  if (docType === 'privacy') displayName = footerT('privacy');
  if (docType === 'cookie') displayName = footerT('cookie');
  if (docType === 'dpa') displayName = footerT('dpa');

  // Construct the metadata
  const title = `${displayName} - ${metadataT('title')}`;
  const description = `${displayName}: ${metadataT('description')}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'Eleva.care',
    },
  };
}

export default async function LegalDocumentPage({ params }: PageProps) {
  const { locale, document } = await params;

  if (!isValidLocale(locale)) {
    redirect('/legal/terms');
  }

  if (!LEGAL_DOCUMENTS.includes(document as LegalDocumentType)) {
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
