import { hasLocale } from 'next-intl';
import { getRequestConfig, getTimeZone } from 'next-intl/server';

import { routing } from './routing';
import type { Locale } from './routing';

// Define a more flexible type for translation messages to handle arrays and complex objects
type MessageValue =
  | string
  | number
  | boolean
  | null
  | MessageValue[]
  | { [key: string]: MessageValue };

interface MessageObject {
  [key: string]: MessageValue;
}

export default getRequestConfig(async ({ requestLocale }) => {
  // `requestLocale` is the locale resolved by the middleware OR the [locale] param
  const requested = await requestLocale;
  console.log('[request.ts] Received requestLocale:', requested);

  // Validate the locale against our supported locales
  const locale: Locale = hasLocale(routing.locales, requested as string)
    ? (requested as Locale)
    : routing.defaultLocale;

  console.log('[request.ts] Resolved locale:', locale);

  // Load messages from JSON files
  let messages: MessageObject;
  try {
    // Dynamic import based on locale
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch (error) {
    console.error(`[request.ts] Failed to load messages for locale ${locale}:`, error);
    // Fallback to English if locale not found
    messages = (await import('@/messages/en.json')).default;
    console.log(`[request.ts] Falling back to 'en' messages.`);
  }

  return {
    locale,
    messages,
    timeZone: await getTimeZone(),
  };
});
