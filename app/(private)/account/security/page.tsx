'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/molecules/dialog';
import { checkExpertSetupStatus } from '@/server/actions/expert-setup';
import { useSession, useUser } from '@clerk/nextjs';
import type { SessionWithActivitiesResource } from '@clerk/types';
import { Copy, Laptop, Mail, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

// Define types for Clerk global object
declare global {
  interface Window {
    Clerk?: {
      client: {
        authenticateWithRedirect: (params: {
          strategy: string;
          redirectUrl: string;
        }) => Promise<void>;
      };
    };
  }
}

// Add this helper function at the top level of your file
const formatLastSeen = (date: Date) => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeString = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeString}`;
  }

  if (isYesterday) {
    return `Yesterday at ${timeString}`;
  }

  return `${date.toLocaleDateString()} at ${timeString}`;
};

export default function SecurityPage() {
  const router = useRouter();
  const { isLoaded: isUserLoaded, user } = useUser();
  const { session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false);
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [sessions, setSessions] = useState<SessionWithActivitiesResource[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionWithActivitiesResource | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [isConnectingAccount, setIsConnectingAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const loadSessions = useCallback(async () => {
    if (!user || !isUserLoaded) return;
    try {
      const sessions = await user.getSessions();
      setSessions(sessions);
      setCurrentSession(sessions.find((s) => s.id === session?.id) || null);
    } catch (error: unknown) {
      toast.error(
        `Failed to load sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }, [user, session, isUserLoaded]);

  React.useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Calculate password strength whenever password changes
  React.useEffect(() => {
    // Password strength calculation based on criteria
    const calculateStrength = (password: string): number => {
      if (!password) return 0;

      let score = 0;

      // Length check (8 characters minimum required by Clerk)
      if (password.length >= 8) score += 20;
      if (password.length >= 12) score += 10;

      // Character variety checks
      if (/[A-Z]/.test(password)) score += 20; // Has uppercase
      if (/[a-z]/.test(password)) score += 20; // Has lowercase
      if (/[0-9]/.test(password)) score += 20; // Has number
      if (/[^A-Za-z0-9]/.test(password)) score += 20; // Has special char

      // Adjust final score to be between 0-100
      return Math.min(100, score);
    };

    setPasswordStrength(calculateStrength(password));
  }, [password]);

  // Get strength label and color based on score
  const getStrengthDetails = () => {
    if (passwordStrength < 20) return { label: 'Very Weak', color: 'bg-red-500' };
    if (passwordStrength < 40) return { label: 'Weak', color: 'bg-orange-500' };
    if (passwordStrength < 60) return { label: 'Medium', color: 'bg-yellow-500' };
    if (passwordStrength < 80) return { label: 'Strong', color: 'bg-lime-500' };
    return { label: 'Very Strong', color: 'bg-green-500' };
  };

  const { label: strengthLabel, color: strengthColor } = getStrengthDetails();

  const devices = sessions
    .filter((session, index, self) => self.findIndex((s) => s.id === session.id) === index)
    .map((session) => {
      // Extract location details if available
      let location = '';

      // Safely access location data from Clerk session
      if (session.latestActivity) {
        const city = session.latestActivity.city || '';
        const country = session.latestActivity.country || '';
        location = city && country ? `${city}, ${country}` : city || country || 'Location unknown';
      } else {
        location = 'Location unknown';
      }

      return {
        id: session.id,
        sessionId: session.id,
        name: `${session.latestActivity?.browserName || 'Unknown'} ${session.latestActivity?.deviceType || ''}`,
        type: session.latestActivity?.isMobile ? 'mobile' : 'desktop',
        lastSeen: formatLastSeen(new Date(session.lastActiveAt)),
        isCurrent: session.id === currentSession?.id,
        location,
        ip: session.latestActivity?.ipAddress || 'Unknown IP',
      };
    });

  const handleInitiatePasswordSet = () => {
    setShowPasswordForm(true);
    setShowChangePasswordForm(false);
  };

  const handleInitiatePasswordChange = () => {
    setShowChangePasswordForm(true);
    setShowPasswordForm(false);
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      toast.error('Please enter a new password');
      return;
    }

    try {
      setIsSettingPassword(true);

      await user?.updatePassword({
        newPassword: password,
      });

      toast.success('Password set successfully');
      setPassword('');
      setShowPasswordForm(false);
    } catch (error: unknown) {
      console.error('Error setting password:', error);
      toast.error(
        `Failed to set password: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !password) {
      toast.error('Please enter both current and new passwords');
      return;
    }

    try {
      setIsSettingPassword(true);

      await user?.updatePassword({
        currentPassword: currentPassword,
        newPassword: password,
        signOutOfOtherSessions: true,
      });

      toast.success('Password updated successfully');
      setCurrentPassword('');
      setPassword('');
      setShowChangePasswordForm(false);

      await loadSessions();
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      toast.error(
        `Failed to change password: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsSettingPassword(false);
    }
  };

  const connectedAccounts =
    user?.externalAccounts?.filter((account) => account.provider.includes('google')) || [];

  const copyUserId = () => {
    navigator.clipboard.writeText(user?.id || '');
    toast.success('User ID copied to clipboard');
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      await user?.delete();
      toast.success('Account deleted successfully');
      setIsDialogOpen(false);
      router.push('/sign-in');
    } catch (error: unknown) {
      toast.error(
        `Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectAccount = async (accountId: string) => {
    try {
      setIsLoading(true);
      const account = user?.externalAccounts.find((acc) => acc.id === accountId);
      const googleEmail = account?.emailAddress;

      // Disconnect the account using the destroy() method
      const accountToDisconnect = user?.externalAccounts.find((acc) => acc.id === accountId);
      if (accountToDisconnect) {
        await accountToDisconnect.destroy();
      }

      // Find and remove the email if it's not the primary email
      if (googleEmail && user?.primaryEmailAddress?.emailAddress !== googleEmail) {
        const emailToRemove = user?.emailAddresses.find(
          (email) => email.emailAddress === googleEmail,
        );
        if (emailToRemove) {
          await emailToRemove.destroy();
        }
      }

      // Directly update the metadata for expert setup
      if (user?.unsafeMetadata?.expertSetup) {
        const expertSetup = { ...(user.unsafeMetadata.expertSetup as Record<string, boolean>) };
        expertSetup.google_account = false;

        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            expertSetup,
          },
        });
      }

      // Update expert setup status from server
      await checkExpertSetupStatus();

      // Dispatch the disconnection event
      window.dispatchEvent(
        new CustomEvent('google-account-disconnected', {
          detail: {
            timestamp: new Date().toISOString(),
            accountId,
            email: googleEmail,
          },
        }),
      );

      toast.success(
        `Successfully disconnected Google account${googleEmail ? ` (${googleEmail})` : ''}`,
      );

      // Force a reload after a short delay to ensure all changes are reflected
      setTimeout(() => {
        window.location.href = '/account/security';
      }, 1500);
    } catch (error) {
      console.error('Error disconnecting account:', error);
      toast.error('Failed to disconnect account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectAccount = async () => {
    try {
      setIsConnectingAccount(true);

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already has a Google account connected
      const existingGoogleAccounts = user.externalAccounts.filter(
        (account) => account.provider === 'google',
      );

      if (existingGoogleAccounts.length > 0) {
        // Let the user know they already have a Google account and ask if they want to add another
        toast.info(
          'You already have a Google account connected. You can continue to add another account or cancel.',
          {
            duration: 5000,
            action: {
              label: 'Cancel',
              onClick: () => {
                setIsConnectingAccount(false);
                return;
              },
            },
          },
        );
        // Continue after a short delay if they don't cancel
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Store if user is an expert in session storage to use in callback
      const isExpert =
        user.publicMetadata?.role &&
        (Array.isArray(user.publicMetadata.role)
          ? user.publicMetadata.role.some((role) =>
              ['community_expert', 'top_expert'].includes(String(role)),
            )
          : ['community_expert', 'top_expert'].includes(String(user.publicMetadata.role)));

      if (isExpert) {
        sessionStorage.setItem('is_expert_oauth_flow', 'true');
      }

      // IMPORTANT: Store the return URL to handle proper redirection
      sessionStorage.setItem('oauth_return_url', '/account/security');

      // Create a callback URL for the OAuth flow - must match what's configured in Clerk dashboard
      const callbackUrl = `${window.location.origin}/account/security/callback`;

      // Show loading toast
      toast.loading('Connecting to Google...', { id: 'google-connect' });

      // Generate a PKCE code verifier and challenge for enhanced security
      const codeVerifier = Array.from(
        { length: 64 },
        () =>
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[
            Math.floor(Math.random() * 66)
          ],
      ).join('');

      // Store the code verifier in session storage to be used in the callback
      sessionStorage.setItem('oauth_code_verifier', codeVerifier);

      // Use the standard createExternalAccount method to start the OAuth flow
      // Note: scopes and verification parameters are now configured in Clerk Dashboard
      const externalAccount = await user.createExternalAccount({
        strategy: 'oauth_google',
        redirectUrl: callbackUrl,
      });

      if (externalAccount?.verification?.externalVerificationRedirectURL) {
        // Dismiss loading toast
        toast.dismiss('google-connect');

        // Add parameters to enhance security and UX
        const redirectUrl = new URL(externalAccount.verification.externalVerificationRedirectURL);

        // Force Google to show the account selector, even if user is already logged in
        redirectUrl.searchParams.append('prompt', 'select_account');

        // Navigate to the OAuth URL
        window.location.href = redirectUrl.toString();
      } else {
        throw new Error('No verification URL provided');
      }

      // Add a custom function to automatically update metadata after connection
      window.addEventListener(
        'google-account-connected',
        async function onConnected(event) {
          console.log('Detected Google account connection event:', event);
          try {
            // Remove the listener to prevent duplicate handling
            window.removeEventListener('google-account-connected', onConnected);

            // Update the metadata directly in addition to the server check
            if (user?.unsafeMetadata) {
              const expertSetup = {
                ...((user.unsafeMetadata.expertSetup as Record<string, boolean>) || {}),
              };
              expertSetup.google_account = true;

              await user.update({
                unsafeMetadata: {
                  ...user.unsafeMetadata,
                  expertSetup,
                },
              });
              console.log('Updated Google account connection status in metadata');
            }
          } catch (updateError) {
            console.error('Error updating metadata after Google connection:', updateError);
          }
        },
        { once: true },
      ); // Ensure it only runs once
    } catch (error) {
      console.error('Error connecting account:', error);
      toast.error(
        `Failed to connect account: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { id: 'google-connect' },
      );
      setIsConnectingAccount(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Security Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your password and security preferences.
        </p>
      </div>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Change your password or reset it if you&apos;ve forgotten it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user?.passwordEnabled ? (
            <div>
              {!showChangePasswordForm ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Password is set</span>
                  <Button onClick={handleInitiatePasswordChange} disabled={isSettingPassword}>
                    {isSettingPassword ? 'Processing...' : 'Change Password'}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label htmlFor="current-password" className="mb-1 block text-sm font-medium">
                      Current Password
                    </label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full pr-10"
                        placeholder="Enter your current password"
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-5 w-5"
                            aria-hidden="true"
                          >
                            <title>Hide password</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-5 w-5"
                            aria-hidden="true"
                          >
                            <title>Show password</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="new-password" className="mb-1 block text-sm font-medium">
                      New Password
                    </label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pr-10"
                        placeholder="Enter your new password"
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-5 w-5"
                            aria-hidden="true"
                          >
                            <title>Hide password</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-5 w-5"
                            aria-hidden="true"
                          >
                            <title>Show password</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    {password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">
                            Password Strength: {strengthLabel}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-200">
                          <div
                            className={`h-1.5 rounded-full ${strengthColor} transition-all duration-300`}
                            style={{ width: `${passwordStrength}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Password must be at least 8 characters and strong enough to meet security
                      requirements.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="submit" disabled={isSettingPassword}>
                      {isSettingPassword ? 'Updating Password...' : 'Update Password'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowChangePasswordForm(false)}
                      disabled={isSettingPassword}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div>
              {!showPasswordForm ? (
                <Button onClick={handleInitiatePasswordSet} disabled={isSettingPassword}>
                  {isSettingPassword ? 'Processing...' : 'Set Password'}
                </Button>
              ) : (
                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div>
                    <label htmlFor="new-password" className="mb-1 block text-sm font-medium">
                      New Password
                    </label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pr-10"
                        placeholder="Enter a new password"
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-5 w-5"
                            aria-hidden="true"
                          >
                            <title>Hide password</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="h-5 w-5"
                            aria-hidden="true"
                          >
                            <title>Show password</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    {password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">
                            Password Strength: {strengthLabel}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-200">
                          <div
                            className={`h-1.5 rounded-full ${strengthColor} transition-all duration-300`}
                            style={{ width: `${passwordStrength}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Password must be at least 8 characters and strong enough to meet security
                      requirements.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="submit" disabled={isSettingPassword}>
                      {isSettingPassword ? 'Setting Password...' : 'Set Password'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPasswordForm(false)}
                      disabled={isSettingPassword}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Devices Section */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Devices</CardTitle>
          <CardDescription>Devices that are currently signed in to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  {device.type === 'desktop' ? (
                    <Laptop className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{device.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {device.lastSeen}
                      {device.isCurrent && ' (Current device)'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <Popover>
                        <PopoverTrigger className="underline decoration-dotted">
                          {device.location}
                        </PopoverTrigger>
                        <PopoverContent className="w-auto">
                          <p className="text-sm">IP Address: {device.ip}</p>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Connected Accounts Section */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Manage your connected social accounts and login methods.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {connectedAccounts.length === 0 ? (
              <div className="flex flex-col items-start gap-4">
                <p className="text-sm text-muted-foreground">No connected accounts found.</p>
                <Button
                  variant="outline"
                  onClick={() => handleConnectAccount()}
                  disabled={isConnectingAccount}
                >
                  {isConnectingAccount ? 'Connecting...' : 'Connect Google Account'}
                </Button>
              </div>
            ) : (
              connectedAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Google Account</p>
                      <p className="text-sm text-muted-foreground">{account.emailAddress}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleDisconnectAccount(account.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add User ID section */}
      <Card>
        <CardHeader>
          <CardTitle>Your User ID</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-x-2 rounded-md bg-muted p-3">
            <code className="text-sm">{user?.id}</code>
            <Button variant="ghost" size="sm" onClick={copyUserId} className="ml-auto">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Delete Account section */}
      <Card>
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
        </CardHeader>
        <CardContent>
          <fieldset className="rounded-lg border-2 border-destructive/20 p-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Permanently delete your workspace, custom domain, and all associated links + their
              stats. This action cannot be undone - please proceed with caution.
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-destructive">Delete Account</DialogTitle>
                  <DialogDescription className="pt-4">
                    <div className="space-y-4">
                      <p className="font-semibold text-foreground">
                        Warning: This will permanently delete your account and all associated data:
                      </p>
                      <ul className="list-disc space-y-2 pl-4 text-sm">
                        <li>All your workspaces and settings</li>
                        <li>Custom domains configurations</li>
                        <li>All links and their analytics data</li>
                        <li>Profile information and preferences</li>
                      </ul>
                      <div className="space-y-4 pt-4">
                        <div>
                          <label htmlFor="delete-confirmation" className="text-sm font-medium">
                            To verify, type &quot;delete my account&quot; below:
                          </label>
                          <Input
                            id="delete-confirmation"
                            className="mt-2"
                            placeholder="delete my account"
                            onChange={(e) => {
                              const isValid = e.target.value === 'delete my account';
                              setCanDelete(isValid);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isLoading || !canDelete}
                  >
                    {isLoading ? 'Deleting...' : 'Permanently Delete Account'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </fieldset>
        </CardContent>
      </Card>
    </div>
  );
}
