import { permanentRedirect } from 'next/navigation';

/**
 * Help Center Root Page
 *
 * Redirects to the default help portal (patient).
 * Uses relative redirect so locale is preserved in URL.
 *
 * - /help → /help/patient
 * - /pt/help → /pt/help/patient
 */
export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Redirect to patient portal - locale prefix handled by next-intl routing
  if (locale === 'en') {
    permanentRedirect('/help/patient');
  } else {
    permanentRedirect(`/${locale}/help/patient`);
  }
}

