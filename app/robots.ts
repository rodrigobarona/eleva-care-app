import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
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
        '/customers/',
        '/events/',
        '/expert/',
        '/schedule/',
        '/data/',
      ],
    },
    // sitemap: 'https://eleva.care/sitemap.xml',
  };
}
