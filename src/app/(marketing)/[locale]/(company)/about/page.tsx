import { isValidLocale } from '@/app/i18n';
import AdvisorsSection from '@/components/sections/about/AdvisorsSection';
import BeliefsSection from '@/components/sections/about/BeliefsSection';
import JoinNetworkSection from '@/components/sections/about/JoinNetworkSection';
import MissionSection from '@/components/sections/about/MissionSection';
import TeamSection from '@/components/sections/about/TeamSection';
import HeadlineSection from '@/components/shared/text/HeadlineSection';
import TextBlock from '@/components/shared/text/TextBlock';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { locales } from '@/lib/i18n/routing';
import { generateGenericPageMetadata } from '@/lib/seo/metadata-utils';
import type { Metadata } from 'next';
import Image from 'next/image';
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
    const { metadata } = await import(`@/content/about/${safeLocale}.mdx`);

    return generateGenericPageMetadata(
      safeLocale,
      '/about',
      metadata.title,
      metadata.description,
      'secondary', // Use secondary variant for about page
      ['about eleva care', 'mission', 'vision', 'healthcare team', 'women health'],
    );
  } catch (error) {
    console.error('Error loading metadata from MDX:', error);

    return generateGenericPageMetadata(
      safeLocale,
      '/about',
      'About Eleva Care',
      'Learn about our mission, vision, and team at Eleva Care.',
      'secondary',
      ['about eleva care', 'mission', 'vision', 'healthcare team', 'women health'],
    );
  }
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    redirect('/about'); // Default locale (en) has no prefix
  }

  // Native Next.js 16 MDX import - Turbopack optimized
  // Dynamic import with proper error handling
  let AboutContent: React.ComponentType<any>;
  try {
    const mdxModule = await import(`@/content/about/${locale}.mdx`);
    AboutContent = mdxModule.default;
  } catch (error) {
    console.error(`Failed to load MDX content for locale ${locale}:`, error);
    return notFound();
  }

  return (
    <main className="overflow-hidden">
      <div className="px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <AboutContent
            components={{
              Button,
              Separator,
              Image,
              TextBlock,
              HeadlineSection,
              AdvisorsSection,
              BeliefsSection,
              JoinNetworkSection,
              MissionSection,
              TeamSection,
            }}
          />
        </div>
      </div>
    </main>
  );
}
