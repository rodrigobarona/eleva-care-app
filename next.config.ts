import createMDX from '@next/mdx';
import { withSentryConfig } from '@sentry/nextjs';
import { withBotId } from 'botid/next/config';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withNextVideo } from 'next-video/process';

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
      {
        protocol: 'https',
        hostname: 'image.mux.com',
      },
    ],
    // Optimize image quality settings for performance
    // 75: Default quality for most images
    // 90: High quality for hero/featured images
    qualities: [75, 90],
    // Prefer modern image formats for better compression
    formats: ['image/avif', 'image/webp'],
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

/**
 * Sentry Configuration
 *
 * Wraps the Next.js config with Sentry for comprehensive error monitoring,
 * performance tracing, and source map uploads.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */
export default withNextVideo(
  withSentryConfig(configWithPlugins, {
    // Sentry organization and project slugs
    org: 'elevacare',
    project: 'eleva-care',

    // Auth token for source map uploads (set in environment variables)
    authToken: process.env.SENTRY_AUTH_TOKEN,

    // Only print logs for uploading source maps in CI
    // Set to `true` to suppress logs
    silent: !process.env.CI,

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware,
    // otherwise reporting of client-side errors will fail.
    tunnelRoute: '/monitoring',

    // Webpack-specific Sentry configuration (moved from root level in SDK v10+)
    webpack: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      // (Replaces deprecated `disableLogger` option)
      treeshake: {
        removeDebugLogging: true,
      },

      // Capture React component names for better debugging in Session Replay
      // (Replaces deprecated `reactComponentAnnotation` option)
      reactComponentAnnotation: {
        enabled: true,
      },

      // Automatically create Cron Monitors in Sentry for Vercel cron jobs
      // Note: Currently only supports Pages Router
      // (Replaces deprecated `automaticVercelMonitors` option)
      automaticVercelMonitors: true,
    },
  }),
);
