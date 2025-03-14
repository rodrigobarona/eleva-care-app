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
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = 'eur') {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount / 100);
}
