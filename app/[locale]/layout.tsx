import { isValidLocale } from '@/app/i18n';
import { IntlProvider } from '@/app/providers';
import { locales } from '@/lib/i18n/routing';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type React from 'react';

// Updated Props type with params as Promise for Next.js 15.3 internationalization
type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// Define an interface for the expected metadata structure from messages
interface MetadataTranslations {
  title?: string;
  description?: string;
  og?: {
    title?: string;
    description?: string;
    siteName?: string;
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  // Await params before using locale
  const { locale } = await params;

  console.log('Root layout - generateMetadata called with locale:', locale);

  // Validate locale before proceeding
  if (!isValidLocale(locale)) {
    console.error(`Invalid locale in generateMetadata: ${locale}`);
    notFound();
  }

  // Get messages for the specified locale
  setRequestLocale(locale);
  const messages = await getMessages();

  // Access metadata translations (ensure 'metadata' namespace exists in your messages)
  const meta = messages.metadata as MetadataTranslations | undefined;

  // Fallback to English if translations are missing
  const title = meta?.title || 'Expert care for Pregnancy, Postpartum & Sexual Health | Eleva Care';
  const description =
    meta?.description ||
    'Eleva Care: Empowering growth, embracing care. Expert care for pregnancy, postpartum, menopause, and sexual health.';

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    openGraph: {
      type: 'website',
      url: baseUrl, // Use base URL or specific page URL
      siteName: meta?.og?.siteName || 'Eleva Care',
      title: meta?.og?.title || title,
      description: meta?.og?.description || description,
      images: [
        {
          url: '/img/eleva-care-share.svg', // Relative URL with metadataBase
          width: 1200,
          height: 680,
          alt: 'Eleva Care',
        },
      ],
    },
    alternates: {
      canonical: `/${locale}`, // Use base URL + locale or specific page path
      languages: locales.reduce(
        (acc, loc) => {
          // Adjust path logic if your routes are more complex than just /locale
          acc[loc] = `${baseUrl}/${loc}`;
          return acc;
        },
        {} as Record<string, string>,
      ),
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  // Await params before using locale
  const { locale } = await params;

  console.log('Root layout rendering with locale:', locale);

  // Validate locale before proceeding
  if (!isValidLocale(locale)) {
    console.error(`Invalid locale in layout: ${locale}`);
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);
  const messages = await getMessages();

  // Use the dedicated IntlProvider component for localized routes
  return (
    <IntlProvider locale={locale} messages={messages}>
      {children}
    </IntlProvider>
  );
}

// Generate static parameters for all locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
