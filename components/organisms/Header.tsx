"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Button } from "../atoms/button";
import type React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/molecules/dropdown-menu";
import { Globe, ChevronDown } from "lucide-react";
import { Icons } from "@/components/atoms/icons";
import { useLanguage } from "@/components/molecules/LanguageProvider";
import { translations as en } from "@/public/locales/en";
import { translations as pt } from "@/public/locales/pt";
import { translations as br } from "@/public/locales/br";
import { translations as es } from "@/public/locales/es";

const languageMap = {
  en,
  br,
  pt,
  es,
};

const Header: React.FC = () => {
  const { lang, setLang } = useLanguage();
  const t = languageMap[lang];
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isRootPath = pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed z-50 w-full justify-between px-6 transition-all lg:px-8 ${
        isRootPath
          ? isScrolled
            ? "pb-2 pt-2 shadow backdrop-blur supports-[backdrop-filter]:bg-elevaNeutral-100/70"
            : "bg-transparent pb-4 pt-6"
          : "bg-elevaNeutral-100 pb-2 pt-2 shadow"
      }`}
    >
      <div className={"mx-auto flex max-w-2xl lg:max-w-7xl"}>
        <Link
          href="/"
          className={`h-8 w-auto lg:h-12 ${isScrolled ? "text-eleva-primary hover:text-eleva-primary-light" : "text-eleva-neutral-100 hover:text-eleva-neutral-100/60"}`}
        >
          <Icons.elevaCareLogo className="h-8 w-auto lg:h-12" />
        </Link>
        <nav className="ml-auto flex items-center gap-4 sm:gap-6">
          <Link
            className={`hidden text-base font-medium transition-colors md:block ${isScrolled ? "text-eleva-primary hover:text-eleva-primary-light" : "text-eleva-neutral-100 hover:text-eleva-neutral-100/60"}`}
            href="#services"
          >
            {t.nav.services}
          </Link>
          <Link
            className={`hidden text-base font-medium transition-colors md:block ${isScrolled ? "text-eleva-primary hover:text-eleva-primary-light" : "text-eleva-neutral-100 hover:text-eleva-neutral-100/60"}`}
            href="#approach"
          >
            {t.nav.approach}
          </Link>
          <Link
            className={`hidden text-base font-medium transition-colors md:block ${isScrolled ? "text-eleva-primary hover:text-eleva-primary-light" : "text-eleva-neutral-100 hover:text-eleva-neutral-100/60"}`}
            href="#team"
          >
            {t.nav.team}
          </Link>
          <Link
            className={`hidden text-base font-medium transition-colors md:block ${isScrolled ? "text-eleva-primary hover:text-eleva-primary-light" : "text-eleva-neutral-100 hover:text-eleva-neutral-100/60"}`}
            href="#podcast"
          >
            {t.nav.podcast}
          </Link>
          <Link
            className={`hidden text-base font-medium transition-colors md:block ${isScrolled ? "text-eleva-primary hover:text-eleva-primary-light" : "text-eleva-neutral-100 hover:text-eleva-neutral-100/60"}`}
            href="#newsletter"
          >
            {t.nav.newsletter}
          </Link>

          <Button asChild>
            <SignedOut>
              <SignInButton>{t.nav.signIn}</SignInButton>
            </SignedOut>
          </Button>
          <Button asChild>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="default"
                className={`${isScrolled ? "text-eleva-primary hover:text-eleva-primary-light" : "text-eleva-neutral-100 hover:text-eleva-primary"}`}
              >
                <Globe className="mr-2 h-5 w-5" />
                {t.language}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setLang("en")}
                className={`cursor-pointer ${
                  lang === "en"
                    ? "bg-eleva-primary-light text-eleva-primary"
                    : "hover:bg-eleva-primary-light"
                }`}
              >
                English
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLang("pt")}
                className={`cursor-pointer ${
                  lang === "pt"
                    ? "bg-eleva-primary-light text-eleva-primary"
                    : "hover:bg-eleva-primary-light"
                }`}
              >
                Português (PT)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLang("br")}
                className={`cursor-pointer ${
                  lang === "br"
                    ? "bg-eleva-primary-light text-eleva-primary"
                    : "hover:bg-eleva-primary-light"
                }`}
              >
                Português (BR)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLang("es")}
                className={`cursor-pointer ${
                  lang === "es"
                    ? "bg-eleva-primary-light text-eleva-primary"
                    : "hover:bg-eleva-primary-light"
                }`}
              >
                Español
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
};

export default Header;
