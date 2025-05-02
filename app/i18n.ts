import { type Locale, locales } from '@/lib/i18n/routing';
import { notFound } from 'next/navigation';

// Validate if a given locale is supported by the application
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

// Function to load messages for a locale
async function loadMessages(locale: string) {
  try {
    return (await import(`../messages/${locale}.json`)).default;
  } catch (error) {
    console.error(`Error loading messages for locale ${locale}:`, error);
    throw new Error(`Failed to load messages for locale: ${locale}`);
  }
}

// Get messages for a validated locale, throwing notFound for invalid locales
export async function getMessages(locale: string) {
  if (!isValidLocale(locale)) {
    console.error(`Invalid locale requested: ${locale}`);
    notFound();
  }

  try {
    return await loadMessages(locale);
  } catch (error) {
    console.error('Failed to load messages:', error);
    // Return empty dictionary as fallback to prevent complete failure
    return {};
  }
}

// Validate locale and return dictionary
export default async function getDictionary(locale: string) {
  // Validate locale is one of the supported locales
  if (!isValidLocale(locale)) {
    console.error(`Unsupported locale: ${locale}`);
    notFound();
  }

  console.log(`Loading dictionary for locale: ${locale}`);
  return getMessages(locale);
}
