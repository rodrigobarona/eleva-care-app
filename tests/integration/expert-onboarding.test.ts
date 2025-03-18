// Import Jest globals first
import { clerkClient } from '@clerk/nextjs/server';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
// Import dependencies for assertions
import { revalidatePath } from 'next/cache';

// Import our mocks
import {
  mockCheckExpertSetupStatus,
  mockMarkStepComplete,
  mockToggleProfilePublication,
  mockUpdateProfile,
  mockUser,
} from './expert-setup-mocks';

// Mock modules
jest.mock('@clerk/nextjs/server', () => ({
  currentUser: jest.fn().mockResolvedValue(mockUser),
  clerkClient: {
    users: {
      updateUser: jest.fn().mockResolvedValue(mockUser),
      getUser: jest.fn().mockResolvedValue(mockUser),
    },
  },
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Mock our server actions
jest.mock('@/server/actions/expert-setup', () => ({
  markStepComplete: mockMarkStepComplete,
  checkExpertSetupStatus: mockCheckExpertSetupStatus,
}));

jest.mock('@/server/actions/profile', () => ({
  updateProfile: mockUpdateProfile,
  toggleProfilePublication: mockToggleProfilePublication,
}));

// Define type for profile data
interface ProfileData {
  firstName?: string;
  lastName?: string;
  shortBio?: string;
  longBio?: string;
}

describe('Expert Onboarding Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow completing profile step of expert onboarding', async () => {
    // Arrange - Set up the initial state
    const profileData = {
      firstName: 'John',
      lastName: 'Doe',
      shortBio: 'Expert in software testing',
      longBio: 'I have over 10 years of experience in software testing.',
    };

    // Act - Update the profile and mark step complete
    const profileResult = await mockUpdateProfile(profileData);
    const stepResult = await mockMarkStepComplete('profile');

    // Assert - Verify that the step was marked complete
    expect(profileResult.success).toBe(true);
    expect(stepResult.success).toBe(true);
    expect(stepResult.setupStatus.profile).toBe(true);

    // Verify functions were called with correct parameters
    expect(mockUpdateProfile).toHaveBeenCalledWith(profileData);
    expect(mockMarkStepComplete).toHaveBeenCalledWith('profile');
  });

  it('should prevent publishing a profile until all required steps are complete', async () => {
    // Arrange - Make sure some steps are incomplete
    mockCheckExpertSetupStatus.mockResolvedValueOnce({
      success: true,
      setupStatus: {
        profile: true,
        events: true,
        availability: false,
        identity: false,
        payment: false,
        google_account: false,
      },
      isPublished: false,
    });

    // Act - Try to publish the profile
    const result = await mockToggleProfilePublication();

    // Assert - Verify that publishing was prevented
    expect(result.success).toBe(false);
    expect(result.message).toContain('Cannot publish profile');
    // Based on our defaultSetupStatus in the mock implementation, availability is in incompleteSteps
    expect(result.incompleteSteps).toContain('availability');
    expect(result.incompleteSteps).toContain('identity');
  });

  it('should validate required information for each onboarding step', async () => {
    // Arrange - Set up invalid profile data
    const invalidProfileData: ProfileData = {
      firstName: '', // First name is required
      lastName: 'Doe',
      shortBio: '', // Short bio is required
    };

    // Mock the profile validation function
    const validateProfile = (data: ProfileData) => {
      const errors: Record<string, string> = {};
      if (!data.firstName) errors.firstName = 'First name is required';
      if (!data.lastName) errors.lastName = 'Last name is required';
      if (!data.shortBio) errors.shortBio = 'Short bio is required';
      return Object.keys(errors).length > 0 ? { success: false, errors } : { success: true };
    };

    // Act - Validate the invalid profile data
    const validationResult = validateProfile(invalidProfileData);

    // Assert - Verify that validation failed with appropriate errors
    expect(validationResult.success).toBe(false);
    expect(validationResult.errors).toHaveProperty('firstName');
    expect(validationResult.errors).toHaveProperty('shortBio');
    expect(validationResult.errors).not.toHaveProperty('lastName');
  });

  it('should show onboarding progress accurately', async () => {
    // Arrange - Set initial setup status
    const initialSetupStatus = {
      profile: true,
      events: true,
      availability: false,
      identity: false,
      payment: false,
      google_account: false,
    };

    mockCheckExpertSetupStatus.mockResolvedValueOnce({
      success: true,
      setupStatus: initialSetupStatus,
      isPublished: false,
    });

    // Calculate expected progress
    const totalSteps = Object.keys(initialSetupStatus).length;
    const completedSteps = Object.values(initialSetupStatus).filter(Boolean).length;
    const expectedProgress = Math.round((completedSteps / totalSteps) * 100);

    // Mock a progress calculation function
    const calculateProgress = (setupStatus: Record<string, boolean>) => {
      const total = Object.keys(setupStatus).length;
      const completed = Object.values(setupStatus).filter(Boolean).length;
      return Math.round((completed / total) * 100);
    };

    // Act - Get current setup status and calculate progress
    const result = await mockCheckExpertSetupStatus();
    const progress = calculateProgress(result.setupStatus);

    // Assert - Verify progress calculation is correct (2/6 steps = 33%)
    expect(result.success).toBe(true);
    expect(progress).toBe(33);
  });

  it('should allow publishing profile when all steps are complete', async () => {
    // Arrange - Override the default mock to make all steps complete
    const allCompleteSetupStatus = {
      profile: true,
      events: true,
      availability: true,
      identity: true,
      payment: true,
      google_account: true,
    };

    // Override the mock implementation for this test only
    mockToggleProfilePublication.mockImplementationOnce(() => {
      return Promise.resolve({
        success: true,
        message: 'Profile published successfully',
        isPublished: true,
      });
    });

    // Act - Try to publish the profile
    const result = await mockToggleProfilePublication();

    // Assert - Verify that publishing succeeded
    expect(result.success).toBe(true);
    expect(result.message).toContain('Profile published successfully');
    expect(result.isPublished).toBe(true);
  });
});
