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
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/deprecated/', // Ignore deprecated tests by default
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
