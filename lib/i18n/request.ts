import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

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
  // Get the requested locale from the request
  const requested = await requestLocale;

  // Validate the locale against our supported locales
  const locale: Locale = hasLocale(routing.locales, requested as string)
    ? (requested as Locale)
    : routing.defaultLocale;

  // Load messages from JSON files
  let messages: MessageObject;
  try {
    // Dynamic import based on locale
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}`, error);
    // Fallback to English if locale not found
    messages = (await import('@/messages/en.json')).default;
  }

  return {
    locale,
    messages,
    // Optional: set time zone if needed
    timeZone: 'UTC',
  };
});
