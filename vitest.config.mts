import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    // Environment
    environment: 'jsdom',

    // Setup files
    setupFiles: ['./tests/setup.ts'],

    // Global test API (vi, describe, it, expect)
    globals: true,

    // Include patterns
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],

    // Exclude patterns
    exclude: [
      'node_modules',
      'tests/deprecated/**',
      // E2E tests are run by Playwright, not Vitest
      'tests/e2e/**',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov', 'html'],
      include: [
        'src/app/**/*.{ts,tsx}',
        'src/components/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
        'src/server/**/*.{ts,tsx}',
      ],
      exclude: ['**/*.d.ts', '**/node_modules/**', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    },

    // Performance
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },

    // Better error reporting
    reporters: ['verbose'],

    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,

    // Mock reset behavior
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,

    // Type checking for tests
    typecheck: {
      enabled: false, // Enable if you want type checking during tests
    },
  },

  // Resolve configuration for path aliases
  resolve: {
    alias: {
      '@': '/src',
      '@/drizzle': '/drizzle',
    },
  },
});

