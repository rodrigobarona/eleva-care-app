/**
 * Email Template Translation Utilities
 * Integrates with existing /messages folder structure
 */
import { SupportedLocale } from '../types';

// Import types for better TypeScript support
type TranslationKey = string;
type TranslationParams = Record<string, string | number>;

/**
 * Load translations from the messages folder
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
 * Get nested translation value using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  return path.split('.').reduce((current: unknown, key: string): unknown => {
    return current && typeof current === 'object' && current !== null && key in current
      ? (current as Record<string, unknown>)[key]
      : undefined;
  }, obj) as string | undefined;
}

/**
 * Replace placeholders in translation strings
 */
function replacePlaceholders(template: string, params: TranslationParams = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key]?.toString() || match;
  });
}

/**
 * Main translation function for email templates
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
 * Get email-specific translations for headers and footers
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
 * Determine locale from various inputs
 */
export function normalizeLocale(input?: string): SupportedLocale {
  if (!input) return 'en';

  const lower = input.toLowerCase();

  // Handle specific cases - prioritize pt-BR for Brazilian Portuguese
  // Support backward compatibility for legacy 'br' locale
  if (lower === 'pt-br' || lower === 'br') return 'pt-BR';
  if (lower.startsWith('pt')) return 'pt';
  if (lower.startsWith('es')) return 'es';
  if (lower.startsWith('en')) return 'en';

  // Default fallback
  return 'en';
}

/**
 * Convert legacy locale codes to new BCP 47 format
 * Provides backward compatibility
 */
export function convertLegacyLocale(locale: string): SupportedLocale {
  // Handle legacy 'br' to 'pt-BR' conversion
  if (locale === 'br') return 'pt-BR';

  return normalizeLocale(locale);
}

/**
 * Get locale-specific date formatting
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
    'pt-BR': 'pt-BR',
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
 * Get locale-specific currency formatting
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
    'pt-BR': 'pt-BR',
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
  convertLegacyLocale,
  formatEmailDate,
  formatEmailCurrency,
};

export default translationUtils;
