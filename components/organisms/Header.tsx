import { SignInButton, SignUpButton, SignedOut } from "@clerk/nextjs";
import { Button } from "../atoms/button";

import type React from "react"; // Added useState import
import { useState, useEffect } from "react";
import Link from "next/link"; // Adjusted import to default export

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/molecules/dropdown-menu";
import { Globe, ChevronDown } from "lucide-react";
import ElevaCareLogoSVG from "@/components/atoms/eleva-care-logo";

type Language = "en" | "pt" | "br" | "es"; // Use 'type' to import as a type

// Define the props type for Header
type HeaderProps = {
  t: any;
  setLang: (lang: Language) => void; // Ensure setLang accepts Language type
};

const Header: React.FC<HeaderProps> = ({ t, setLang }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0); // Set isScrolled based on scroll position
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll); // Cleanup
  }, []);
  return (
    <header
      className={`fixed z-50 w-full justify-between px-6 transition-all lg:px-8 ${
        isScrolled
          ? "pb-2 pt-2 shadow backdrop-blur supports-[backdrop-filter]:bg-elevaNeutral-100/70"
          : "bg-transparent pb-4 pt-6"
      }`}
    >
      <div className={"mx-auto flex max-w-2xl lg:max-w-7xl"}>
        <Link
          href="https://eleva.care"
          className={`h-8 w-auto lg:h-12 ${isScrolled ? "text-elevaPrimary hover:text-elevaPrimary-light" : "text-elevaNeutral-100 hover:text-elevaNeutral-100/60"}`}
        >
          <ElevaCareLogoSVG className="h-8 w-auto lg:h-12" />
        </Link>
        <nav className="ml-auto flex items-center gap-4 sm:gap-6">
          <Link
            className={`hidden text-base font-medium transition-colors md:block ${isScrolled ? "text-elevaPrimary hover:text-elevaPrimary-light" : "text-elevaNeutral-100 hover:text-elevaNeutral-100/60"}`}
            href="#services"
          >
            {t.nav.services}
          </Link>
          <Link
            className={`hidden text-base font-medium transition-colors md:block ${isScrolled ? "text-elevaPrimary hover:text-elevaPrimary-light" : "text-elevaNeutral-100 hover:text-elevaNeutral-100/60"}`}
            href="#approach"
          >
            {t.nav.approach}
          </Link>
          <Link
            className={`hidden text-base font-medium transition-colors md:block ${isScrolled ? "text-elevaPrimary hover:text-elevaPrimary-light" : "text-elevaNeutral-100 hover:text-elevaNeutral-100/60"}`}
            href="#team"
          >
            {t.nav.team}
          </Link>
          <Link
            className={`hidden text-base font-medium transition-colors md:block ${isScrolled ? "text-elevaPrimary hover:text-elevaPrimary-light" : "text-elevaNeutral-100 hover:text-elevaNeutral-100/60"}`}
            href="#podcast"
          >
            {t.nav.podcast}
          </Link>
          <Link
            className={`hidden text-base font-medium transition-colors md:block ${isScrolled ? "text-elevaPrimary hover:text-elevaPrimary-light" : "text-elevaNeutral-100 hover:text-elevaNeutral-100/60"}`}
            href="#newsletter"
          >
            {t.nav.newsletter}
          </Link>

          <SignedOut>
            <SignInButton />
            <SignUpButton />
          </SignedOut>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="default"
                className={`${isScrolled ? "text-elevaPrimary hover:text-elevaPrimary-light" : "text-elevaNeutral-100 hover:text-elevaPrimary"}`}
              >
                <Globe className="mr-2 h-5 w-5" />
                {t.language}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setLang("en")}
                className="cursor-pointer hover:bg-elevaPrimary-light"
              >
                English
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLang("pt")}
                className="cursor-pointer"
              >
                Português (PT)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLang("br")}
                className="cursor-pointer"
              >
                Português (BR)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLang("es")}
                className="cursor-pointer"
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
