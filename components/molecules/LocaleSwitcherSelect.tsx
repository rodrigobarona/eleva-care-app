'use client';

import { usePathname, useRouter } from '@/lib/i18n/navigation';
import { useParams } from 'next/navigation';
import { type ChangeEvent, type ReactNode, useTransition } from 'react';
import { useEffect, useState } from 'react';

type Props = {
  children: ReactNode;
  defaultValue: string;
  label: string;
};

export default function LocaleSwitcherSelect({ children, defaultValue, label }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const params = useParams();
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll events to change text color
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 20);
    };

    // Set initial state
    handleScroll();

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);

    // Cleanup
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function onSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value;
    console.log('Switching locale to:', nextLocale); // Debugging log
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- TypeScript will validate that only known `params`
        // are used in combination with a given `pathname`. Since the two will
        // always match for the current route, we can skip runtime checks.
        { pathname, params },
        { locale: nextLocale },
      );
    });
  }

  const textColorClass = isScrolled
    ? 'text-eleva-neutral-900 dark:text-eleva-neutral-100'
    : 'text-white dark:text-eleva-neutral-100';

  return (
    <label className={`relative ${textColorClass} transition-colors duration-300`}>
      <p className="sr-only">{label}</p>
      <select
        className="appearance-none bg-transparent py-2 pl-2 pr-8"
        defaultValue={defaultValue}
        disabled={isPending}
        onChange={onSelectChange}
      >
        {children}
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
