import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeToInt(time: string) {
  return Number.parseFloat(time.replace(':', '.'));
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Formats a numeric amount in cents as a localized currency string.
 *
 * @param amount - The amount in cents to format.
 * @param currency - The ISO 4217 currency code (e.g., 'eur', 'usd'). Defaults to 'eur'.
 * @param locale - The BCP 47 locale string for formatting (e.g., 'en-US', 'pt-PT'). Defaults to 'pt-PT'.
 * @returns The formatted currency string in the specified locale and currency.
 */
export function formatCurrency(amount: number, currency = 'eur', locale = 'pt-PT') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

/**
 * Formats a Date object into a localized string with the full month name, day, and year.
 *
 * @param date - The date to format.
 * @param locale - Optional BCP 47 language tag to determine the output language and formatting conventions. Defaults to 'en-US'.
 * @returns The formatted date string in the specified locale.
 */
export function formatDate(date: Date, locale = 'en-US') {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats a Date object to display only the hour and minute in the specified locale and optional time zone.
 *
 * @param date - The date and time to format.
 * @param locale - The locale string for formatting (default is 'en-US').
 * @param timeZone - Optional IANA time zone identifier to localize the output.
 * @returns A string representing the formatted hour and minute.
 */
export function formatTimeOnly(date: Date, locale = 'en-US', timeZone?: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: 'numeric',
    timeZone,
  }).format(date);
}

/**
 * Converts a duration in minutes to a human-readable string with hours and minutes, using localized labels.
 *
 * @param minutes - The total duration in minutes.
 * @param locale - The locale code for language formatting. Supports 'en' for English and defaults to Portuguese for other values.
 * @returns A string representing the duration in hours and minutes, with correct pluralization based on {@link locale}.
 */
export function formatDuration(minutes: number, locale = 'en') {
  if (minutes < 60) {
    return locale === 'en' ? `${minutes} min` : `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return locale === 'en' 
      ? `${hours} hour${hours !== 1 ? 's' : ''}` 
      : `${hours} hora${hours !== 1 ? 's' : ''}`;
  }

  return locale === 'en'
    ? `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} min`
    : `${hours} hora${hours !== 1 ? 's' : ''} ${remainingMinutes} min`;
}