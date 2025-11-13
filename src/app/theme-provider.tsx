'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering once mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Force light theme to prevent hydration mismatches
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {mounted ? children : null}
    </NextThemesProvider>
  );
}
