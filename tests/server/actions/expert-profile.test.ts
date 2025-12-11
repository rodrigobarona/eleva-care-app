import { vi } from 'vitest';
// Import the function we're testing after all mocks are set up
import { toggleProfilePublication } from '@/server/actions/expert-profile';

/**
 * Tests for expert-profile.ts
 * Demonstrates proper mocking of complex server dependencies
 */

// Create reusable mock UserInfo
const mockUserInfo = {
  user: {
    object: 'user' as const,
    id: 'test-user-id',
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
  sessionId: 'test-session-id',
  organizationId: null,
  accessToken: 'mock_access_token',
  role: undefined,
  roles: [],
  permissions: [],
  entitlements: [],
  featureFlags: [],
  impersonator: undefined,
};

// Create reusable mocks
const withAuthMock = vi.fn(() => Promise.resolve(mockUserInfo));
const hasRoleMock = vi.fn(() => Promise.resolve(true));
const checkExpertSetupStatusMock = vi.fn(() =>
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
const findFirstMock = vi.fn();
const revalidatePathMock = vi.fn();

// Mock all dependencies before importing the function to test
vi.mock('@workos-inc/authkit-nextjs', () => ({
  withAuth: jest
    .fn()
    .mockImplementation((...args: Parameters<typeof withAuthMock>) => withAuthMock(...args)),
}));

vi.mock('@/lib/auth/roles.server', () => ({
  hasRole: jest
    .fn()
    .mockImplementation((...args: Parameters<typeof hasRoleMock>) => hasRoleMock(...args)),
}));

vi.mock('@/server/actions/expert-setup', () => ({
  checkExpertSetupStatus: jest
    .fn()
    .mockImplementation((...args: Parameters<typeof checkExpertSetupStatusMock>) =>
      checkExpertSetupStatusMock(...args),
    ),
}));

// DB operations with chainable update mocks
const updateSetMock = vi.fn();
const updateWhereMock = vi.fn();
const updateChain: { set: vi.Mock; where: vi.Mock } = {
  set: vi.fn().mockImplementation((...args: Parameters<typeof updateSetMock>) => {
    updateSetMock(...args);
    return updateChain;
  }),
  where: vi.fn().mockImplementation((...args: Parameters<typeof updateWhereMock>) => {
    updateWhereMock(...args);
    return updateChain;
  }),
};

vi.mock('@/drizzle/db', () => {
  return {
    db: {
      query: {
        ProfilesTable: {
          findFirst: jest
            .fn()
            .mockImplementation((...args: Parameters<typeof findFirstMock>) =>
              findFirstMock(...args),
            ),
        },
      },
      update: () => updateChain,
    },
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: jest
    .fn()
    .mockImplementation((...args: Parameters<typeof revalidatePathMock>) =>
      revalidatePathMock(...args),
    ),
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: (field: any, value: any) => value,
  relations: () => ({}),
}));

// Mock schema
vi.mock('@/drizzle/schema-workos', () => ({
  ProfilesTable: {
    workosUserId: 'workosUserId',
  },
}));

// Mock request metadata
vi.mock('@/lib/utils/server', () => ({
  getRequestMetadata: vi.fn().mockResolvedValue({
    ipAddress: '127.0.0.1',
    userAgent: 'Test User Agent',
  }),
}));

// Mock audit logging
vi.mock('@/lib/utils/server/audit', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('toggleProfilePublication', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set default mock behavior
    withAuthMock.mockResolvedValue(mockUserInfo);
    hasRoleMock.mockResolvedValue(true);
    findFirstMock.mockResolvedValue({
      id: '1',
      workosUserId: 'test-user-id',
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

    // Verify the DB operations - when publishing for the first time,
    // it should also record practitioner agreement acceptance
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        published: true,
        practitionerAgreementAcceptedAt: expect.any(Date),
        practitionerAgreementVersion: expect.any(String),
        practitionerAgreementIpAddress: expect.any(String),
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledTimes(5); // Revalidates multiple paths
  });

  it('should only record agreement data on first publish', async () => {
    // Arrange - profile that already accepted the agreement
    findFirstMock.mockResolvedValue({
      id: '1',
      workosUserId: 'test-user-id',
      published: false,
      practitionerAgreementAcceptedAt: new Date('2025-01-01'),
      practitionerAgreementVersion: '1.0',
      practitionerAgreementIpAddress: '1.2.3.4',
    });

    // Act
    const result = await toggleProfilePublication();

    // Assert
    expect(result).toEqual({
      success: true,
      message: 'Profile published successfully',
      isPublished: true,
    });

    // Verify the DB operations - should NOT update agreement fields
    expect(updateSetMock).toHaveBeenCalledWith({
      published: true,
    });
    expect(revalidatePathMock).toHaveBeenCalledTimes(5);
  });

  it('should unpublish a profile when it is published', async () => {
    // Arrange - set up mock for a published profile
    findFirstMock.mockResolvedValue({
      id: '1',
      workosUserId: 'test-user-id',
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
    withAuthMock.mockRejectedValueOnce(new Error('Not authenticated'));

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
    const originalUpdate = vi.requireMock('@/drizzle/db').db.update;
    vi.requireMock('@/drizzle/db').db.update = () => {
      throw new Error('Database error');
    };

    // Use vi.spyOn instead of replacing console.error
    // This allows viewing the log but prevents it from cluttering test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

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
      vi.requireMock('@/drizzle/db').db.update = originalUpdate;
      consoleSpy.mockRestore();
    }
  });
});
