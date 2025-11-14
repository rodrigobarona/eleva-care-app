import { isValidLocale } from '@/app/i18n';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import HeadlineSection from '@/components/shared/text/HeadlineSection';
import TextBlock from '@/components/shared/text/TextBlock';
import {
  HeroSection,
  KeyNumbersSection,
  ClinicalAreasSection,
  SafetyQualitySection,
  FAQSection,
  ReferencesSection,
} from '@/components/sections/evidence-based-care';
import { locales } from '@/lib/i18n/routing';
import { generateGenericPageMetadata } from '@/lib/seo/metadata-utils';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

// Static content - cache for 24 hours
// TODO: Migrate to cacheLife('days') when next-intl supports cacheComponents
// Tracking: https://github.com/amannn/next-intl/issues/1493
export const revalidate = 86400;

// Define the page props
interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  // Use default locale for metadata if invalid (page component handles redirect)
  const safeLocale = isValidLocale(locale) ? locale : 'en';

  try {
    // Dynamically import metadata from MDX file using Next.js 16 native approach
    const { metadata } = await import(`@/content/evidence-based-care/${safeLocale}.mdx`);

    return generateGenericPageMetadata(
      safeLocale,
      '/evidence-based-care',
      metadata.title,
      metadata.description,
      'secondary', // Use secondary variant for evidence-based care page
      [
        'evidence-based care',
        'clinical excellence',
        'telehealth research',
        'women health science',
        'clinical trials',
        'peer-reviewed research',
      ],
    );
  } catch (error) {
    console.error('Error loading metadata from MDX:', error);

    return generateGenericPageMetadata(
      safeLocale,
      '/evidence-based-care',
      'Evidence-Based Care | Clinical Excellence | Eleva Care',
      'Discover how Eleva Care delivers evidence-based women\'s health care through telehealth. Backed by rigorous research and proven in clinical trials.',
      'secondary',
      [
        'evidence-based care',
        'clinical excellence',
        'telehealth research',
        'women health science',
      ],
    );
  }
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function EvidenceBasedCarePage({ params }: PageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    redirect('/evidence-based-care'); // Default locale (en) has no prefix
  }

  // Native Next.js 16 MDX import - Turbopack optimized
  // Dynamic import with proper error handling
  let EvidenceBasedCareContent: React.ComponentType<any>;
  try {
    const mdxModule = await import(`@/content/evidence-based-care/${locale}.mdx`);
    EvidenceBasedCareContent = mdxModule.default;
  } catch (error) {
    console.error(`Failed to load MDX content for locale ${locale}:`, error);
    return notFound();
  }

  return (
    <main className="overflow-hidden">
      <div className="px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <EvidenceBasedCareContent
            components={{
              Button,
              Separator,
              HeadlineSection,
              TextBlock,
              HeroSection,
              KeyNumbersSection,
              ClinicalAreasSection,
              SafetyQualitySection,
              FAQSection,
              ReferencesSection,
            }}
          />
        </div>
      </div>
    </main>
  );
}

