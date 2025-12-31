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
 * For Organizations Page - CMS-ready architecture with MDX content
 *
 * @description
 * Marketing page for healthcare businesses, wellness centers, clinics, employers,
 * and organizations to use Eleva Care's platform technology. Content is stored
 * in MDX files for easy management and future CMS integration (e.g., Sanity).
 *
 * @architecture
 * - MDX content with native metadata export (`export const metadata`)
 * - Presentation components receive data as props (see `@/components/sections/for-organizations/`)
 * - Dynamic imports for native Next.js 16 MDX support
 * - Static generation with `generateStaticParams`
 *
 * @features
 * - Multi-language support (en, es, pt, pt-BR)
 * - Target audience: Clinics, employers, healthcare organizations
 * - Pricing preview with workspace subscription model
 * - B2B-focused CTA for organizational partnerships
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = locales.includes(locale as Locale) ? (locale as Locale) : 'en';

  try {
    // Dynamically import metadata from MDX file using Next.js 16 native approach
    const { metadata } = await import(`@/content/for-organizations/${safeLocale}.mdx`);

    return generateGenericPageMetadata(
      safeLocale,
      '/for-organizations',
      metadata.title,
      metadata.description,
      'primary', // Use primary variant for CTA page
      [
        'for organizations',
        'healthcare business',
        'wellness center',
        'clinic technology',
        'women health platform',
        'digital health services',
        'employer health program',
      ],
    );
  } catch (error) {
    console.error('Error loading metadata from MDX:', error);

    return generateGenericPageMetadata(
      safeLocale,
      '/for-organizations',
      'For Organizations - Eleva Care Technology',
      "Power your women's health services with Eleva Care technology. Clinics, employers, and healthcare organizations use our platform to deliver digital care.",
      'primary',
      ['for organizations', 'healthcare business', 'clinic technology', 'digital health platform'],
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
 * For Organizations Page Component
 * Server Component with native Next.js 16 MDX imports
 */
export default async function ForOrganizationsPage({ params }: PageProps) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    redirect('/for-organizations'); // Default locale (en) has no prefix
  }

  // Native Next.js 16 MDX import - Turbopack optimized
  // Dynamic import with proper error handling
  let ForOrganizationsContent: React.ComponentType<any>;
  try {
    const mdxModule = await import(`@/content/for-organizations/${locale}.mdx`);
    ForOrganizationsContent = mdxModule.default;
  } catch (error) {
    console.error(`Failed to load MDX content for locale ${locale}:`, error);
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <ForOrganizationsContent
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
