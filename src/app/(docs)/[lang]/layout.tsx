import type { ReactNode } from 'react';

/**
 * Language-specific documentation layout
 *
 * This layout handles the [lang] parameter for i18n support.
 */

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function LangDocsLayout({ children }: LayoutProps) {
  return <>{children}</>;
}

/**
 * Generate static params for all supported languages
 */
export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'es' }, { lang: 'pt' }, { lang: 'pt-BR' }];
}

