// Import the function we're testing after all mocks are set up
import { toggleProfilePublication } from '@/server/actions/expert-profile';

/**
 * Tests for expert-profile.ts
 * Demonstrates proper mocking of complex server dependencies
 */

// Create reusable mocks
const authMock = jest.fn(() => Promise.resolve({ userId: 'test-user-id' }));
const currentUserMock = jest.fn(() => Promise.resolve({ id: 'test-user-id' }));
const hasRoleMock = jest.fn(() => Promise.resolve(true));
const checkExpertSetupStatusMock = jest.fn(() =>
  Promise.resolve({
    success: true,
    setupStatus: {
      profile: true,
      areas: true,
      expertise: true,
      schedule: true,
      pricing: true,
    },
  }),
);
const findFirstMock = jest.fn();
const revalidatePathMock = jest.fn();

// Mock all dependencies before importing the function to test
jest.mock('@clerk/nextjs/server', () => ({
  auth: (...args) => authMock(...args),
  currentUser: (...args) => currentUserMock(...args),
}));

jest.mock('@/lib/auth/roles.server', () => ({
  hasRole: (...args) => hasRoleMock(...args),
}));

jest.mock('@/server/actions/expert-setup', () => ({
  checkExpertSetupStatus: (...args) => checkExpertSetupStatusMock(...args),
}));

// DB operations with chainable update mocks
const updateSetMock = jest.fn();
const updateWhereMock = jest.fn();
const updateChain = {
  set: (...args) => {
    updateSetMock(...args);
    return updateChain;
  },
  where: (...args) => {
    updateWhereMock(...args);
    return updateChain;
  },
};

jest.mock('@/drizzle/db', () => {
  return {
    db: {
      query: {
        ProfileTable: {
          findFirst: (...args) => findFirstMock(...args),
        },
      },
      update: () => updateChain,
    },
  };
});

jest.mock('next/cache', () => ({
  revalidatePath: (...args) => revalidatePathMock(...args),
}));

// Mock drizzle-orm
jest.mock('drizzle-orm', () => ({
  eq: (field, value) => value,
  relations: () => ({}),
}));

// Mock schema
jest.mock('@/drizzle/schema', () => ({
  ProfileTable: {
    clerkUserId: 'clerkUserId',
  },
}));

describe('toggleProfilePublication', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Set default mock behavior
    authMock.mockResolvedValue({ userId: 'test-user-id' });
    currentUserMock.mockResolvedValue({ id: 'test-user-id' });
    hasRoleMock.mockResolvedValue(true);
    findFirstMock.mockResolvedValue({
      id: 1,
      clerkUserId: 'test-user-id',
      published: false, // Default to unpublished
    });
    checkExpertSetupStatusMock.mockResolvedValue({
      success: true,
      setupStatus: {
        profile: true,
        areas: true,
        expertise: true,
        schedule: true,
        pricing: true,
      },
    });
  });

  it('can be imported', () => {
    expect(typeof toggleProfilePublication).toBe('function');
  });

  it('should publish a profile when it is unpublished', async () => {
    // Act
    const result = await toggleProfilePublication();

    // Assert
    expect(result).toEqual({
      success: true,
      message: 'Profile published successfully',
      isPublished: true,
    });

    // Verify the DB operations
    expect(updateSetMock).toHaveBeenCalledWith({ published: true });
    expect(revalidatePathMock).toHaveBeenCalledTimes(5); // Revalidates multiple paths
  });

  it('should unpublish a profile when it is published', async () => {
    // Arrange - set up mock for a published profile
    findFirstMock.mockResolvedValue({
      id: 1,
      clerkUserId: 'test-user-id',
      published: true, // Already published
    });

    // Act
    const result = await toggleProfilePublication();

    // Assert
    expect(result).toEqual({
      success: true,
      message: 'Profile unpublished',
      isPublished: false,
    });

    // Verify the DB operations
    expect(updateSetMock).toHaveBeenCalledWith({ published: false });
    // Verify setup status is NOT checked when unpublishing
    expect(checkExpertSetupStatusMock).not.toHaveBeenCalled();
  });

  it('should return error if user is not authenticated', async () => {
    // Arrange - mock unauthenticated user
    authMock.mockResolvedValueOnce({ userId: null });
    currentUserMock.mockResolvedValueOnce(null);

    // Act
    const result = await toggleProfilePublication();

    // Assert
    expect(result).toEqual({
      success: false,
      message: 'Not authenticated',
      isPublished: false,
    });

    // Verify no DB operations
    expect(findFirstMock).not.toHaveBeenCalled();
    expect(updateSetMock).not.toHaveBeenCalled();
  });

  it('should return error if user is not an expert', async () => {
    // Arrange - mock non-expert user
    hasRoleMock.mockResolvedValue(false);

    // Act
    const result = await toggleProfilePublication();

    // Assert
    expect(result).toEqual({
      success: false,
      message: 'Not authorized',
      isPublished: false,
    });

    // Verify no DB operations
    expect(findFirstMock).not.toHaveBeenCalled();
    expect(updateSetMock).not.toHaveBeenCalled();
  });

  it('should return error if profile not found', async () => {
    // Arrange - mock profile not found
    findFirstMock.mockResolvedValue(null);

    // Act
    const result = await toggleProfilePublication();

    // Assert
    expect(result).toEqual({
      success: false,
      message: 'Profile not found',
      isPublished: false,
    });

    // Verify no update operations
    expect(updateSetMock).not.toHaveBeenCalled();
  });

  it('should return error if expert setup is incomplete', async () => {
    // Arrange - mock incomplete setup
    checkExpertSetupStatusMock.mockResolvedValue({
      success: true,
      setupStatus: {
        profile: true,
        areas: false, // Not complete
        expertise: true,
        schedule: true,
        pricing: false, // Not complete
      },
    });

    // Act
    const result = await toggleProfilePublication();

    // Assert
    expect(result).toEqual({
      success: false,
      message: 'Cannot publish profile until all setup steps are complete',
      isPublished: false,
      incompleteSteps: ['areas', 'pricing'],
    });

    // Verify no update operations
    expect(updateSetMock).not.toHaveBeenCalled();
  });

  it('should handle database errors gracefully', async () => {
    // Arrange - mock DB error
    const originalUpdate = jest.requireMock('@/drizzle/db').db.update;
    jest.requireMock('@/drizzle/db').db.update = () => {
      throw new Error('Database error');
    };

    // Use jest.spyOn instead of replacing console.error
    // This allows viewing the log but prevents it from cluttering test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    try {
      // Act
      const result = await toggleProfilePublication();

      // Assert
      expect(result).toEqual({
        success: false,
        message: 'Failed to update profile publication status',
        isPublished: false,
      });

      // Verify error is handled gracefully
      expect(revalidatePathMock).not.toHaveBeenCalled();

      // Verify the error was logged (without hiding it)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error toggling profile publication:',
        expect.any(Error),
      );
    } finally {
      // Restore original mock
      jest.requireMock('@/drizzle/db').db.update = originalUpdate;
      consoleSpy.mockRestore();
    }
  });
});
