import { type Locale, locales } from '@/lib/i18n/routing';
import { generateGenericPageMetadata } from '@/lib/seo/metadata-utils';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
};

/**
 * Become a Partner Page - CMS-ready architecture with MDX content
 *
 * @description
 * Marketing page for healthcare businesses, wellness centers, and organizations
 * to join Eleva Care's partner network. Content is stored in MDX files for easy
 * management and future CMS integration (e.g., Sanity).
 *
 * @architecture
 * - MDX content with native metadata export (`export const metadata`)
 * - Presentation components receive data as props (see `@/components/sections/become-partner/`)
 * - Dynamic imports for native Next.js 16 MDX support
 * - Static generation with `generateStaticParams`
 *
 * @features
 * - Multi-language support (en, es, pt, pt-BR)
 * - Partner types: Medical practices, wellness centers, coaching, nutrition, fitness, mental health
 * - Pricing preview with workspace subscription model
 * - CTA-optimized for partner acquisition
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = locales.includes(locale as Locale) ? (locale as Locale) : 'en';

  try {
    // Dynamically import metadata from MDX file using Next.js 16 native approach
    const { metadata } = await import(`@/content/become-partner/${safeLocale}.mdx`);

    return generateGenericPageMetadata(
      safeLocale,
      '/become-partner',
      metadata.title,
      metadata.description,
      'primary', // Use primary variant for CTA page
      [
        'become a partner',
        'partner organization',
        'healthcare business',
        'wellness center',
        'practice growth',
        'women health partner',
        'clinic partnership',
      ],
    );
  } catch (error) {
    console.error('Error loading metadata from MDX:', error);

    return generateGenericPageMetadata(
      safeLocale,
      '/become-partner',
      'Become a Partner - Grow Your Practice',
      "Partner with Eleva Care to expand your women's health practice. Access our technology platform, grow your expert network, and reach more clients.",
      'primary',
      [
        'become a partner',
        'partner organization',
        'healthcare business',
        'wellness center',
        'practice growth',
      ],
    );
  }
}

/**
 * Generate static params for all supported locales
 * Enables static pre-rendering at build time (ISR)
 */
export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'es' }, { locale: 'pt' }, { locale: 'pt-BR' }];
}

/**
 * Become a Partner Page Component
 * Server Component with native Next.js 16 MDX imports
 */
export default async function BecomePartnerPage({ params }: PageProps) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    redirect('/become-partner'); // Default locale (en) has no prefix
  }

  // Native Next.js 16 MDX import - Turbopack optimized
  // Dynamic import with proper error handling
  let BecomePartnerContent: React.ComponentType<any>;
  try {
    const mdxModule = await import(`@/content/become-partner/${locale}.mdx`);
    BecomePartnerContent = mdxModule.default;
  } catch (error) {
    console.error(`Failed to load MDX content for locale ${locale}:`, error);
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <BecomePartnerContent
        components={
          {
            // Presentation components are imported directly in MDX
            // This pattern keeps content and components decoupled for CMS integration
          }
        }
      />
    </div>
  );
}
