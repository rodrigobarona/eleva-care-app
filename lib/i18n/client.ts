'use client';

import { useLocale } from 'next-intl';
import { usePathname as useNextPathname, useRouter as useNextRouter } from 'next/navigation';

// This is for client-side locale switching
export function useLocaleSwitch() {
  const locale = useLocale();
  const pathname = useNextPathname();
  const router = useNextRouter();

  const switchLocale = (newLocale: string) => {
    // Navigate to the same page but with a different locale
    // For Next.js 15.3 with next-intl 4.1.0, we use a simple approach
    // by replacing the current locale in the pathname

    // Get locale segment from pathname (if exists)
    const localePattern = /^\/(en|es|pt|br)(?:\/|$)/;
    const match = pathname.match(localePattern);

    if (match) {
      // Replace the existing locale prefix
      const newPath = pathname.replace(localePattern, `/${newLocale}/`);
      router.push(newPath);
    } else {
      // Add the locale prefix if none exists
      const newPath = `/${newLocale}${pathname}`;
      router.push(newPath);
    }
  };

  return {
    locale,
    switchLocale,
  };
}
