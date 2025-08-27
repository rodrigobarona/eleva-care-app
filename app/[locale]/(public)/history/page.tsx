import { isValidLocale } from '@/app/i18n';
import MDXContentWrapper from '@/components/atoms/MDXContentWrapper';
import { generatePageMetadata } from '@/lib/seo/metadata-utils';
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
    redirect('/history');
  }

  try {
    const t = await getTranslations({ locale, namespace: 'metadata.history' });

    return generatePageMetadata({
      locale,
      path: '/history',
      title: t('title'),
      description: t('description'),
      ogTitle: t('og.title') || undefined,
      ogDescription: t('og.description') || undefined,
      siteName: t('og.siteName') || undefined,
      keywords: ['eleva care story', 'company history', 'mission', 'women healthcare journey'],
      image: {
        url: '/img/about/team-photo.png',
        width: 1200,
        height: 630,
        alt: 'Eleva Care Story',
      },
    });
  } catch (error) {
    console.error('Error generating metadata:', error);

    return generatePageMetadata({
      locale,
      path: '/history',
      title: 'Our Story - Eleva Care',
      description:
        "Discover the journey behind Eleva Care and the passion that drives our mission to transform women's healthcare.",
      keywords: ['eleva care story', 'company history', 'mission', 'women healthcare journey'],
      image: {
        url: '/img/about/team-photo.png',
        width: 1200,
        height: 630,
        alt: 'Eleva Care Story',
      },
    });
  }
}

export default async function HistoryPage({ params }: PageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    redirect('/history');
  }

  return (
    <main className="overflow-hidden">
      {/* Background gradient inspiration from the provided HTML */}
      <div className="relative mx-auto max-w-7xl">
        <div className="w-xl absolute -right-60 -top-44 h-60 rotate-[-10deg] transform-gpu rounded-full bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 opacity-60 blur-3xl md:right-0"></div>
      </div>

      <div className="px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-3xl">
          <div className="mt-16">
            <MDXContentWrapper locale={locale} namespace="history" />
          </div>
        </div>
      </div>
    </main>
  );
}
