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
 * Format a currency amount for display
 * @param amount Amount in cents
 * @param currency Currency code (e.g., 'eur', 'usd')
 * @param locale Locale for formatting (e.g., 'en-US', 'pt-PT')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = 'eur', locale = 'pt-PT') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export function formatDate(date: Date, locale = 'en-US') {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatTimeOnly(date: Date, locale = 'en-US', timeZone?: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: 'numeric',
    timeZone,
  }).format(date);
}

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