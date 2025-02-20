'use client';

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
} as const;

type Language = keyof typeof languageMap;

interface NavLinkProps {
  href: string;
  isScrolled: boolean;
  children: React.ReactNode;
}

const NavLink = ({ href, isScrolled, children }: NavLinkProps) => (
  <Link
    href={href}
    className={`text-sm font-medium transition-colors hover:text-sidebar-accent-foreground ${
      isScrolled ? 'text-foreground' : 'text-white'
    }`}
  >
    {children}
  </Link>
);

export function HeaderContent() {
  const { lang, setLang } = useLanguage();
  const t = languageMap[lang as Language];
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isRootPath = pathname === '/';

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
            isRootPath && !isScrolled ? 'text-white' : 'text-foreground'
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
                <Button
                  variant={isRootPath && !isScrolled ? 'outline' : 'default'}
                  size="default"
                  className={isRootPath && !isScrolled ? 'border-white text-white' : ''}
                >
                  {t.nav.signIn}
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton
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
                  size="icon"
                  className={`${isRootPath && !isScrolled ? 'text-white hover:text-white/90' : ''}`}
                >
                  <Globe className="h-4 w-4" />
                  <ChevronDown className="ml-1 h-3 w-3" />
                  <span className="sr-only">Toggle language</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLang('en')}>English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('es')}>Español</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('pt')}>Português</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('br')}>Português (BR)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </div>
    </header>
  );
}
