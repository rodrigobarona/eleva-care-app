import { getRequestConfig } from 'next-intl/server';

import { defaultLocale, type Locale, locales } from './i18n/routing';

export default getRequestConfig(async ({ locale: requestLocale }) => {
  // Get the locale from the request (next-intl will detect it from the URL)
  let locale = requestLocale;

  // Validate the locale
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  // Load messages from JSON files
  let messages: Record<string, unknown>;
  try {
    // Dynamic import based on locale
    messages = (await import(`./messages/${locale}.json`)).default;
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}`, error);
    // Fallback to English if locale not found
    messages = (await import('./messages/en.json')).default;
  }

  return {
    locale,
    messages,
    // Optionally add timeZone if needed
    timeZone: 'UTC',
  };
});
