import { db } from '@/drizzle/db';
import { locales } from '@/lib/i18n/routing';
import { createClerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { MetadataRoute } from 'next';

// Add any public routes that should be included in the sitemap
// Dynamic routes might need separate logic to fetch slugs
const publicRoutes: string[] = [
  '/',
  '/about',
  '/history', // Added history route
  // Add other static public pages here
];

// Available legal documents from the dynamic route
const legalDocuments = ['terms', 'privacy', 'cookie', 'dpa', 'payment-policies'];

/**
 * Fetch all published user profiles with their usernames for sitemap generation
 * Following the same pattern as ExpertsSection.tsx
 */
async function getPublishedUsernames(): Promise<string[]> {
  try {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Get all published profiles from the database
    const profiles = await db.query.ProfileTable.findMany({
      where: ({ published }) => eq(published, true),
    });

    if (profiles.length === 0) {
      return [];
    }

    // Get users from Clerk that have published profiles
    const users = await clerk.users.getUserList({
      userId: profiles.map((profile) => profile.clerkUserId),
    });

    // Extract usernames, filtering out any users without usernames
    const usernames = users.data
      .map((user) => user.username)
      .filter((username): username is string => Boolean(username));

    return usernames;
  } catch (error) {
    console.error('Error fetching published usernames for sitemap:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Get published usernames for dynamic routes
  const publishedUsernames = await getPublishedUsernames();

  locales.forEach((locale) => {
    // Add static routes
    publicRoutes.forEach((route) => {
      // Handle the root path separately for the default locale if using 'as-needed' prefix
      const isDefaultLocale = locale === 'en'; // Using the default locale from routing.ts
      const pathPrefix = isDefaultLocale ? '' : `/${locale}`;
      const finalPath = route === '/' ? pathPrefix || '/' : `${pathPrefix}${route}`;

      sitemapEntries.push({
        url: `${baseUrl}${finalPath}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: route === '/' ? 1 : route === '/history' ? 0.7 : 0.8,
        // Add alternate language entries for SEO
        alternates: {
          languages: Object.fromEntries(
            locales.map((loc) => {
              const isDefaultLoc = loc === 'en';
              const locPrefix = isDefaultLoc ? '' : `/${loc}`;
              const locPath = route === '/' ? locPrefix || '/' : `${locPrefix}${route}`;
              return [loc, `${baseUrl}${locPath}`];
            }),
          ),
        },
      });
    });

    // Add dynamic username routes
    publishedUsernames.forEach((username) => {
      const isDefaultLocale = locale === 'en';
      const pathPrefix = isDefaultLocale ? '' : `/${locale}`;
      const finalPath = `${pathPrefix}/${username}`;

      sitemapEntries.push({
        url: `${baseUrl}${finalPath}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9, // High priority for user profiles
        // Add alternate language entries for user profiles
        alternates: {
          languages: Object.fromEntries(
            locales.map((loc) => {
              const isDefaultLoc = loc === 'en';
              const locPrefix = isDefaultLoc ? '' : `/${loc}`;
              const locPath = `${locPrefix}/${username}`;
              return [loc, `${baseUrl}${locPath}`];
            }),
          ),
        },
      });
    });

    // Add dynamic legal document routes
    legalDocuments.forEach((document) => {
      const isDefaultLocale = locale === 'en';
      const pathPrefix = isDefaultLocale ? '' : `/${locale}`;
      const finalPath = `${pathPrefix}/legal/${document}`;

      sitemapEntries.push({
        url: `${baseUrl}${finalPath}`,
        lastModified: new Date(),
        changeFrequency: 'monthly', // Legal documents change less frequently
        priority: 0.6, // Medium-low priority for legal documents
        // Add alternate language entries for legal documents
        alternates: {
          languages: Object.fromEntries(
            locales.map((loc) => {
              const isDefaultLoc = loc === 'en';
              const locPrefix = isDefaultLoc ? '' : `/${loc}`;
              const locPath = `${locPrefix}/legal/${document}`;
              return [loc, `${baseUrl}${locPath}`];
            }),
          ),
        },
      });
    });
  });

  return sitemapEntries;
}
