import { ProfilePublishToggle } from '@/components/organisms/ProfilePublishToggle';
// Import the mocked server action
import { toggleProfilePublishedState } from '@/server/actions/expert-profile';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { toast } from 'sonner';

// Mock the server action
jest.mock('@/server/actions/expert-profile', () => ({
  toggleProfilePublishedState: jest.fn(),
}));

// Mock toast notification
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Create custom matchers to replace jest-dom
expect.extend({
  toBeInTheDocument(received) {
    const pass = Boolean(received);
    return {
      pass,
      message: () => `expected ${received} to ${pass ? 'not ' : ''}be in the document`,
    };
  },
  toBeChecked(received) {
    const pass = received?.checked === true;
    return {
      pass,
      message: () => `expected ${received} to ${pass ? 'not ' : ''}be checked`,
    };
  },
  toBeDisabled(received) {
    const pass = received?.disabled === true;
    return {
      pass,
      message: () => `expected ${received} to ${pass ? 'not ' : ''}be disabled`,
    };
  },
});

describe('ProfilePublishToggle', () => {
  const mockProps = {
    isPublished: false,
    userId: 'user_123',
    completedSetup: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (toggleProfilePublishedState as jest.Mock).mockResolvedValue({
      success: true,
      isPublished: true,
    });
  });

  it('renders with correct initial state', () => {
    render(<ProfilePublishToggle {...mockProps} />);

    expect(screen.getByText('Profile visibility')).toBeTruthy();
    expect(screen.getByText('Private')).toBeTruthy();

    // Toggle should be in the off position
    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeChecked();
  });

  it('renders published state correctly', () => {
    render(<ProfilePublishToggle {...mockProps} isPublished={true} />);

    expect(screen.getByText('Profile visibility')).toBeTruthy();
    expect(screen.getByText('Public')).toBeTruthy();

    // Toggle should be in the on position
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeChecked();
  });

  it('handles toggle click correctly when publishing profile', async () => {
    render(<ProfilePublishToggle {...mockProps} />);

    // Click the toggle button
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    // Should show loading state
    expect(screen.getByText('Publishing...')).toBeTruthy();

    // Wait for the action to complete
    await waitFor(() => {
      // Check the server action was called with the right params
      expect(toggleProfilePublishedState).toHaveBeenCalledWith({
        userId: 'user_123',
        publish: true,
      });

      // Check the success toast was displayed
      expect(toast.success).toHaveBeenCalledWith('Profile published successfully!');

      // Should now show "Public" state
      expect(screen.getByText('Public')).toBeTruthy();
    });
  });

  it('handles toggle click correctly when unpublishing profile', async () => {
    render(<ProfilePublishToggle {...mockProps} isPublished={true} />);

    // Click the toggle button
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    // Should show loading state
    expect(screen.getByText('Unpublishing...')).toBeTruthy();

    // Wait for the action to complete
    await waitFor(() => {
      // Check the server action was called with the right params
      expect(toggleProfilePublishedState).toHaveBeenCalledWith({
        userId: 'user_123',
        publish: false,
      });

      // Check the success toast was displayed
      expect(toast.success).toHaveBeenCalledWith('Profile set to private');
    });
  });

  it('handles errors gracefully', async () => {
    (toggleProfilePublishedState as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Failed to update profile',
    });

    render(<ProfilePublishToggle {...mockProps} />);

    // Click the toggle button
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    // Wait for the action to complete
    await waitFor(() => {
      // Check the error toast was displayed
      expect(toast.error).toHaveBeenCalledWith('Failed to update profile');

      // Should remain in "Private" state
      expect(screen.getByText('Private')).toBeTruthy();
    });
  });

  it('disables the toggle when setup is not complete', () => {
    render(<ProfilePublishToggle {...mockProps} completedSetup={false} />);

    // Toggle should be disabled
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeDisabled();

    // Should show tooltip or warning
    const warningText = screen.getByText(/complete your profile setup/i);
    expect(warningText).toBeTruthy();
  });
});
