import { isValidLocale } from '@/app/i18n';
import ExpertsSection from '@/components/organisms/home/ExpertsSection';
import Hero from '@/components/organisms/home/Hero';
import { generatePageMetadata } from '@/lib/seo/metadata-utils';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

// Define the page props
interface PageProps {
  params: Promise<{ locale: string }>;
}

// Fallback metadata for invalid locales or errors
const FALLBACK_METADATA = {
  path: '/',
  title: "Connect with Expert Women's Health Practitioners | Eleva Care",
  description:
    "Eleva Care: Find and book licensed women's health practitioners for pregnancy, postpartum, menopause, and sexual health. A secure platform connecting you with independent healthcare professionals.",
  keywords: [
    'pregnancy care',
    'postpartum support',
    'sexual health',
    'women health',
    'healthcare experts',
    'menopause care',
    'healthcare marketplace',
    'find practitioners',
  ],
} as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    // Fallback metadata for invalid locales
    return generatePageMetadata({
      locale: 'en',
      ...FALLBACK_METADATA,
    });
  }

  try {
    const t = await getTranslations({ locale, namespace: 'metadata' });

    return generatePageMetadata({
      locale,
      path: '/',
      title: t('title'),
      description: t('description'),
      ogTitle: t('og.title') || undefined,
      ogDescription: t('og.description') || undefined,
      siteName: t('og.siteName') || undefined,
      keywords: [
        'pregnancy care',
        'postpartum support',
        'sexual health',
        'women health',
        'healthcare experts',
        'menopause care',
      ],
      image: {
        url: '/img/eleva-care-share.png',
        width: 1200,
        height: 680,
        alt: 'Eleva Care - Expert Healthcare for Women',
      },
    });
  } catch (error) {
    console.error('Error generating home page metadata:', error);

    // Fallback metadata using utility
    return generatePageMetadata({
      locale,
      ...FALLBACK_METADATA,
    });
  }
}

// Skeleton loading components for dynamic sections
const SectionSkeleton = () => (
  <div className="container mx-auto my-16">
    <div className="h-12 w-1/3 animate-pulse rounded-lg bg-gray-100" />
    <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {['card-1', 'card-2', 'card-3'].map((id) => (
        <div key={id} className="space-y-4">
          <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  </div>
);

const ServicesSection = dynamic(() => import('@/components/organisms/home/Services'), {
  loading: () => <SectionSkeleton />,
});

const ApproachSection = dynamic(() => import('@/components/organisms/home/ApproachSection'), {
  loading: () => <SectionSkeleton />,
});

export default function HomePage() {
  return (
    <main>
      <Hero />
      <ServicesSection />
      <ApproachSection />
      <ExpertsSection />
    </main>
  );
}
