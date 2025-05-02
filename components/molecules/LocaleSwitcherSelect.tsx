'use client';

import { usePathname, useRouter } from '@/lib/i18n/navigation';
import { useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import { type ChangeEvent, type ReactNode, useTransition } from 'react';

type Props = {
  children: ReactNode;
  defaultValue: string;
  label: string;
};

export default function LocaleSwitcherSelect({ children, defaultValue, label }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const params = useParams();

  function onSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value;
    console.log('Switching locale to:', nextLocale); // Debugging log

    startTransition(() => {
      try {
        // Known typing issue with next-intl and dynamic routes
        // @ts-expect-error - Params typing is handled differently for dynamic routes
        router.push({ pathname, params }, { locale: nextLocale });
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback to direct URL manipulation if the router method fails
        const currentPath = window.location.pathname;
        const newPath = currentPath.replace(`/${currentLocale}`, `/${nextLocale}`);
        window.location.href = newPath || `/${nextLocale}`;
      }
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
