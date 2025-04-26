'use client';

import { type Locale, locales } from '@/locales';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const localeNames = {
  en: 'English',
  es: 'Español',
  pt: 'Português (PT)',
  br: 'Português (BR)',
};

export function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Extract current locale from URL path instead of query parameter
  const currentLocale = pathname.split('/')[1];
  const isValidLocale = locales.includes(currentLocale as Locale) ? currentLocale : 'en';

  const switchLocale = (newLocale: string) => {
    // Get the path without the locale prefix
    const pathWithoutLocale = pathname.replace(/^\/(en|es|pt|br)(?:\/|$)/, '/');

    // Create new path with the selected locale
    const newPath = `/${newLocale}${pathWithoutLocale}`;

    // Navigate to the new path
    router.push(newPath);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 text-sm font-medium text-eleva-neutral-900 dark:text-eleva-neutral-100"
      >
        <span>{localeNames[isValidLocale as keyof typeof localeNames] || 'English'}</span>
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
          title="Select language"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 overflow-hidden rounded-md bg-white shadow-md dark:bg-eleva-neutral-900">
          <ul className="py-1">
            {locales.map((locale) => (
              <li key={locale}>
                <button
                  type="button"
                  className={`block w-full px-4 py-2 text-left text-sm ${isValidLocale === locale ? 'dark:bg-eleva-neutral-800 bg-gray-100' : ''} dark:hover:bg-eleva-neutral-800 text-eleva-neutral-900 hover:bg-gray-50 dark:text-eleva-neutral-100`}
                  onClick={() => switchLocale(locale)}
                >
                  {localeNames[locale as keyof typeof localeNames]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
