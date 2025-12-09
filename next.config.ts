import createMDX from '@next/mdx';
import { withSentryConfig } from '@sentry/nextjs';
import { withBotId } from 'botid/next/config';
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
 * MDX configuration for Turbopack compatibility
 *
 * IMPORTANT: Turbopack requires plugins to be specified as strings (not imported functions)
 * because the Rust-based compiler cannot execute JavaScript functions.
 *
 * For more info: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack
 */
const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    // Plugins must be strings for Turbopack compatibility
    remarkPlugins: ['remark-gfm'],
    rehypePlugins: [],
  },
});

/**
 * Internationalization plugin
 * Enables i18n features through next-intl
 */
const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

const config: NextConfig = {
  // Environment variables to be injected at build time
  env: {
    BUILD_DATE: new Date().toISOString(),
  },

  // Cache Components disabled - waiting for next-intl support
  // next-intl requires next/root-params (currently experimental) for cacheComponents compatibility
  // The library maintainer confirmed cacheComponents is not yet supported: https://github.com/amannn/next-intl/issues/1493
  // TODO: Re-enable after next-intl adds cacheComponents support (expected in Next.js 16.x minor release)
  // For now, using traditional revalidate pattern for static content caching
  // cacheComponents: true,

  // Enable React Compiler for automatic memoization
  reactCompiler: true,

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

  // Turbopack configuration (moved from experimental in Next.js 16)
  turbopack: {
    resolveExtensions: ['.js', '.jsx', '.ts', '.tsx', '.md', '.mdx', '.json'],
    resolveAlias: {
      // Add any alias mappings if needed
    },
  },

  experimental: {
    // Client-side router cache control for dynamic routes
    // Setting dynamic to 0 ensures dynamic content is always fresh (no stale cache)
    // Still experimental in Next.js 16, useful for maintaining data freshness
    staleTimes: {
      dynamic: 0,
    },

    // Reduces build-time memory usage by optimizing webpack memory allocation
    // Helps prevent OOM errors during builds with large codebases
    webpackMemoryOptimizations: true,

    // Enable webpack build worker to reduce memory usage
    webpackBuildWorker: true,

    // NOTE: optimizePackageImports removed - not needed with Turbopack (Next.js 16)
    // Turbopack automatically handles package optimization without explicit configuration
    // Reference: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack
  },

  // Configure `pageExtensions` to include markdown and MDX files
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],

  // Enable automatic bundling for better performance
  bundlePagesRouterDependencies: true,
};

// Apply plugins in order: Bundle Analyzer -> MDX -> Next-Intl -> BotID -> Sentry
const nextConfig = withMDX(config);
const configWithPlugins = withBotId(withBundleAnalyzer(withNextIntl(nextConfig)));

// Wrap with Sentry for error monitoring (using Better Stack as destination)
// Note: When using Better Stack, source map uploads are disabled since
// Better Stack uses its own ingestion endpoint, not Sentry's.
export default withSentryConfig(configWithPlugins, {
  // Disable telemetry to Sentry (we're using Better Stack)
  telemetry: false,

  // Disable source map uploads (not needed for Better Stack)
  sourcemaps: {
    disable: true,
  },

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
});
