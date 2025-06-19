import createMDX from '@next/mdx';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/**
 * Bundle analyzer configuration
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

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

  // External packages that should not be bundled by webpack
  serverExternalPackages: ['googleapis'],

  // Turbopack configuration
  turbopack: {
    resolveExtensions: ['.js', '.jsx', '.ts', '.tsx', '.md', '.mdx', '.json'],
    resolveAlias: {
      // Add any alias mappings if needed
    },
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

    // Enable webpack build worker to reduce memory usage
    webpackBuildWorker: true,

    // Limits bundle imports to specified packages for smaller client bundles
    // Only imports used components from these packages instead of the entire library
    optimizePackageImports: [
      'react-icons',
      '@clerk/nextjs',
      'next-intl',
      'sonner',
      'posthog-js',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-icons',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-toggle',
      '@radix-ui/react-tooltip',
      '@tiptap/react',
      '@tiptap/starter-kit',
      'lucide-react',
    ],

    // Use Rust-based MDX compiler for better performance
    // Significantly speeds up MDX processing during builds
    mdxRs: true,
  },

  webpack: (config, { dev }) => {
    // Optimize memory usage for production builds
    if (!dev) {
      // Use default Next.js cache settings but optimize for memory
      if (config.cache && config.cache.type === 'filesystem') {
        config.cache.maxMemoryGenerations = 1;
      }
    }

    return config;
  },

  // Configure `pageExtensions` to include markdown and MDX files
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],

  // Enable automatic bundling for better performance
  bundlePagesRouterDependencies: true,
};

// Apply plugins in order: Bundle Analyzer -> MDX -> Next-Intl
const nextConfig = withMDX(config);
export default withBundleAnalyzer(withNextIntl(nextConfig));
