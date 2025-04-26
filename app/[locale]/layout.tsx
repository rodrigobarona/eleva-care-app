import { ErrorBoundaryWrapper } from '@/components/molecules/ErrorBoundaryWrapper';
import { type Locale, locales } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Alexandria, JetBrains_Mono, Lora } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type React from 'react';

import '../globals.css';
import { ClientProviders, Providers } from '../providers';

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

export const metadata: Metadata = {
  title: 'Expert care for Pregnancy, Postpartum & Sexual Health | Eleva Care',
  description:
    'Eleva Care: Empowering growth, embracing care. Expert care for pregnancy, postpartum, menopause, and sexual health.',
  openGraph: {
    type: 'website',
    url: 'https://eleva.care',
    siteName: 'Eleva Care',
    title: 'Expert care for Pregnancy, Postpartum & Sexual Health | Eleva Care',
    description:
      'Eleva Care: Empowering growth, embracing care. Expert care for pregnancy, postpartum, menopause, and sexual health.',
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

// Updated Props type with params as Promise for Next.js 15.3 internationalization
type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// Type for messages
type Messages = Record<string, unknown>;

// Synchronous client component that can use hooks
function LocaleLayoutContent({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: Messages;
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <html
        lang={locale}
        className={cn(
          `${alexandria.variable} ${lora.variable} ${jetBrains.variable}`,
          'scroll-smooth',
        )}
        suppressHydrationWarning
      >
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
          <ErrorBoundaryWrapper>
            <NuqsAdapter>
              <ClientProviders>
                <NextIntlClientProvider locale={locale} messages={messages}>
                  {children}
                </NextIntlClientProvider>
              </ClientProviders>
            </NuqsAdapter>
          </ErrorBoundaryWrapper>
        </body>
      </html>
    </Providers>
  );
}

export default async function LocaleLayout({ children, params }: Props) {
  // Await the params to get the locale
  const { locale } = await params;

  // Validate that the incoming locale is valid
  const isValidLocale = (loc: string): loc is Locale => {
    return (locales as readonly string[]).includes(loc);
  };

  if (!isValidLocale(locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Get messages for server
  const messages = await getMessages();

  return (
    <LocaleLayoutContent locale={locale} messages={messages}>
      {children}
    </LocaleLayoutContent>
  );
}
