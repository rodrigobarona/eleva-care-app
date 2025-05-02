'use client';

import { Icons } from '@/components/atoms/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavLinkProps {
  href: string;
  isScrolled: boolean;
  isRootPath: boolean;
  children: React.ReactNode;
}

const NavLink = ({ href, isScrolled, isRootPath, children }: NavLinkProps) => (
  <Link
    href={href}
    className={`rounded-full px-4 py-1 text-sm font-medium transition-colors hover:bg-white/10 hover:text-sidebar-accent-foreground ${
      isRootPath && !isScrolled ? 'text-white' : 'text-foreground'
    }`}
  >
    {children}
  </Link>
);

/**
 * Renders the website header with navigation links, adapting its appearance based on scroll position and current path.
 *
 * The header displays a logo and navigation links, applying transparent or blurred backgrounds and text color changes depending on whether the user is on the homepage (including locale-prefixed root paths) and whether the page has been scrolled.
 *
 * @remark
 * Considers both the root path ("/") and locale-prefixed root paths (e.g., "/pt", "/es", "/br", "/en-us") as the homepage for styling purposes.
 */
export function HeaderContent() {
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  // Check if we're on the homepage, including locale-prefixed routes
  // This handles paths like /, /pt, /es, /br, etc. as homepage equivalents
  const isRootPath = pathname === '/' || /^\/[a-z]{2}(-[a-z]{2})?$/.test(pathname);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    // Check initial scroll position
    handleScroll();

    // Add scroll event listener with passive option for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (!mounted) {
    return (
      <header className="fixed z-50 w-full justify-between px-6 transition-all lg:px-8">
        <div className="mx-auto flex max-w-2xl lg:max-w-7xl">
          <div className="h-8 w-auto lg:h-12" />
        </div>
      </header>
    );
  }

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
          <Icons.elevaCareLogo className="h-8 w-auto lg:h-12" />
        </Link>
        <nav className="ml-auto flex items-center gap-4 sm:gap-6">
          <NavLink href="/#experts" isScrolled={isScrolled} isRootPath={isRootPath}>
            Find an Expert
          </NavLink>
          <NavLink href="/about" isScrolled={isScrolled} isRootPath={isRootPath}>
            Our Mission
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
