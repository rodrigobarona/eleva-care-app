import createMDX from '@next/mdx';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

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
    staleTimes: {
      dynamic: 0,
    },
    webpackMemoryOptimizations: true,
    optimizePackageImports: ['react-icons', '@clerk/nextjs', 'next-intl', 'sonner', 'posthog-js'],
  },
  webpack: (config, { dev }) => {
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

const nextConfig = withMDX(config);

export default withNextIntl(nextConfig);
