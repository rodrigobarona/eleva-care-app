'use client';

import { usePathname, useRouter } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { useParams } from 'next/navigation';
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
 * When `pathnames` are configured in routing (including dynamic routes),
 * we pass both pathname and params to enable type-safe navigation.
 * The `@ts-expect-error` is the official next-intl pattern for this case.
 *
 * @see https://next-intl.dev/docs/routing/navigation#change-locale
 *
 * @example
 * ```tsx
 * <LocaleSwitcherSelect defaultValue="en" label="Select language">
 *   <option value="en">English</option>
 *   <option value="pt">Português</option>
 * </LocaleSwitcherSelect>
 * ```
 */
export default function LocaleSwitcherSelect({ children, defaultValue, label }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  function onSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value as Locale;

    startTransition(() => {
      // When routing has `pathnames` configured, pass both pathname and params.
      // TypeScript can't verify at compile time that pathname and params match,
      // but at runtime they always will (they come from the same route).
      // This is the official next-intl approach for locale switching.
      // @ts-expect-error -- pathname and params always match at runtime
      router.replace({ pathname, params }, { locale: nextLocale });
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
          className="appearance-none bg-transparent py-1 pr-6 pl-1 text-sm font-medium"
          defaultValue={defaultValue}
          disabled={isPending}
          onChange={onSelectChange}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2">
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
