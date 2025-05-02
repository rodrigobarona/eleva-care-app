'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';
import { useEffect, useState } from 'react';

/**
 * Provides a theme context that enforces the light theme and prevents hydration mismatches by rendering children only after client-side mounting.
 *
 * @param children - React nodes to be rendered within the theme context.
 *
 * @remark
 * Children are not rendered until the component has mounted on the client to avoid hydration issues.
 */
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
