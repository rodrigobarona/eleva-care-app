import { ErrorBoundaryWrapper } from '@/components/molecules/ErrorBoundaryWrapper';
import { LanguageProvider } from '@/components/molecules/LanguageProvider';
import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import { Alexandria, JetBrains_Mono, Lora } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type React from 'react';

import './globals.css';
import { ClientProviders, Providers } from './providers';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <html
        lang="en"
        className={cn(
          `${alexandria.variable} ${lora.variable} ${jetBrains.variable}`,
          'scroll-smooth',
        )}
        suppressHydrationWarning
      >
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body className="bg-background min-h-screen font-sans antialiased" suppressHydrationWarning>
          <ErrorBoundaryWrapper>
            <NuqsAdapter>
              <ClientProviders>
                <LanguageProvider>{children}</LanguageProvider>
              </ClientProviders>
            </NuqsAdapter>
          </ErrorBoundaryWrapper>
        </body>
      </html>
    </Providers>
  );
}
