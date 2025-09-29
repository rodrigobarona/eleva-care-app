import nextJest from 'next/jest';

const createJestConfig = nextJest({
  // Path to Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Mock svix to avoid binary parsing issues
    '^svix$': '<rootDir>/tests/__mocks__/svix.ts',
    // Mock next-intl modules to prevent ESM parsing issues
    '^next-intl/server$': '<rootDir>/tests/__mocks__/next-intl-server.ts',
    '^next-intl$': '<rootDir>/tests/__mocks__/next-intl.ts',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/deprecated/', // Ignore deprecated tests by default
    '/tests/integration/services/redis.test.ts', // Skip due to ESM issues
    '/tests/integration/services/locale-detection.test.ts', // Skip due to ESM issues
    '/tests/integration/services/keep-alive.test.ts', // Skip due to ESM issues
  ],
  // Transform ESM modules that Jest can't handle
  transformIgnorePatterns: [
    'node_modules/(?!(jose|@upstash/qstash|@upstash/redis|uncrypto|next-intl)/)',
  ],
  // Performance optimization
  maxWorkers: '50%',
  // Better error reporting
  verbose: true,
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config
export default createJestConfig(customJestConfig);
