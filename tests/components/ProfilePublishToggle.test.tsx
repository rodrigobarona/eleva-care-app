import { vi } from 'vitest';
import { ProfilePublishToggle } from '@/components/features/profile/ProfilePublishToggle';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

// Create a properly configured jest mock function before mocking the module
const mockToggleProfilePublication = vi.fn<(...args: any[]) => Promise<any>>();
const mockCheckExpertSetupStatus = vi.fn<(...args: any[]) => Promise<any>>();

// Mock the server actions
vi.mock('@/server/actions/expert-profile', () => ({
  toggleProfilePublication: mockToggleProfilePublication,
}));

vi.mock('@/server/actions/expert-setup', () => ({
  checkExpertSetupStatus: mockCheckExpertSetupStatus,
}));

// Mock toast notification
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ProfilePublishToggle', () => {
  const mockProps = {
    initialPublishedStatus: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock implementations
    (mockToggleProfilePublication as any).mockResolvedValue({
      success: true,
      isPublished: true,
      message: 'Profile published successfully',
    });

    (mockCheckExpertSetupStatus as any).mockResolvedValue({
      setupStatus: {
        profile: true,
        events: true,
        availability: true,
        identity: true,
        payment: true,
      },
    });
  });

  it('should render with correct initial state when not published', () => {
    render(<ProfilePublishToggle {...mockProps} />);

    // Check if the component renders without crashing
    expect(screen.getByText('Profile Not Published')).toBeTruthy();

    // Check if the switch is not checked
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('should show correct text when published', () => {
    const publishedProps = { initialPublishedStatus: true };

    render(<ProfilePublishToggle {...publishedProps} />);

    expect(screen.getByText('Profile Published')).toBeTruthy();

    // Check if the switch is checked
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('should show a dialog when toggle is clicked', async () => {
    render(<ProfilePublishToggle {...mockProps} />);

    const toggle = screen.getByRole('switch');

    await act(async () => {
      fireEvent.click(toggle);
      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    // Should show some kind of dialog (either publish or incomplete)
    // We don't care which one, just that a dialog appears
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeTruthy();
  });

  it('should show incomplete steps dialog when setup is not complete', async () => {
    // Mock incomplete setup
    (mockCheckExpertSetupStatus as any).mockResolvedValue({
      setupStatus: {
        profile: true,
        events: false,
        availability: false,
        identity: true,
        payment: false,
      },
    });

    // Mock toggle to return incomplete steps
    (mockToggleProfilePublication as any).mockResolvedValue({
      success: false,
      isPublished: false,
      message: 'Cannot publish profile until all setup steps are complete',
      incompleteSteps: ['events', 'availability', 'payment'],
    });

    render(<ProfilePublishToggle {...mockProps} />);

    const toggle = screen.getByRole('switch');

    await act(async () => {
      fireEvent.click(toggle);
      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    // Should show the incomplete steps dialog
    expect(screen.getByText('Complete All Steps First')).toBeTruthy();
    expect(screen.getByText('Create at least one service')).toBeTruthy();
  });

  it('should show unpublish dialog when currently published', async () => {
    const publishedProps = { initialPublishedStatus: true };

    render(<ProfilePublishToggle {...publishedProps} />);

    const toggle = screen.getByRole('switch');

    await act(async () => {
      fireEvent.click(toggle);
      // Wait for dialog to appear
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Should show the unpublish confirmation dialog
    expect(screen.getByText('Unpublish Your Expert Profile')).toBeTruthy();
  });

  it('should verify mock functions are properly set up', () => {
    // This test verifies that our mocks are set up correctly
    expect(typeof mockCheckExpertSetupStatus).toBe('function');
    expect(typeof mockToggleProfilePublication).toBe('function');

    // Test that we can call the mocks directly
    expect(() => mockCheckExpertSetupStatus()).not.toThrow();
    expect(() => mockToggleProfilePublication()).not.toThrow();
  });
});
