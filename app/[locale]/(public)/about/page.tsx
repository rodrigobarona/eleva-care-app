import { isValidLocale } from '@/app/i18n';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import MDXContentWrapper from './MDXContentWrapper';

// Server component
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  // Await params before using locale
  const { locale } = await params;

  console.log('About page - generateMetadata called with locale:', locale);

  // Validate locale before proceeding
  if (!isValidLocale(locale)) {
    console.error(`Invalid locale in About page metadata: ${locale}`);
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'About' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

// Main page component - server component
export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  // Await params before using locale
  const { locale } = await params;

  console.log('About page - rendering with locale:', locale);

  // Validate locale to prevent errors
  if (!isValidLocale(locale)) {
    console.error(`Invalid locale in About page: ${locale}`);
    notFound();
  }

  return (
    <main className="overflow-hidden">
      <div className="px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <MDXContentWrapper locale={locale} />
        </div>
      </div>
    </main>
  );
}
