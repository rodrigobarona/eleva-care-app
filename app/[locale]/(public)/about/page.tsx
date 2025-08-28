import { isValidLocale } from '@/app/i18n';
import MDXContentWrapper from '@/components/atoms/MDXContentWrapper';
import { generateGenericPageMetadata } from '@/lib/seo/metadata-utils';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

// Define the page props
interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    redirect('/about');
  }

  try {
    const t = await getTranslations({ locale, namespace: 'metadata.about' });

    return generateGenericPageMetadata(
      locale,
      '/about',
      t('title'),
      t('description'),
      'secondary', // Use secondary variant for about page
      ['about eleva care', 'mission', 'vision', 'healthcare team', 'women health'],
    );
  } catch (error) {
    console.error('Error generating metadata:', error);

    return generateGenericPageMetadata(
      locale,
      '/about',
      'About Eleva Care',
      'Learn about our mission, vision, and team at Eleva Care.',
      'secondary',
      ['about eleva care', 'mission', 'vision', 'healthcare team', 'women health'],
    );
  }
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    redirect('/about');
  }

  return (
    <main className="overflow-hidden">
      <div className="px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <MDXContentWrapper locale={locale} namespace="about" />
        </div>
      </div>
    </main>
  );
}
