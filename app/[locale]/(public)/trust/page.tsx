import { isValidLocale } from '@/app/i18n';
import { defaultLocale } from '@/lib/i18n/routing';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    return {
      title: 'Eleva.care - Trust Center',
      description: 'Security, compliance, and trust information for Eleva.care',
    };
  }

  return {
    title: 'Eleva.care - Trust Center',
    description: 'Security, compliance, and trust information for Eleva.care',
    openGraph: {
      title: 'Eleva.care - Trust Center',
      description: 'Security, compliance, and trust information for Eleva.care',
      siteName: 'Eleva.care',
    },
  };
}

export default async function TrustPage({ params }: PageProps) {
  const { locale } = await params;

  // Handle invalid locale - redirect to default locale
  if (!isValidLocale(locale)) {
    redirect(`/${defaultLocale}/trust/security`);
  }

  // Redirect to the default trust document (security)
  redirect(`/${locale}/trust/security`);
}
