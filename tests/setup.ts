import { jest } from '@jest/globals';
// Add jest-dom matchers
import '@testing-library/jest-dom';

// Add required polyfills for TextEncoder/Decoder
if (typeof TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const util = require('node:util');
  global.TextEncoder = util.TextEncoder;
  global.TextDecoder = util.TextDecoder;
}

// Mock drizzle to prevent database connections during tests
const mockDb = {
  query: {
    ProfileTable: {
      findFirst: jest.fn(),
    },
    UserTable: {
      findFirst: jest.fn(),
    },
    ScheduleTable: {
      findFirst: jest.fn(),
    },
    EventTable: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
  select: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([{ count: 2 }]),
    }),
  }),
  insert: jest.fn().mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockImplementation(() => Promise.resolve([{ id: 'mock-id' }])),
    }),
  }),
  update: jest.fn().mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockImplementation(() => Promise.resolve([{ id: 'mock-id' }])),
      }),
    }),
  }),
  delete: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnValue({
      returning: jest.fn().mockImplementation(() => Promise.resolve([{ id: 'mock-id' }])),
    }),
  }),
};

// Mock Clerk user for testing
const mockClerkUser = {
  id: 'user_123',
  publicMetadata: { role: ['community_expert'] },
  unsafeMetadata: {
    expertSetup: {
      profile: true,
      events: false,
    },
  },
  emailAddresses: [{ emailAddress: 'expert@gmail.com', verification: { status: 'verified' } }],
  externalAccounts: [{ provider: 'google', verification: { status: 'verified' } }],
};

// Mock Clerk client
const mockUsers = {
  updateUser: jest.fn().mockResolvedValue({ id: 'user_123' }),
  getUser: jest.fn().mockResolvedValue(mockClerkUser),
};

// Setup Jest mocks
jest.mock('@/drizzle/db', () => ({
  db: mockDb,
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((field, value) => ({ field, value })),
  and: jest.fn((...conditions) => ({ and: conditions })),
  or: jest.fn((...conditions) => ({ or: conditions })),
  desc: jest.fn((field) => ({ desc: field })),
  count: jest.fn(() => ({ count: true })),
  sql: jest.fn((query) => ({ sql: query })),
  isNull: jest.fn((field) => ({ isNull: field })),
  gt: jest.fn((field, value) => ({ field, value, operator: 'gt' })),
  gte: jest.fn((field, value) => ({ field, value, operator: 'gte' })),
  lt: jest.fn((field, value) => ({ field, value, operator: 'lt' })),
  lte: jest.fn((field, value) => ({ field, value, operator: 'lte' })),
  inArray: jest.fn((field, values) => ({ field, values, operator: 'inArray' })),
  relations: jest.fn(() => ({})),
}));

jest.mock('@clerk/nextjs/server', () => ({
  currentUser: jest.fn().mockResolvedValue(mockClerkUser),
  clerkClient: jest.fn().mockReturnValue({
    users: mockUsers,
  }),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

// Make common mocks available to tests
global.__mocks = {
  db: mockDb,
  clerkUser: mockClerkUser,
  clerkUsers: mockUsers,
};

// Mock Google Calendar
jest.mock('@/server/googleCalendar', () => ({
  createCalendarEvent: jest.fn(),
}));

// Mock schedule validation
jest.mock('@/lib/getValidTimesFromSchedule', () => ({
  getValidTimesFromSchedule: jest.fn().mockResolvedValue([]),
}));

// Mock audit logging
jest.mock('@/lib/logAuditEvent', () => ({
  logAuditEvent: jest.fn(),
}));

// Mock Next.js headers
jest.mock('next/headers', () => ({
  headers: jest.fn(() => new Map()),
}));

// Add TextEncoder polyfill for environments that don't have it
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('node:util').TextEncoder;
}

// Add TextDecoder polyfill for environments that don't have it
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('node:util').TextDecoder;
}

// Suppress console.log statements during tests to keep output clean
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});
