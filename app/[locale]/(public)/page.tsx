import { isValidLocale } from '@/app/i18n';
import ApproachSection from '@/components/sections/home/ApproachSection';
import ExpertsSection from '@/components/sections/home/ExpertsSection';
import Hero from '@/components/sections/home/Hero';
import ServicesSection from '@/components/sections/home/Services';
import { ExpertsSkeleton } from '@/components/shared/loading/HomePageSkeletons';
import { generatePageMetadata } from '@/lib/seo/metadata-utils';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

// Define the page props
interface PageProps {
  params: Promise<{ locale: string }>;
}

// Fallback metadata for invalid locales or errors
const FALLBACK_METADATA = {
  path: '/',
  title: "Connect with Expert Women's Health Specialists | Eleva Care",
  description:
    "Eleva Care: Find and book trusted women's health experts for pregnancy, postpartum, menopause, and sexual health. A trusted platform connecting you with independent care experts.",
  keywords: [
    'pregnancy care',
    'postpartum support',
    'sexual health',
    'women health',
    'healthcare experts',
    'menopause care',
    'healthcare marketplace',
    'find experts',
  ],
};

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

// Static (ISR) home page: re-generated at most once an hour, or on demand when an
// expert profile changes (see HOME_EXPERTS_CACHE_TAG). Avoid adding request-time
// APIs (cookies, headers, auth, no-store fetches) here: they make the page dynamic
// and every visit then costs server CPU.
export const revalidate = 3600;

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  // Must run before any next-intl API in this segment: without it next-intl reads
  // the locale from headers(), which silently makes the route dynamic (no ISR).
  setRequestLocale(locale);

  return (
    <main>
      {/* Hero, Services, Approach: server components (static copy, markdown rendered on the server) */}
      <Hero />

      <ServicesSection />

      <ApproachSection />

      {/* Experts: Server component with database queries, wrapped in Suspense */}
      {/* This enables streaming - page shows immediately while experts data loads */}
      <Suspense fallback={<ExpertsSkeleton />}>
        <ExpertsSection />
      </Suspense>
    </main>
  );
}
