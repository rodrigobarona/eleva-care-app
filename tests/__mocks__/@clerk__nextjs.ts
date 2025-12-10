/**
 * Mock for @clerk/nextjs module
 * This file provides mocks for Clerk authentication in tests
 */
import React from 'react';

// Mock auth function
export const auth = jest.fn().mockResolvedValue({
  userId: 'user_123',
  sessionId: 'sess_123',
  sessionClaims: {
    sub: 'user_123',
    sid: 'sess_123',
    role: ['community_expert'],
  },
  getToken: jest.fn().mockResolvedValue('mock-token'),
});

// Mock currentUser function
export const currentUser = jest.fn().mockResolvedValue({
  id: 'user_123',
  firstName: 'Test',
  lastName: 'User',
  fullName: 'Test User',
  username: 'testuser',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
  primaryEmailAddressId: 'email_123',
  imageUrl: 'https://example.com/avatar.jpg',
  unsafeMetadata: {},
  publicMetadata: {},
  privateMetadata: {},
});

// Mock ClerkProvider
export const ClerkProvider = ({ children }: { children: React.ReactNode }) => children;

// Mock useAuth hook
export const useAuth = jest.fn().mockReturnValue({
  isLoaded: true,
  isSignedIn: true,
  userId: 'user_123',
  sessionId: 'sess_123',
  orgId: null,
  orgRole: null,
  getToken: jest.fn().mockResolvedValue('mock-token'),
  signOut: jest.fn(),
});

// Mock useUser hook
export const useUser = jest.fn().mockReturnValue({
  isLoaded: true,
  isSignedIn: true,
  user: {
    id: 'user_123',
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    username: 'testuser',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    primaryEmailAddressId: 'email_123',
    imageUrl: 'https://example.com/avatar.jpg',
    unsafeMetadata: {},
    publicMetadata: {},
    privateMetadata: {},
    update: jest.fn().mockResolvedValue({}),
  },
});

// Mock useClerk hook
export const useClerk = jest.fn().mockReturnValue({
  signOut: jest.fn(),
  openSignIn: jest.fn(),
  openSignUp: jest.fn(),
  openUserProfile: jest.fn(),
});

// Mock SignedIn component
export const SignedIn = ({ children }: { children: React.ReactNode }) => children;

// Mock SignedOut component
export const SignedOut = ({ children: _children }: { children: React.ReactNode }) => null;

// Mock SignInButton component
export const SignInButton = ({ children }: { children?: React.ReactNode }) =>
  children || React.createElement('button', null, 'Sign In');

// Mock SignOutButton component
export const SignOutButton = ({ children: _children }: { children?: React.ReactNode }) =>
  _children || React.createElement('button', null, 'Sign Out');

// Mock UserButton component
export const UserButton = () => React.createElement('div', null, 'UserButton');

// Mock clerkClient
export const clerkClient = {
  users: {
    getUser: jest.fn().mockResolvedValue({
      id: 'user_123',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      imageUrl: 'https://example.com/avatar.jpg',
    }),
    getUserList: jest.fn().mockResolvedValue({ data: [] }),
    updateUser: jest.fn().mockResolvedValue({}),
    updateUserMetadata: jest.fn().mockResolvedValue({}),
  },
};

// Mock redirect functions
export const redirectToSignIn = jest.fn();
export const redirectToSignUp = jest.fn();

