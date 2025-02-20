'use client';

import { parseAsStringLiteral, useQueryState } from 'nuqs';
import type React from 'react';
import { createContext, Suspense, useContext } from 'react';

type Language = 'en' | 'pt' | 'br' | 'es';

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function LanguageProviderContent({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useQueryState(
    'lang',
    parseAsStringLiteral(['en', 'pt', 'br', 'es'] as const).withDefault('en'),
  );

  const value = {
    lang: lang as Language,
    setLang: (newLang: Language) => setLang(newLang),
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Loading language settings...</div>}>
      <LanguageProviderContent>{children}</LanguageProviderContent>
    </Suspense>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
