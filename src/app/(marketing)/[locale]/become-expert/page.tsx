/**
 * Become an Expert Landing Page (Multilingual)
 *
 * CMS-ready architecture with presentation components and MDX content.
 * Follows the same pattern as about/page.tsx for easy Sanity CMS integration.
 *
 * Flow:
 * 1. User lands on /become-expert (or /[locale]/become-expert)
 * 2. Sees benefits, requirements, and CTA in their language from MDX
 * 3. Clicks "Get Started" → redirects to /register?expert=true
 * 4. After registration → auto-creates expert_individual organization
 * 5. Redirects to /setup for guided expert onboarding
 */
import { isValidLocale } from '@/app/i18n';
import BenefitsSection from '@/components/sections/become-expert/BenefitsSection';
import FinalCTASection from '@/components/sections/become-expert/FinalCTASection';
import HeroSection from '@/components/sections/become-expert/HeroSection';
import HowItWorksSection from '@/components/sections/become-expert/HowItWorksSection';
import RequirementsSection from '@/components/sections/become-expert/RequirementsSection';
import { locales } from '@/lib/i18n/routing';
import { generateGenericPageMetadata } from '@/lib/seo/metadata-utils';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

// Static marketing page - cache for 24 hours
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
    const { metadata } = await import(`@/content/become-expert/${safeLocale}.mdx`);

    return generateGenericPageMetadata(
      safeLocale,
      '/become-expert',
      metadata.title,
      metadata.description,
      'primary', // Use primary variant for CTA page
      [
        'become an expert',
        'expert registration',
        'healthcare professional',
        'consultant',
        'coach',
        'earn money',
      ],
    );
  } catch (error) {
    console.error('Error loading metadata from MDX:', error);

    return generateGenericPageMetadata(
      safeLocale,
      '/become-expert',
      'Become an Expert - Share Your Knowledge',
      'Join our community of healthcare professionals, coaches, and consultants. Set your own rates and earn on your schedule.',
      'primary',
      [
        'become an expert',
        'expert registration',
        'healthcare professional',
        'consultant',
        'coach',
        'earn money',
      ],
    );
  }
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function BecomeExpertPage({ params }: PageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    redirect('/become-expert'); // Default locale (en) has no prefix
  }

  // Native Next.js 16 MDX import - Turbopack optimized
  // Dynamic import with proper error handling
  let BecomeExpertContent: React.ComponentType<any>;
  try {
    const mdxModule = await import(`@/content/become-expert/${locale}.mdx`);
    BecomeExpertContent = mdxModule.default;
  } catch (error) {
    console.error(`Failed to load MDX content for locale ${locale}:`, error);
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <BecomeExpertContent
        components={{
          HeroSection,
          BenefitsSection,
          HowItWorksSection,
          RequirementsSection,
          FinalCTASection,
        }}
      />
    </div>
  );
}
