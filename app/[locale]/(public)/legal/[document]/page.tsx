import { isValidLocale } from '@/app/i18n';
import MDXContentWrapper from '@/components/atoms/MDXContentWrapper';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ locale: string; document: string }>;
}

const validDocuments = ['terms', 'privacy', 'cookie', 'dpa'];

// Create a mapping of document types to their display names
const documentDisplayNames = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  cookie: 'Cookie Policy',
  dpa: 'Data Processing Agreement',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, document } = await params;

  if (!isValidLocale(locale) || !validDocuments.includes(document)) {
    return {
      title: 'Legal Document Not Found',
      description: 'The requested legal document could not be found',
    };
  }

  // Get the display name for the document
  const displayName =
    documentDisplayNames[document as keyof typeof documentDisplayNames] ||
    document.charAt(0).toUpperCase() + document.slice(1);

  return {
    title: `Eleva.care - ${displayName}`,
    description: `Legal information - ${displayName}`,
    openGraph: {
      title: `Eleva.care - ${displayName}`,
      description: `Legal information - ${displayName}`,
      siteName: 'Eleva.care',
    },
  };
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
