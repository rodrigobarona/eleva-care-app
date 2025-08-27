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
    redirect('/about');
  }

  try {
    const t = await getTranslations({ locale, namespace: 'metadata.about' });

    return generatePageMetadata({
      locale,
      path: '/about',
      title: t('title'),
      description: t('description'),
      ogTitle: t('og.title') || undefined,
      ogDescription: t('og.description') || undefined,
      siteName: t('og.siteName') || undefined,
      keywords: ['about eleva care', 'mission', 'vision', 'healthcare team', 'women health'],
      image: {
        url: '/img/about/team-photo.png',
        width: 1200,
        height: 630,
        alt: 'Eleva Care Team',
      },
    });
  } catch (error) {
    console.error('Error generating metadata:', error);

    return generatePageMetadata({
      locale,
      path: '/about',
      title: 'About Eleva Care',
      description: 'Learn about our mission, vision, and team at Eleva Care.',
      keywords: ['about eleva care', 'mission', 'vision', 'healthcare team', 'women health'],
      image: {
        url: '/img/about/team-photo.png',
        width: 1200,
        height: 630,
        alt: 'Eleva Care Team',
      },
    });
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
