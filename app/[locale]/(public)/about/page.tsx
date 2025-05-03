import { isValidLocale } from '@/app/i18n';
import MDXContentWrapper from '@/components/molecules/MDXContentWrapper';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

// Define the correct params type based on the error message
interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    redirect('/about');
  }

  try {
    // Get translations for metadata
    const t = await getTranslations({ locale, namespace: 'metadata.about' });

    return {
      title: t('title'),
      description: t('description'),
      openGraph: {
        title: t('og.title'),
        description: t('og.description'),
        siteName: t('og.siteName'),
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    // Fallback metadata
    return {
      title: 'About Eleva Care',
      description: 'Learn about our mission, vision, and team at Eleva Care.',
    };
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
          {/* The locale is passed explicitly here, but could be omitted as MDXContentWrapper 
              can now get it automatically via getLocale() */}
          <MDXContentWrapper namespace="about" locale={locale} />
        </div>
      </div>
    </main>
  );
}
