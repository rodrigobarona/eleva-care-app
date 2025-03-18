import { db } from '@/drizzle/db';
import { ProfileTable, UserTable } from '@/drizzle/schema';
import {
  checkExpertSetupStatus,
  markStepComplete,
  markStepCompleteForUser,
  markStepCompleteNoRevalidate,
} from '@/server/actions/expert-setup';
import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { revalidatePath } from 'next/cache';

// Create reusable mocks
const mockUserWithExpertRole = {
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

const mockUserWithoutExpertRole = {
  id: 'user_456',
  publicMetadata: { role: ['user'] },
  unsafeMetadata: {},
  emailAddresses: [],
  externalAccounts: [],
};

// Mock Clerk
jest.mock('@clerk/nextjs/server', () => ({
  currentUser: jest.fn(),
  clerkClient: jest.fn(),
}));

// Mock Next.js
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Mock database
jest.mock('@/drizzle/db', () => ({
  db: {
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
    },
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(),
      })),
    })),
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: (field, value) => ({ field, value }),
  count: jest.fn().mockReturnValue({ count: true }),
  and: (...conditions) => ({ conditions }),
}));

describe('Expert Setup Actions', () => {
  let mockClerkUpdateUser: jest.Mock;
  let mockClerkGetUser: jest.Mock;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup console spy to suppress error messages
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Configure mock user
    jest.mocked(currentUser).mockResolvedValue(mockUserWithExpertRole);

    // Configure mock clerk client with updateUser and getUser functions
    mockClerkUpdateUser = jest.fn().mockResolvedValue({ id: 'user_123' });
    mockClerkGetUser = jest.fn().mockResolvedValue(mockUserWithExpertRole);

    jest.mocked(clerkClient).mockReturnValue({
      users: {
        updateUser: mockClerkUpdateUser,
        getUser: mockClerkGetUser,
      },
    });

    // Configure database mocks
    jest.mocked(db.query.ProfileTable.findFirst).mockResolvedValue({
      id: 'profile_123',
      clerkUserId: 'user_123',
      firstName: 'John',
      lastName: 'Doe',
      shortBio: 'Expert in testing',
      published: false,
    });

    jest.mocked(db.query.UserTable.findFirst).mockResolvedValue({
      id: 'db_user_123',
      clerkUserId: 'user_123',
      stripeConnectAccountId: 'acct_123',
      stripeConnectOnboardingComplete: true,
      stripeIdentityVerificationId: 'id_123',
      stripeIdentityVerified: true,
    });

    jest.mocked(db.query.ScheduleTable.findFirst).mockResolvedValue({
      id: 'schedule_123',
      clerkUserId: 'user_123',
    });

    // Setup event count mock
    const mockWhere = jest.fn().mockResolvedValue([{ count: 2 }]);
    const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
    jest.mocked(db.select).mockReturnValue({ from: mockFrom });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('markStepCompleteNoRevalidate', () => {
    it('should mark a step as complete', async () => {
      const result = await markStepCompleteNoRevalidate('identity');

      expect(result.success).toBe(true);
      expect(result.setupStatus).toEqual({
        ...mockUserWithExpertRole.unsafeMetadata.expertSetup,
        identity: true,
      });

      expect(mockClerkUpdateUser).toHaveBeenCalledWith('user_123', {
        unsafeMetadata: {
          ...mockUserWithExpertRole.unsafeMetadata,
          expertSetup: {
            ...mockUserWithExpertRole.unsafeMetadata.expertSetup,
            identity: true,
          },
        },
      });

      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it('should return early if step is already complete', async () => {
      const result = await markStepCompleteNoRevalidate('profile');

      expect(result.success).toBe(true);
      expect(result.setupStatus).toEqual(mockUserWithExpertRole.unsafeMetadata.expertSetup);
      expect(mockClerkUpdateUser).not.toHaveBeenCalled();
    });

    it('should return error if user is not authenticated', async () => {
      jest.mocked(currentUser).mockResolvedValueOnce(null);

      const result = await markStepCompleteNoRevalidate('identity');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });

    it('should return error if user is not an expert', async () => {
      jest.mocked(currentUser).mockResolvedValueOnce(mockUserWithoutExpertRole);

      const result = await markStepCompleteNoRevalidate('identity');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User is not an expert');
    });

    it('should handle errors gracefully', async () => {
      // Make sure user is properly mocked but updateUser throws an error
      jest.mocked(currentUser).mockResolvedValueOnce(mockUserWithExpertRole);
      mockClerkUpdateUser.mockImplementationOnce(() => {
        throw new Error('Clerk API error');
      });

      const result = await markStepCompleteNoRevalidate('identity');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to mark step as complete');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to mark step complete:', expect.any(Error));
    });
  });

  describe('markStepComplete', () => {
    it('should mark a step as complete and revalidate path', async () => {
      const result = await markStepComplete('identity');

      expect(result.success).toBe(true);
      expect(mockClerkUpdateUser).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/(private)/layout');
    });

    it('should not revalidate path if operation failed', async () => {
      jest.mocked(currentUser).mockResolvedValueOnce(null);

      const result = await markStepComplete('identity');

      expect(result.success).toBe(false);
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('checkExpertSetupStatus', () => {
    it('should check and return the complete setup status', async () => {
      const result = await checkExpertSetupStatus();

      expect(result.success).toBe(true);
      expect(result.setupStatus).toEqual({
        profile: true,
        availability: true,
        events: true,
        identity: true,
        payment: true,
        google_account: true,
      });
      expect(result.isPublished).toBe(false);

      // Verify queries were called
      expect(db.query.ProfileTable.findFirst).toHaveBeenCalled();
      expect(db.query.UserTable.findFirst).toHaveBeenCalled();
      expect(db.query.ScheduleTable.findFirst).toHaveBeenCalled();
      expect(db.select).toHaveBeenCalled();
    });

    it('should return appropriate status for missing DB records', async () => {
      // Mock missing profile data
      jest.mocked(db.query.ProfileTable.findFirst).mockResolvedValueOnce(null);

      // Mock no events
      const mockEventWhere = jest.fn().mockResolvedValueOnce([{ count: 0 }]);
      const mockEventFrom = jest.fn().mockReturnValue({ where: mockEventWhere });
      jest.mocked(db.select).mockReturnValueOnce({ from: mockEventFrom });

      // Mock missing schedule
      jest.mocked(db.query.ScheduleTable.findFirst).mockResolvedValueOnce(null);

      const result = await checkExpertSetupStatus();

      expect(result.success).toBe(true);
      expect(result.setupStatus).toEqual({
        profile: false,
        availability: false,
        events: false,
        identity: true,
        payment: true,
        google_account: true,
      });
    });

    it('should handle incomplete profile data', async () => {
      // Mock incomplete profile
      jest.mocked(db.query.ProfileTable.findFirst).mockResolvedValueOnce({
        id: 'profile_123',
        clerkUserId: 'user_123',
        firstName: 'John',
        lastName: null,
        shortBio: null,
        published: false,
      });

      const result = await checkExpertSetupStatus();

      expect(result.success).toBe(true);
      expect(result.setupStatus.profile).toBe(false);
    });

    it('should return error if user is not authenticated', async () => {
      jest.mocked(currentUser).mockResolvedValueOnce(null);

      const result = await checkExpertSetupStatus();

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });
  });

  describe('markStepCompleteForUser', () => {
    it('should mark a step as complete for a specific user ID', async () => {
      const result = await markStepCompleteForUser('identity', 'user_123');

      expect(result.success).toBe(true);
      expect(result.setupStatus).toEqual({
        ...mockUserWithExpertRole.unsafeMetadata.expertSetup,
        identity: true,
      });

      expect(mockClerkGetUser).toHaveBeenCalledWith('user_123');
      expect(mockClerkUpdateUser).toHaveBeenCalledWith('user_123', expect.anything());
      expect(revalidatePath).toHaveBeenCalledWith('/(private)/layout');
    });

    it('should return error if user is not found', async () => {
      mockClerkGetUser.mockResolvedValueOnce(null);

      const result = await markStepCompleteForUser('identity', 'non_existent_user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return error if user is not an expert', async () => {
      mockClerkGetUser.mockResolvedValueOnce(mockUserWithoutExpertRole);

      const result = await markStepCompleteForUser('identity', 'user_456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User is not an expert');
    });

    it('should handle errors gracefully', async () => {
      mockClerkGetUser.mockResolvedValueOnce(mockUserWithExpertRole);
      mockClerkUpdateUser.mockImplementationOnce(() => {
        throw new Error('Clerk API error');
      });

      const result = await markStepCompleteForUser('identity', 'user_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to mark step as complete');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
