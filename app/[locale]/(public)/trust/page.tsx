import { isValidLocale } from '@/app/i18n';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function TrustPage({ params }: PageProps) {
  const { locale } = await params;

  // Handle invalid locale - redirect to default locale
  if (!isValidLocale(locale)) {
    redirect('/trust/security'); // Default locale (en) has no prefix
  }

  // Redirect to the default trust document (security)
  redirect(`/${locale}/trust/security`);
}
