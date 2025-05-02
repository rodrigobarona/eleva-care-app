import { routing } from '@/lib/i18n/routing';
import { useLocale } from 'next-intl';

import LocaleSwitcherSelect from './LocaleSwitcherSelect';

// Define fallback translations for language names
const localeNames = {
  en: 'English',
  es: 'Español',
  pt: 'Português (PT)',
  br: 'Português (BR)',
};

/**
 * Renders a language selection dropdown for switching between available locales.
 *
 * Displays the current locale as the default selection and lists all supported locales with their display names.
 */
export function LanguageSwitcher() {
  const locale = useLocale();

  // For simplicity, we'll always use the static labels
  // Replace with useTranslations('LocaleSwitcher') if you add the namespace
  const label = 'Select language';

  const getLocaleName = (localeCode: string) => {
    return localeNames[localeCode as keyof typeof localeNames] || localeCode;
  };

  return (
    <LocaleSwitcherSelect defaultValue={locale} label={label}>
      {routing.locales.map((cur) => (
        <option key={cur} value={cur}>
          {getLocaleName(cur)}
        </option>
      ))}
    </LocaleSwitcherSelect>
  );
}
