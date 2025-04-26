'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { locales } from '@/locales';

const localeNames = {
  en: 'English',
  es: 'Español',
  pt: 'Português (PT)',
  br: 'Português (BR)'
};

export function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  // Extract current locale from URL query parameter
  const currentLocale = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('lang') || 'en';
  
  const switchLocale = (newLocale: string) => {
    // Use URL parameters for simplicity
    const params = new URLSearchParams(window.location.search);
    params.set('lang', newLocale);
    
    // Update URL without full page reload
    router.push(`${pathname}?${params.toString()}`);
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 text-sm font-medium text-eleva-neutral-900 dark:text-eleva-neutral-100"
      >
        <span>{localeNames[currentLocale as keyof typeof localeNames] || 'English'}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-eleva-neutral-900 shadow-md rounded-md overflow-hidden z-50">
          <ul className="py-1">
            {locales.map(locale => (
              <li key={locale}>
                <button
                  className={`block w-full text-left px-4 py-2 text-sm 
                    ${currentLocale === locale ? 'bg-gray-100 dark:bg-eleva-neutral-800' : ''}
                    hover:bg-gray-50 dark:hover:bg-eleva-neutral-800
                    text-eleva-neutral-900 dark:text-eleva-neutral-100`}
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