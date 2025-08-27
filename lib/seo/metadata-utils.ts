import { type Locale, locales } from '@/lib/i18n/routing';
import type { Metadata } from 'next';

interface SEOConfig {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  siteName?: string;
  image?: {
    url: string;
    width: number;
    height: number;
    alt: string;
  };
  keywords?: string[];
  type?: 'website' | 'article';
  noIndex?: boolean;
}

/**
 * Generate comprehensive metadata for a page following Next.js 15 best practices
 * Includes alternates, canonical URLs, OpenGraph, Twitter, and robots configuration
 */
export function generatePageMetadata(config: SEOConfig): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Construct the current page URL
  const isDefaultLocale = config.locale === 'en';
  const pathPrefix = isDefaultLocale ? '' : `/${config.locale}`;
  const fullPath = config.path === '/' ? '' : config.path;
  const currentUrl = `${baseUrl}${pathPrefix}${fullPath}`;

  // Default image configuration
  const defaultImage = {
    url: '/img/eleva-care-share.png',
    width: 1200,
    height: 680,
    alt: 'Eleva Care - Expert Healthcare for Women',
  };

  const image = config.image || defaultImage;

  return {
    metadataBase: new URL(baseUrl),
    title: config.title,
    description: config.description,
    keywords: config.keywords,

    // Canonical URL and alternates for internationalization
    alternates: {
      canonical: currentUrl,
      languages: Object.fromEntries(
        locales.map((loc) => {
          const isDefaultLoc = loc === 'en';
          const locPrefix = isDefaultLoc ? '' : `/${loc}`;
          const locPath = config.path === '/' ? '' : config.path;
          return [loc, `${baseUrl}${locPrefix}${locPath}`];
        }),
      ),
    },

    // OpenGraph configuration
    openGraph: {
      title: config.ogTitle || config.title,
      description: config.ogDescription || config.description,
      siteName: config.siteName || 'Eleva Care',
      url: currentUrl,
      type: config.type || 'website',
      images: [
        {
          url: image.url,
          width: image.width,
          height: image.height,
          alt: image.alt,
        },
      ],
    },

    // Twitter configuration
    twitter: {
      card: 'summary_large_image',
      title: config.ogTitle || config.title,
      description: config.ogDescription || config.description,
      images: [image.url],
    },

    // Robots configuration
    robots: config.noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
  };
}

/**
 * Generate metadata for legal documents
 */
export function generateLegalPageMetadata(
  locale: Locale,
  document: string,
  title: string,
  description: string,
): Metadata {
  return generatePageMetadata({
    locale,
    path: `/legal/${document}`,
    title,
    description,
    keywords: ['legal', 'privacy', 'terms', 'eleva care', 'healthcare'],
    type: 'website',
  });
}

/**
 * Generate metadata for user profile pages
 */
export function generateUserProfileMetadata(
  locale: Locale,
  username: string,
  name: string,
  bio?: string,
  image?: string,
): Metadata {
  const title = `${name} - Healthcare Expert | Eleva Care`;
  const description = bio
    ? `Book a consultation with ${name}. ${bio.substring(0, 120)}...`
    : `Book a consultation with ${name}, a verified healthcare expert on Eleva Care.`;

  return generatePageMetadata({
    locale,
    path: `/${username}`,
    title,
    description,
    keywords: ['healthcare expert', 'consultation', 'pregnancy', 'postpartum', 'women health'],
    image: image
      ? {
          url: image,
          width: 1200,
          height: 630,
          alt: `${name} - Healthcare Expert`,
        }
      : undefined,
    type: 'website',
  });
}
