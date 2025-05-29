'use client';

import { Link, usePathname } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

interface NavLinkProps {
  href: string;
  isScrolled: boolean;
  isRootPath: boolean;
  children: React.ReactNode;
}

const NavLink = ({ href, isScrolled, isRootPath, children }: NavLinkProps) => (
  <Link
    // @ts-expect-error - Allow hash-based navigation which isn't in the routing configuration
    href={href}
    className={`rounded-full px-4 py-1 text-sm font-medium transition-colors hover:bg-white/10 hover:text-sidebar-accent-foreground ${
      isRootPath && !isScrolled ? 'text-white' : 'text-foreground'
    }`}
  >
    {children}
  </Link>
);

// Inline the logo SVG for better performance
const ElevaCareLogo = ({ className }: { className?: string }) => (
  <svg
    width="1801"
    height="357"
    viewBox="0 0 1801 357"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="ElevaCare Logo"
    role="img"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M0 179c0 87.1 70.9 158 158 158s158-70.9 158-158S245.1 21 158 21C70.9 21 0 91.9 0 179Zm9.9 0c0-81.6 66.4-148.1 148.1-148.1 21.2 0 41.4 4.5 59.7 12.5C137.9 170.5 106.4 267.6 93.8 312.5c-49.6-24-83.9-74.8-83.9-133.5ZM119.9 322.1c14.9-81 90.6-242.6 105.9-274.7 47.7 24.6 80.3 74.4 80.3 131.6 0 81.7-66.4 148.1-148.1 148.1-13.2 0-26-1.7-38.1-5Z"
    />
    <path d="M414.1 78.9H553.2v20.5H437.5v70.3h103.4v20.2H437.5v73.8h119.5v20.2H414.1V78.9Z" />
  </svg>
);

export function HeaderContent() {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('Header');
  const scrollRef = useRef<boolean>(false);

  // Check if we're on the homepage, including locale-prefixed routes
  // This handles paths like /, /pt, /es, /br, etc. as homepage equivalents
  const isRootPath = pathname === '/' || /^\/[a-z]{2}(-[a-z]{2})?$/.test(pathname);

  useEffect(() => {
    const handleScroll = () => {
      const shouldBeScrolled = window.scrollY > 0;
      if (scrollRef.current !== shouldBeScrolled) {
        scrollRef.current = shouldBeScrolled;
        setIsScrolled(shouldBeScrolled);
      }
    };

    // Check initial scroll position
    handleScroll();

    // Add scroll event listener with passive option for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header
      className={`fixed z-50 w-full justify-between px-6 transition-all lg:px-8 ${
        isRootPath && !isScrolled
          ? 'bg-transparent pb-4 pt-6'
          : 'bg-white/20 pb-2 pt-2 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex max-w-2xl lg:max-w-7xl">
        <Link
          href="/"
          className={`h-8 w-auto lg:h-12 ${
            isRootPath && !isScrolled ? 'text-white' : 'text-foreground'
          }`}
        >
          <ElevaCareLogo className="h-8 w-auto lg:h-12" />
        </Link>
        <nav className="ml-auto flex items-center gap-4 sm:gap-6">
          <NavLink href="/#experts" isScrolled={isScrolled} isRootPath={isRootPath}>
            {t('findExpert')}
          </NavLink>
          <NavLink href="/about" isScrolled={isScrolled} isRootPath={isRootPath}>
            {t('mission')}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
