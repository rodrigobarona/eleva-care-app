import { db } from '@/drizzle/db';
import { locales } from '@/lib/i18n/routing';
import { createClerkClient } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { MetadataRoute } from 'next';

// Add any public routes that should be included in the sitemap
const publicRoutes: string[] = ['/', '/about', '/history'];

// Available legal documents from the dynamic route
const legalDocuments = ['terms', 'privacy', 'cookie', 'dpa', 'payment-policies'];

// Known usernames from your working sitemap - these will be used as fallback
// if database queries fail, ensuring the sitemap always includes the key profiles
const KNOWN_EXPERT_USERNAMES = [
  'raquelcristovao',
  'juliocastrosoares',
  'marianamateus',
  'madalenapintocoelho',
  'jessicamargarido',
  'patimota',
];

/**
 * Fetch all published user profiles with their usernames for sitemap generation
 * Following the same pattern as ExpertsSection.tsx with robust fallback
 */
async function getPublishedUsernames(): Promise<string[]> {
  try {
    console.log('🗺️ [Sitemap] Starting to fetch published usernames...');

    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Try to get published profiles from database
    const profiles = await db.query.ProfileTable.findMany({
      where: ({ published }) => eq(published, true),
      with: {
        primaryCategory: true,
      },
      orderBy: ({ order }) => order,
    });

    console.log(`🗺️ [Sitemap] Found ${profiles.length} published profiles in database`);

    if (profiles.length > 0) {
      // Database query succeeded, get usernames from Clerk
      const users = await clerk.users.getUserList({
        userId: profiles.map((profile) => profile.clerkUserId),
      });

      console.log(`🗺️ [Sitemap] Found ${users.data.length} users in Clerk for published profiles`);

      const usernames = users.data
        .map((user) => user.username)
        .filter((username): username is string => Boolean(username));

      if (usernames.length > 0) {
        console.log(
          `🗺️ [Sitemap] Successfully fetched ${usernames.length} usernames from database`,
        );
        return usernames;
      }
    }

    // Fallback: If database query failed or returned no results, use known usernames
    console.log(
      '🗺️ [Sitemap] Database query yielded no usernames, using known expert usernames as fallback',
    );
    console.log(`🗺️ [Sitemap] Using ${KNOWN_EXPERT_USERNAMES.length} known expert usernames`);

    return KNOWN_EXPERT_USERNAMES;
  } catch (error) {
    console.error('🗺️ [Sitemap] Error fetching published usernames:', error);
    console.log('🗺️ [Sitemap] Falling back to known expert usernames due to error');
    return KNOWN_EXPERT_USERNAMES;
  }
}

/**
 * Fetch all events for published users to generate event slug routes
 */
async function getPublishedUserEvents(): Promise<Array<{ username: string; eventSlug: string }>> {
  try {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Try to get published profiles and their events from database
    const profiles = await db.query.ProfileTable.findMany({
      where: ({ published }) => eq(published, true),
    });

    if (profiles.length > 0) {
      // Get all active events for published users
      const events = await db.query.EventTable.findMany({
        where: ({ isActive }) => eq(isActive, true),
      });

      // Filter events to only include those from published users
      const publishedUserEvents = events.filter((event) =>
        profiles.some((profile) => profile.clerkUserId === event.clerkUserId),
      );

      if (publishedUserEvents.length > 0) {
        // Get usernames for all users with events
        const eventUserIds = [...new Set(publishedUserEvents.map((event) => event.clerkUserId))];
        const users = await clerk.users.getUserList({
          userId: eventUserIds,
        });

        // Create a map of userId to username for quick lookup
        const userIdToUsername = new Map(
          users.data.filter((user) => user.username).map((user) => [user.id, user.username!]),
        );

        // Generate the username/eventSlug combinations
        const userEvents = publishedUserEvents
          .map((event) => {
            const username = userIdToUsername.get(event.clerkUserId);
            if (!username) return null;

            return {
              username,
              eventSlug: event.slug,
            };
          })
          .filter((item): item is { username: string; eventSlug: string } => item !== null);

        if (userEvents.length > 0) {
          console.log(`🗺️ [Sitemap] Found ${userEvents.length} user event routes from database`);
          return userEvents;
        }
      }
    }

    // For now, return empty array if no events found or DB query fails
    // In the future, you could add known event slugs as fallback if needed
    console.log('🗺️ [Sitemap] No user events found or database query failed');
    return [];
  } catch (error) {
    console.error('🗺️ [Sitemap] Error fetching user events:', error);
    return [];
  }
}

/**
 * Generate alternate language URLs for a given path
 */
function generateLanguageAlternates(basePath: string): Record<string, string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return Object.fromEntries(
    locales.map((locale) => {
      const isDefaultLocale = locale === 'en';
      const localePrefix = isDefaultLocale ? '' : `/${locale}`;
      const localizedPath = basePath === '/' ? localePrefix || '/' : `${localePrefix}${basePath}`;

      return [locale, `${baseUrl}${localizedPath}`];
    }),
  );
}

/**
 * Next.js 15 Sitemap Generation
 *
 * Generates a sitemap with proper internationalization support and alternate language links.
 * Includes static routes, dynamic user profiles, user events, and legal documents.
 *
 * Features:
 * - Follows Next.js 15 sitemap best practices
 * - Proper alternate language links (hreflang)
 * - Robust fallback system for database queries
 * - No duplicate entries
 * - Production-ready error handling
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const sitemapEntries: MetadataRoute.Sitemap = [];

  try {
    // Get published usernames and their events for dynamic routes
    const [publishedUsernames, userEvents] = await Promise.all([
      getPublishedUsernames(),
      getPublishedUserEvents(),
    ]);

    // Add static public routes (/, /about, /history)
    publicRoutes.forEach((route) => {
      sitemapEntries.push({
        url: `${baseUrl}${route === '/' ? '' : route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: route === '/' ? 1 : route === '/history' ? 0.7 : 0.8,
        alternates: {
          languages: generateLanguageAlternates(route),
        },
      });
    });

    // Add dynamic username routes (/username)
    publishedUsernames.forEach((username) => {
      const route = `/${username}`;
      sitemapEntries.push({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9, // High priority for user profiles
        alternates: {
          languages: generateLanguageAlternates(route),
        },
      });
    });

    // Add dynamic event routes (/username/eventSlug) - booking pages
    userEvents.forEach(({ username, eventSlug }) => {
      const route = `/${username}/${eventSlug}`;
      sitemapEntries.push({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8, // High priority for booking pages
        alternates: {
          languages: generateLanguageAlternates(route),
        },
      });
    });

    // Add legal document routes (/legal/document)
    legalDocuments.forEach((document) => {
      const route = `/legal/${document}`;
      sitemapEntries.push({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'monthly', // Legal documents change less frequently
        priority: 0.6, // Medium-low priority for legal documents
        alternates: {
          languages: generateLanguageAlternates(route),
        },
      });
    });

    return sitemapEntries;
  } catch (error) {
    console.error('🗺️ [Sitemap] Error generating sitemap:', error);

    // Graceful fallback: Return at least the static routes if everything fails
    publicRoutes.forEach((route) => {
      sitemapEntries.push({
        url: `${baseUrl}${route === '/' ? '' : route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: route === '/' ? 1 : route === '/history' ? 0.7 : 0.8,
        alternates: {
          languages: generateLanguageAlternates(route),
        },
      });
    });

    legalDocuments.forEach((document) => {
      const route = `/legal/${document}`;
      sitemapEntries.push({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: {
          languages: generateLanguageAlternates(route),
        },
      });
    });

    return sitemapEntries;
  }
}
