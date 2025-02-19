import { jest } from '@jest/globals';

// Mock database queries
jest.mock('@/drizzle/db', () => ({
  db: {
    query: {
      MeetingTable: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      EventTable: {
        findFirst: jest.fn(),
      },
    },
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn(),
  },
}));

// Mock Google Calendar
jest.mock('@/server/googleCalendar', () => ({
  createCalendarEvent: jest.fn(),
}));

// Mock schedule validation
jest.mock('@/lib/getValidTimesFromSchedule', () => ({
  getValidTimesFromSchedule: jest.fn(),
}));

// Mock audit logging
jest.mock('@/lib/logAuditEvent', () => ({
  logAuditEvent: jest.fn(),
}));

// Mock Next.js headers
jest.mock('next/headers', () => ({
  headers: jest.fn(() => new Map()),
}));

// Mock Clerk auth
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(() => ({ userId: 'test-user-id' })),
}));
