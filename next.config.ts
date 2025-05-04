import createMDX from '@next/mdx';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/**
 * MDX configuration
 * Enables .mdx file support in Next.js
 */
const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

/**
 * Internationalization plugin
 * Enables i18n features through next-intl
 */
const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.clerk.com',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
    ],
  },

  experimental: {
    // On-demand cache invalidation for dynamic routes (staleTimes = 0)
    // This helps ensure dynamic content is always fresh
    staleTimes: {
      dynamic: 0,
    },

    // Reduces build-time memory usage by optimizing webpack memory allocation
    // Helps prevent OOM errors during builds with large codebases
    webpackMemoryOptimizations: true,

    // Limits bundle imports to specified packages for smaller client bundles
    // Only imports used components from these packages instead of the entire library
    optimizePackageImports: ['react-icons', '@clerk/nextjs', 'next-intl', 'sonner', 'posthog-js'],

    // Use Rust-based MDX compiler for better performance
    // Significantly speeds up MDX processing during builds
    mdxRs: true,
  },

  webpack: (config, { dev }) => {
    // In production, use memory cache to improve build performance and reduce cold start times
    if (!dev) {
      if (config.cache) {
        config.cache = {
          type: 'memory',
          ...config.cache,
          memoryCacheUnaffected: true,
        };
      }
    }
    return config;
  },

  // Configure `pageExtensions` to include markdown and MDX files
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
};

// Apply MDX plugin first, then Next-Intl
const nextConfig = withMDX(config);
export default withNextIntl(nextConfig);
