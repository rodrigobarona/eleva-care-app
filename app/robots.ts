import type { MetadataRoute } from 'next';

/**
 * Generates the robots.txt configuration for the application, specifying crawler rules and the sitemap location.
 *
 * @returns A {@link MetadataRoute.Robots} object defining allowed and disallowed paths for web crawlers and the sitemap URL based on the deployment environment.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/',
        '/account/',
        '/admin/',
        '/api/',
        '/onboarding/',
        '/unauthorized/',
        '/appointments/',
        '/bookings/',
        '/data/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
