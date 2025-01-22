"use client";

import type React from "react";
import { createContext, useContext } from "react";
import { useQueryState, parseAsStringLiteral } from "nuqs";

type Language = "en" | "pt" | "br" | "es";

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useQueryState(
    "lang",
    parseAsStringLiteral(["en", "pt", "br", "es"] as const).withDefault("en")
  );

  const value = {
    lang: lang as Language,
    setLang: (newLang: Language) => setLang(newLang),
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
