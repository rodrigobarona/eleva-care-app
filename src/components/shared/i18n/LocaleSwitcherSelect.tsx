'use client';

import { usePathname, useRouter } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { type ChangeEvent, type ReactNode, useTransition } from 'react';

type Props = {
  children: ReactNode;
  defaultValue: string;
  label: string;
};

/**
 * Locale Switcher Select Component
 *
 * Uses next-intl's navigation utilities to handle locale switching correctly.
 * This ensures proper URL construction for all routes, including:
 * - Default locale (en): /help/patient, /about
 * - Other locales: /pt/help/patient, /pt/about
 *
 * The `useRouter().replace()` method handles the locale prefix automatically
 * based on the `localePrefix: 'as-needed'` configuration.
 */
export default function LocaleSwitcherSelect({ children, defaultValue, label }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  function onSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value as Locale;

    startTransition(() => {
      // Use next-intl's router to handle locale switching
      // This automatically handles the locale prefix based on routing config
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <div className="flex items-center gap-1 text-sm text-gray-600">
      {/* World Globe Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mr-1"
        aria-hidden="true"
      >
        <title>Language</title>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        <path d="M2 12h20" />
      </svg>

      <label className="relative">
        <span className="sr-only">{label}</span>
        <select
          className="appearance-none bg-transparent py-1 pl-1 pr-6 text-sm font-medium"
          defaultValue={defaultValue}
          disabled={isPending}
          onChange={onSelectChange}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2">
          {isPending ? (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-t-transparent" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <title>Dropdown Arrow</title>
              <path d="m6 9 6 6 6-6" />
            </svg>
          )}
        </span>
      </label>
    </div>
  );
}
