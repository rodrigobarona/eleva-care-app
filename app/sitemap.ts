import { locales } from '@/lib/i18n/routing';
// Adjust path if needed
import { MetadataRoute } from 'next';

// Add any public routes that should be included in the sitemap
// Dynamic routes might need separate logic to fetch slugs
const publicRoutes: string[] = [
  '/',
  '/about',
  '/legal',
  '/legal/privacy',
  '/legal/terms',
  // Add other static public pages here
];

/**
 * Generates a sitemap array with localized URLs for all public routes.
 *
 * Each entry includes the full URL for every supported locale and route, with the default locale ('en') omitting the locale prefix. The `lastModified` field is set to the current date and time.
 *
 * @returns An array of sitemap entries for all locales and public routes.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const sitemapEntries: MetadataRoute.Sitemap = [];

  locales.forEach((locale) => {
    publicRoutes.forEach((route) => {
      // Handle the root path separately for the default locale if using 'as-needed' prefix
      const isDefaultLocale = locale === 'en'; // Assuming 'en' is default
      const pathPrefix = isDefaultLocale ? '' : `/${locale}`;
      const finalPath = route === '/' ? pathPrefix || '/' : `${pathPrefix}${route}`;

      sitemapEntries.push({
        url: `${baseUrl}${finalPath}`,
        lastModified: new Date(),
        // Optional: Add changeFrequency and priority
        // changeFrequency: 'weekly',
        // priority: route === '/' ? 1 : 0.8,
      });
    });
  });

  return sitemapEntries;
}
