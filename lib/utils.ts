import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeToInt(time: string) {
  return Number.parseFloat(time.replace(':', '.'));
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
