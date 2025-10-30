import { isValidLocale } from '@/app/i18n';
import { Button } from '@/components/atoms/button';
import { Separator } from '@/components/atoms/separator';
import TextBlock from '@/components/atoms/TextBlock';
import HeadlineSection from '@/components/molecules/HeadlineSection';
import AdvisorsSection from '@/components/organisms/about/AdvisorsSection';
import BeliefsSection from '@/components/organisms/about/BeliefsSection';
import JoinNetworkSection from '@/components/organisms/about/JoinNetworkSection';
import MissionSection from '@/components/organisms/about/MissionSection';
import TeamSection from '@/components/organisms/about/TeamSection';
import { locales } from '@/lib/i18n/routing';
import { renderMDXContent } from '@/lib/mdx/server-mdx';
import { generateGenericPageMetadata } from '@/lib/seo/metadata-utils';
import { mdxComponents } from '@/mdx-components';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
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
    const t = await getTranslations({ locale: safeLocale, namespace: 'metadata.about' });

    return generateGenericPageMetadata(
      safeLocale,
      '/about',
      t('title'),
      t('description'),
      'secondary', // Use secondary variant for about page
      ['about eleva care', 'mission', 'vision', 'healthcare team', 'women health'],
    );
  } catch (error) {
    console.error('Error generating metadata:', error);

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

  // Merge base MDX components with custom components
  const components = {
    ...mdxComponents,
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
  };

  const content = await renderMDXContent({
    namespace: 'about',
    locale,
    fallbackLocale: 'en',
    components,
  });

  if (!content) {
    return notFound();
  }

  return (
    <main className="overflow-hidden">
      <div className="px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">{content}</div>
      </div>
    </main>
  );
}
