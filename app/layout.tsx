import { ClientProviders } from '@/app/providers';
import { ErrorBoundaryWrapper } from '@/components/molecules/ErrorBoundaryWrapper';
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
      <head />
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
