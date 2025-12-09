import { ClientProviders } from '@/app/providers';
import { defaultLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';
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
  preload: true,
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
        {/* DNS Prefetch and Preconnect for external services */}

        {/* WorkOS Authentication */}
        <link rel="dns-prefetch" href="https://api.workos.com" />
        <link rel="preconnect" href="https://api.workos.com" crossOrigin="anonymous" />

        {/* Vercel Analytics & Speed Insights */}
        <link rel="dns-prefetch" href="https://vercel-insights.com" />
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
        <link rel="preconnect" href="https://vercel-insights.com" crossOrigin="anonymous" />

        {/* Stripe Payments */}
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href="https://api.stripe.com" />
        <link rel="preconnect" href="https://js.stripe.com" crossOrigin="anonymous" />

        {/* PostHog Analytics (EU Region) */}
        <link rel="dns-prefetch" href="https://eu.posthog.com" />
        <link rel="dns-prefetch" href="https://eu-assets.i.posthog.com" />
        <link rel="preconnect" href="https://eu.posthog.com" crossOrigin="anonymous" />

        {/* Novu Notifications (EU region) */}
        <link rel="dns-prefetch" href="https://eu.api.novu.co" />
        <link rel="dns-prefetch" href="https://eu.ws.novu.co" />
        <link rel="preconnect" href="https://eu.api.novu.co" crossOrigin="anonymous" />

        {/* Google Fonts (Next.js handles this automatically, but explicit is better) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Preload critical assets */}
        <link
          rel="preload"
          href="/img/videos/eleva-care-intro-banner-poster.webp"
          as="image"
          type="image/webp"
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <NuqsAdapter>
          <AuthKitProvider>
            <ClientProviders messages={defaultMessages}>
              {children}
              <Analytics />
              <SpeedInsights />
            </ClientProviders>
          </AuthKitProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
