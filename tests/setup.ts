// No need to import jest here as it's already globally available in the test environment
// Add jest-dom matchers
// Jest setup file
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Declare types for global mocks
declare global {
  var __mocks: {
    db: never;
    workosUser: never;
  };
}

// Add required polyfills for TextEncoder/Decoder
if (typeof TextEncoder === 'undefined') {
  // Use synchronous require for Node.js util module
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const util = require('node:util');

  (globalThis as any).TextEncoder = util.TextEncoder;

  (globalThis as any).TextDecoder = util.TextDecoder;
}

// Mock Next.js Web API globals for webhook testing
Object.defineProperty(global, 'Request', {
  value: class MockRequest {
    constructor(
      public url: string,
      public init?: unknown,
    ) {
      this.headers = {
        get: (name: string) => {
          const headers = (this.init as Record<string, unknown>)?.headers || {};
          return (headers as Record<string, unknown>)[name] || null;
        },
      };
    }
    async text() {
      return String((this.init as Record<string, unknown>)?.body || '{}');
    }
    async json() {
      return JSON.parse(await this.text());
    }
    headers: Record<string, unknown>;
  },
  writable: true,
});

Object.defineProperty(global, 'Response', {
  value: class MockResponse {
    constructor(
      public body?: unknown,
      public init?: ResponseInit,
    ) {
      this.status = init?.status || 200;
    }
    async json() {
      return this.body;
    }
    status: number;

    static json(data: unknown, init?: ResponseInit) {
      return new MockResponse(data, init);
    }
  },
  writable: true,
});

// Mock NextResponse specifically for Next.js
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((...args: unknown[]) => {
    const [url, init] = args;
    return new (
      global as unknown as { Request: new (url: string, init?: unknown) => unknown }
    ).Request(url as string, init);
  }),
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) => {
      return new (
        global as unknown as { Response: new (data: unknown, init?: ResponseInit) => unknown }
      ).Response(data, init);
    },
    next: () =>
      new (
        global as unknown as { Response: new (data: unknown, init?: ResponseInit) => unknown }
      ).Response(null, { status: 200 }),
    redirect: (url: string) =>
      new (
        global as unknown as { Response: new (data: unknown, init?: ResponseInit) => unknown }
      ).Response(null, { status: 302, headers: { Location: url } }),
  },
}));

// Mock Next.js headers
jest.mock('next/headers', () => ({
  headers: jest.fn(() => new Map()),
  cookies: jest.fn(() => ({
    get: jest.fn().mockReturnValue({ value: 'mock-cookie' }),
  })),
}));

// Mock Stripe
jest.mock('stripe', () => {
  const mockStripeInstance = {
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_mock' } as never),
      retrieve: jest.fn().mockResolvedValue({ id: 'cus_mock' } as never),
    },
    paymentIntents: {
      create: jest
        .fn()
        .mockResolvedValue({ id: 'pi_mock', client_secret: 'pi_mock_secret' } as never),
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_mock', status: 'succeeded' } as never),
    },
    charges: {
      retrieve: jest.fn().mockResolvedValue({ id: 'ch_mock' } as never),
    },
    checkout: {
      sessions: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'cs_mock', url: 'https://checkout.stripe.com/mock' } as never),
      },
    },
    accounts: {
      create: jest.fn().mockResolvedValue({ id: 'acct_mock' } as never),
      retrieve: jest.fn().mockResolvedValue({ id: 'acct_mock', charges_enabled: true } as never),
    },
    accountLinks: {
      create: jest.fn().mockResolvedValue({ url: 'https://connect.stripe.com/mock' } as never),
    },
    identity: {
      verificationSessions: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'vs_mock', url: 'https://verify.stripe.com/mock' } as never),
        retrieve: jest.fn().mockResolvedValue({ id: 'vs_mock', status: 'verified' } as never),
      },
    },
    events: {
      retrieve: jest
        .fn()
        .mockResolvedValue({ id: 'evt_mock', type: 'payment_intent.succeeded' } as never),
    },
    products: {
      create: jest.fn().mockResolvedValue({ id: 'prod_mock' } as never),
      update: jest.fn().mockResolvedValue({ id: 'prod_mock', active: false } as never),
      retrieve: jest.fn().mockResolvedValue({ id: 'prod_mock' } as never),
    },
    prices: {
      create: jest.fn().mockResolvedValue({ id: 'price_mock' } as never),
      retrieve: jest.fn().mockResolvedValue({ id: 'price_mock' } as never),
    },
  };

  // Return a constructor function that returns the mock
  return jest.fn().mockImplementation(() => mockStripeInstance);
});

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
      where: jest.fn().mockResolvedValue([{ count: 2 }] as never),
    }),
  }),
  insert: jest.fn().mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockImplementation(() => Promise.resolve([{ id: 'mock-id' }] as never)),
    }),
  }),
  update: jest.fn().mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest
          .fn()
          .mockImplementation(() => Promise.resolve([{ id: 'mock-id' }] as never)),
      }),
    }),
  }),
  delete: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnValue({
      returning: jest.fn().mockImplementation(() => Promise.resolve([{ id: 'mock-id' }] as never)),
    }),
  }),
};

// Mock WorkOS user for testing
const mockWorkosUser = {
  object: 'user' as const,
  id: 'user_test123',
  email: 'test@example.com',
  emailVerified: true,
  profilePictureUrl: null,
  firstName: 'Test',
  lastName: 'User',
  lastSignInAt: new Date().toISOString(),
  locale: 'en-US',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  externalId: null,
  metadata: {
    role: 'expert_community', // WorkOS stores role in metadata
  },
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

// Old Clerk mock removed - now using WorkOS mock defined above

// Add WorkOS auth mock (replacing Clerk)
// Mock structure matches @workos-inc/authkit-nextjs UserInfo interface
jest.mock('@workos-inc/authkit-nextjs', () => ({
  withAuth: jest.fn(() =>
    Promise.resolve({
      user: {
        object: 'user' as const,
        id: 'user_test123',
        email: 'test@example.com',
        emailVerified: true,
        profilePictureUrl: null,
        firstName: 'Test',
        lastName: 'User',
        lastSignInAt: new Date().toISOString(),
        locale: 'en-US',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        externalId: null,
        metadata: {},
      },
      sessionId: 'session_test123',
      organizationId: 'org_test123',
      accessToken: 'mock_access_token',
      role: undefined,
      roles: [],
      permissions: [],
      entitlements: [],
      featureFlags: [],
      impersonator: undefined,
    } as never),
  ),
  getSignInUrl: jest.fn(() => '/sign-in'),
  getSignUpUrl: jest.fn(() => '/sign-up'),
  getSignOutUrl: jest.fn(() => '/sign-out'),
}));

// Mock WorkOS client-side components
jest.mock('@workos-inc/authkit-nextjs/components', () => ({
  useAuth: jest.fn(() => ({
    user: {
      object: 'user' as const,
      id: 'user_test123',
      email: 'test@example.com',
      emailVerified: true,
      profilePictureUrl: null,
      firstName: 'Test',
      lastName: 'User',
      lastSignInAt: new Date().toISOString(),
      locale: 'en-US',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      externalId: null,
      metadata: {},
    },
    loading: false,
    isSignedIn: true,
  })),
  AuthKitProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
  updateTag: jest.fn(),
  cacheLife: jest.fn(),
  cacheTag: jest.fn(),
}));

// Make common mocks available to tests
global.__mocks = {
  db: mockDb as never,
  workosUser: mockWorkosUser as never,
};

// Mock Google Calendar
jest.mock('@/server/googleCalendar', () => ({
  createCalendarEvent: jest.fn(),
}));

// Mock schedule validation
jest.mock('@/lib/utils/server/scheduling', () => ({
  getValidTimesFromSchedule: jest.fn().mockResolvedValue([] as never),
}));

// Mock audit logging
jest.mock('@/lib/utils/server/audit', () => ({
  logAuditEvent: jest.fn().mockImplementation(() => Promise.resolve()),
}));

// Add global fetch mock for Stripe
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  } as Response),
) as jest.MockedFunction<typeof fetch>;

// Suppress console.log statements during tests to keep output clean
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

// Set up global beforeEach to clear mocks
beforeEach(() => {
  jest.clearAllMocks();
});
