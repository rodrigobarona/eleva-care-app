'use client';

import { useRouter } from '@/i18n/navigation';
import { usePathname } from '@/i18n/navigation';
import { locales } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { useTransition } from 'react';

const localeNames = {
  en: 'English',
  es: 'Español',
  pt: 'Português (PT)',
  br: 'Português (BR)',
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onSelectChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value;

    startTransition(() => {
      // Use pathname to keep the user on the same page
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <label className="relative text-eleva-neutral-900 dark:text-eleva-neutral-100">
      <p className="sr-only">Select language</p>
      <select
        className="appearance-none bg-transparent py-2 pl-2 pr-8"
        defaultValue={locale}
        disabled={isPending}
        onChange={onSelectChange}
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeNames[loc as keyof typeof localeNames]}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
        {isPending ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
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
  );
}
