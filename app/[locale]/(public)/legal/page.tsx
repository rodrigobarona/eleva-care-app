import { Link } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';

/**
 * Displays a localized legal information page with links to the privacy policy and terms of service.
 *
 * Renders a heading and a list of links, using translations from the "Legal" namespace.
 */
export default function LegalPage() {
  const t = useTranslations('Legal');

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">{t('title')}</h1>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <Link href="/legal/privacy" className="text-blue-600 hover:underline">
            {t('privacyPolicy')}
          </Link>
        </li>
        <li>
          <Link href="/legal/terms" className="text-blue-600 hover:underline">
            {t('termsOfService')}
          </Link>
        </li>
      </ul>
    </div>
  );
}
