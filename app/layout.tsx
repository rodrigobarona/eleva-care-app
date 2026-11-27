import { ClientProviders } from '@/app/providers';
import { ErrorBoundaryWrapper } from '@/components/shared/error/ErrorBoundaryWrapper';
import { defaultLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { DM_Sans, IBM_Plex_Mono, Lora } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

// Import global CSS
import './globals.css';

// ## Font definitions
// Here’s a system that balances warmth, trust, and clarity across digital and print:

// ### Lora (Serif)
// For: Article body, quotes, hero headlines
// - Elegant but readable
// - Slightly feminine curves
// - Works beautifully in print and digital
// - Makes your content feel reliable, caring, editorial
const lora = Lora({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '600'], // 400: regular, 600: semibold
  variable: '--font-lora',
  preload: true,
  adjustFontFallback: true,
});

// ### DM Sans (Sans-Serif)
// For: UI text, buttons, forms, dashboards, navigation
// - Friendly, rounded, very readable
// - Pairs well with a soft serif like Lora
// - Great for mobile + dashboard UI
const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '700'], // 400: regular, 500: medium, 700: bold
  variable: '--font-dm-sans',
  preload: true,
  adjustFontFallback: true,
});

// ### IBM Plex Mono (Mono)
// For: Code, structured data, or secure transaction IDs
// - Modern and clean
// - Has a humanist touch (not too tech-heavy)
// - Good for confidence in secure processes, logs, etc.
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500'], // 400: regular, 500: medium
  variable: '--font-ibm-plex-mono',
  // Only used for transaction IDs; don't compete with critical fonts
  preload: false,
  adjustFontFallback: true,
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Default messages for routes outside the locale group
  const defaultMessages = {};

  return (
    <html
      // Default language for SEO - also add data-dynamic-lang="true" to signal
      // to our IntlProvider that it should update the lang attribute
      lang={defaultLocale}
      data-dynamic-lang="true"
      className={cn(`${dmSans.variable} ${lora.variable} ${ibmPlexMono.variable}`, 'scroll-smooth')}
      suppressHydrationWarning
    >
      <head>
        {/*
          Only Clerk's Frontend API is needed at first paint (clerk-js + session).
          next/font self-hosts fonts, Vercel Analytics is same-origin, Stripe.js
          only loads in the private earnings dashboard, and PostHog/Novu load
          lazily after hydration, so preconnecting to them only wastes sockets.
          The hero poster is preloaded by next/image (`priority`).
        */}
        <link rel="preconnect" href="https://clerk.eleva.care" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://clerk.eleva.care" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ErrorBoundaryWrapper>
          <NuqsAdapter>
            <ClientProviders messages={defaultMessages}>
              {children}
              <Analytics />
              <SpeedInsights />
            </ClientProviders>
          </NuqsAdapter>
        </ErrorBoundaryWrapper>
      </body>
    </html>
  );
}
