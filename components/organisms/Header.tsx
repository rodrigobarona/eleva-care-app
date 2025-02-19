'use client';

import type React from 'react';
import { useEffect, useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { ChevronDown, Globe } from 'lucide-react';

import { Button } from '@/components/atoms/button';
import { Icons } from '@/components/atoms/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/molecules/dropdown-menu';
import { useLanguage } from '@/components/molecules/LanguageProvider';

import { translations as br } from '@/public/locales/br';
import { translations as en } from '@/public/locales/en';
import { translations as es } from '@/public/locales/es';
import { translations as pt } from '@/public/locales/pt';

const languageMap = {
  en,
  br,
  pt,
  es,
};

const NavLink = ({
  href,
  isScrolled,
  children,
}: {
  href: string;
  isScrolled: boolean;
  children: React.ReactNode;
}) => (
  <Link
    className={`hidden text-base font-medium transition-colors md:block ${
      isScrolled
        ? 'text-eleva-primary hover:text-eleva-primary-light'
        : 'text-eleva-neutral-100 hover:text-eleva-neutral-100/60'
    }`}
    href={href}
  >
    {children}
  </Link>
);

const Header = () => {
  const { lang, setLang } = useLanguage();
  const t = languageMap[lang];
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isRootPath = pathname === '/';

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    handleScroll(); // Check initial scroll position
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
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
        isRootPath
          ? isScrolled
            ? 'supports-[backdrop-filter]:bg-elevaNeutral-100/70 pb-2 pt-2 shadow backdrop-blur'
            : 'bg-transparent pb-4 pt-6'
          : 'bg-elevaNeutral-100 pb-2 pt-2 shadow'
      }`}
    >
      <div className="mx-auto flex max-w-2xl lg:max-w-7xl">
        <Link
          href="/"
          className={`h-8 w-auto lg:h-12 ${
            isScrolled
              ? 'text-eleva-primary hover:text-eleva-primary-light'
              : 'text-eleva-neutral-100 hover:text-eleva-neutral-100/60'
          }`}
        >
          <Icons.elevaCareLogo className="h-8 w-auto lg:h-12" />
        </Link>
        <nav className="ml-auto flex items-center gap-4 sm:gap-6">
          <NavLink href="#services" isScrolled={isScrolled}>
            {t.nav.services}
          </NavLink>
          <NavLink href="#approach" isScrolled={isScrolled}>
            {t.nav.approach}
          </NavLink>
          <NavLink href="#team" isScrolled={isScrolled}>
            {t.nav.team}
          </NavLink>
          <NavLink href="#podcast" isScrolled={isScrolled}>
            {t.nav.podcast}
          </NavLink>
          <NavLink href="#newsletter" isScrolled={isScrolled}>
            {t.nav.newsletter}
          </NavLink>

          <div className="flex items-center gap-2">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="default" size="default">
                  {t.nav.signIn}
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8',
                  },
                }}
              />
            </SignedIn>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="default"
                  className={`${
                    isScrolled
                      ? 'text-eleva-primary hover:text-eleva-primary-light'
                      : 'text-eleva-neutral-100 hover:text-eleva-primary'
                  }`}
                >
                  <Globe className="mr-2 h-5 w-5" />
                  {t.language}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'pt', label: 'Português (PT)' },
                  { code: 'br', label: 'Português (BR)' },
                  { code: 'es', label: 'Español' },
                ].map(({ code, label }) => (
                  <DropdownMenuItem
                    key={code}
                    onClick={() => setLang(code as 'en' | 'pt' | 'br' | 'es')}
                    className={`cursor-pointer ${
                      lang === code
                        ? 'bg-eleva-primary-light text-eleva-primary'
                        : 'hover:bg-eleva-primary-light'
                    }`}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
