'use client';

import { defaultLocale } from '@/lib/i18n/routing';
import type { Locale } from '@/lib/i18n/routing';
import { useLocale } from 'next-intl';
import { type ChangeEvent, type ReactNode, useTransition } from 'react';

type Props = {
  children: ReactNode;
  defaultValue: string;
  label: string;
};

export default function LocaleSwitcherSelect({ children, defaultValue, label }: Props) {
  const [isPending, startTransition] = useTransition();
  const currentLocale = useLocale();

  function onSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value as Locale;
    console.log('Switching locale to:', nextLocale); // Debugging log

    startTransition(() => {
      // Set cookie to remember this locale
      document.cookie = `ELEVA_LOCALE=${nextLocale};max-age=31536000;path=/`;

      // Use direct URL manipulation which handles dynamic routes better in this case
      // Get current URL and parse it
      const url = new URL(window.location.href);
      const pathParts = url.pathname.split('/');

      // Check if the first segment is a locale
      if (pathParts[1] === currentLocale) {
        // Replace the locale segment
        pathParts[1] = nextLocale;
      } else {
        // Insert the locale after the first slash
        pathParts.splice(1, 0, nextLocale);
      }

      // Construct new path, handling case where nextLocale is default locale
      let newPath = pathParts.join('/');
      if (nextLocale === defaultLocale && pathParts.length > 2) {
        // For default locale, we might want to remove the locale prefix
        // (depending on your localePrefix setting)
        newPath = `/${pathParts.slice(2).join('/')}`;
      }

      // Navigate to new URL, preserving query parameters
      window.location.href = `${url.origin}${newPath}${url.search}`;
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
