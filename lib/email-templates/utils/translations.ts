/**
 * Email Template Translation Utilities
 * Integrates with existing /messages folder structure
 */
import { SupportedLocale } from '../types';

// Import types for better TypeScript support
type TranslationKey = string;
type TranslationParams = Record<string, string | number>;

/**
 * Asynchronously loads translation data for the specified locale from the messages folder.
 *
 * If loading fails, falls back to English translations. Returns an empty object if both the requested locale and English translations are unavailable.
 *
 * @param locale - The locale code to load translations for
 * @returns An object containing translation key-value pairs for the locale
 */
async function loadTranslations(locale: SupportedLocale): Promise<Record<string, unknown>> {
  try {
    // Dynamic import of translation files
    const translations = await import(`../../../messages/${locale}.json`);
    return translations.default || translations;
  } catch (error) {
    console.warn(`Failed to load translations for locale: ${locale}`, error);

    // Fallback to English if locale fails
    if (locale !== 'en') {
      return loadTranslations('en');
    }

    return {};
  }
}

/**
 * Retrieves a nested string value from an object using a dot-separated path.
 *
 * @param obj - The object to search within
 * @param path - Dot-separated string representing the nested key path (e.g., "notifications.welcome.subject")
 * @returns The string value at the specified path, or undefined if not found
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  return path.split('.').reduce((current: unknown, key: string): unknown => {
    return current && typeof current === 'object' && current !== null && key in current
      ? (current as Record<string, unknown>)[key]
      : undefined;
  }, obj) as string | undefined;
}

/**
 * Replaces placeholders in the form `{key}` within a template string using values from the provided parameters.
 *
 * If a placeholder key is not found in the parameters, the placeholder remains unchanged.
 *
 * @param template - The template string containing placeholders
 * @param params - An object mapping placeholder keys to their replacement values
 * @returns The template string with placeholders replaced by corresponding parameter values
 */
function replacePlaceholders(template: string, params: TranslationParams = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key]?.toString() || match;
  });
}

/**
 * Retrieves a translated email template string for the specified locale and key, replacing placeholders with provided parameters.
 *
 * If the translation is missing for the given locale, falls back to English. If still unavailable, returns the key itself.
 *
 * @param locale - The target locale for translation
 * @param key - The dot-separated key identifying the translation string
 * @param params - Optional parameters to replace placeholders in the translation
 * @returns The translated and formatted string, or the key if no translation is found
 */
export async function translateEmail(
  locale: SupportedLocale,
  key: TranslationKey,
  params: TranslationParams = {},
): Promise<string> {
  const translations = await loadTranslations(locale);
  const value = getNestedValue(translations, key);

  if (typeof value === 'string') {
    return replacePlaceholders(value, params);
  }

  // If translation not found, try English fallback
  if (locale !== 'en') {
    return translateEmail('en', key, params);
  }

  // Final fallback - return the key itself
  console.warn(`Translation not found for key: ${key} in locale: ${locale}`);
  return key;
}

/**
 * Retrieves a set of localized strings and metadata for email headers, footers, and notifications.
 *
 * Returns an object containing translated values for common email elements, legal terms, social links, language metadata, and the full notifications translations for the specified locale.
 */
export async function getEmailTranslations(locale: SupportedLocale) {
  const translations = await loadTranslations(locale);

  return {
    // Common email elements
    unsubscribe: await translateEmail(locale, 'notifications.unsubscribe', {}),
    contactUs: await translateEmail(locale, 'notifications.contactUs', {}),
    team: await translateEmail(locale, 'notifications.team', {}),

    // Header elements
    brandName: 'Eleva Care', // Brand name stays consistent

    // Footer elements
    companyName: 'Eleva Care',
    allRightsReserved: await translateEmail(locale, 'notifications.allRightsReserved', {}),
    privacyPolicy: await translateEmail(locale, 'Legal.privacyPolicy', {}),
    termsOfService: await translateEmail(locale, 'Legal.termsOfService', {}),

    // Social links (if needed)
    followUs: await translateEmail(locale, 'notifications.followUs', {}),

    // Get language-specific metadata
    language: translations.language || locale.toUpperCase(),

    // Full translations object for complex templates
    notifications: translations.notifications || {},
  };
}

/**
 * Normalizes a locale input string to a supported locale code.
 *
 * Converts various locale representations to one of the supported locale codes: 'en', 'es', 'pt', or 'br'. Defaults to 'en' if the input is missing or unrecognized.
 *
 * @param input - The locale string to normalize
 * @returns The normalized supported locale code
 */
export function normalizeLocale(input?: string): SupportedLocale {
  if (!input) return 'en';

  const lower = input.toLowerCase();

  // Handle specific cases
  if (lower.includes('br') || lower === 'pt-br') return 'br';
  if (lower.startsWith('pt')) return 'pt';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('en')) return 'en';

  // Default fallback
  return 'en';
}

/**
 * Formats a Date object into a locale-specific string for email content.
 *
 * Uses the appropriate locale conventions for date and time formatting, with optional overrides.
 *
 * @param date - The date to format
 * @param locale - The supported locale code
 * @param options - Optional formatting options to override defaults
 * @returns The formatted date string
 */
export function formatEmailDate(
  date: Date,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const localeMap = {
    en: 'en-US',
    es: 'es-ES',
    pt: 'pt-PT',
    br: 'pt-BR',
  };

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };

  return new Intl.DateTimeFormat(localeMap[locale], defaultOptions).format(date);
}

/**
 * Formats a numeric amount as a currency string according to the specified locale.
 *
 * @param amount - The monetary value to format
 * @param locale - The supported locale code for formatting
 * @param currency - The ISO 4217 currency code to use (defaults to 'EUR')
 * @returns The formatted currency string for the given locale and currency
 */
export function formatEmailCurrency(
  amount: number,
  locale: SupportedLocale,
  currency: string = 'EUR',
): string {
  const localeMap = {
    en: 'en-US',
    es: 'es-ES',
    pt: 'pt-PT',
    br: 'pt-BR',
  };

  return new Intl.NumberFormat(localeMap[locale], {
    style: 'currency',
    currency,
  }).format(amount);
}

const translationUtils = {
  translateEmail,
  getEmailTranslations,
  normalizeLocale,
  formatEmailDate,
  formatEmailCurrency,
};

export default translationUtils;
