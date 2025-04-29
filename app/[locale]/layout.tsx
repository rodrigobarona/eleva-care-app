import { ErrorBoundaryWrapper } from '@/components/molecules/ErrorBoundaryWrapper';
import { type Locale, locales } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Alexandria, JetBrains_Mono, Lora } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type React from 'react';

import '../globals.css';
import { ClientProviders, Providers } from '../providers';
import { ThemeProvider } from '../theme-provider';

const lora = Lora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lora',
});
const alexandria = Alexandria({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-alexandria',
});
const jetBrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

// Updated Props type with params as Promise for Next.js 15.3 internationalization
type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  // Await params before using locale
  const { locale } = await params;

  // Get messages for the specified locale
  setRequestLocale(locale);
  const messages = await getMessages();

  // Access metadata translations
  const meta = messages.metadata as {
    title: string;
    description: string;
    og: {
      title: string;
      description: string;
      siteName: string;
    };
  };

  // Fallback to English if translations are missing
  const title = meta?.title || 'Expert care for Pregnancy, Postpartum & Sexual Health | Eleva Care';
  const description =
    meta?.description ||
    'Eleva Care: Empowering growth, embracing care. Expert care for pregnancy, postpartum, menopause, and sexual health.';

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      url: 'https://eleva.care',
      siteName: meta?.og?.siteName || 'Eleva Care',
      title: meta?.og?.title || title,
      description: meta?.og?.description || description,
      images: [
        {
          url: 'https://eleva.care/img/eleva-care-share.svg',
          width: 1200,
          height: 680,
          alt: 'Eleva Care',
        },
      ],
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={cn(
        `${alexandria.variable} ${lora.variable} ${jetBrains.variable}`,
        'scroll-smooth',
      )}
      suppressHydrationWarning
    >
      <head />
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <ErrorBoundaryWrapper>
            <Providers>
              <NuqsAdapter>
                <ClientProviders locale={locale} messages={messages}>
                  {children}
                </ClientProviders>
              </NuqsAdapter>
            </Providers>
          </ErrorBoundaryWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}

// Generate static parameters for all locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
