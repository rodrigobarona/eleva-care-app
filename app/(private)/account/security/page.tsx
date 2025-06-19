'use client';

import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import { Separator } from '@/components/atoms/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/atoms/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/molecules/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/molecules/dialog';
import {
  checkExpertSetupStatus,
  handleGoogleAccountConnection,
} from '@/server/actions/expert-setup';
import { useSession, useUser } from '@clerk/nextjs';
import type { SessionWithActivitiesResource } from '@clerk/types';
import { Copy, Info, Laptop, Mail, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

// Clerk Core 2 (v6) - Using proper component-based OAuth handling
// No need for global Clerk object declarations

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

// Helper function to calculate days since password update
const getDaysSincePasswordUpdate = (lastUpdated: string): string => {
  const updateDate = new Date(lastUpdated);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - updateDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
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
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [accountToDisconnect, setAccountToDisconnect] = useState<{
    id: string;
    email: string;
  } | null>(null);

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

  // Detect OAuth success and show success message
  React.useEffect(() => {
    // Check if user just returned from OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const fromOAuth = sessionStorage.getItem('oauth_return_url');

    if (fromOAuth === '/account/security' || urlParams.get('oauth_success') === 'true') {
      // Clear the OAuth return URL
      sessionStorage.removeItem('oauth_return_url');

      // Update the user metadata to mark Google account as connected
      const updateGoogleAccountStatus = async () => {
        try {
          console.log('🔍 Starting Google account status update for expert...');

          // Check current user role first
          const userRoles = Array.isArray(user?.publicMetadata?.role)
            ? (user.publicMetadata.role as string[])
            : [user?.publicMetadata?.role as string];

          const isExpert = userRoles.some(
            (role: string) => role === 'community_expert' || role === 'top_expert',
          );

          console.log('🔍 User roles:', userRoles, 'Is expert:', isExpert);

          if (!isExpert) {
            console.log('ℹ️ User is not an expert, skipping expert setup metadata update');
            return;
          }

          const result = await handleGoogleAccountConnection();
          console.log('🔍 handleGoogleAccountConnection result:', result);

          if (result.success) {
            console.log('✅ Google account connection status updated in expert metadata');
            // The UI will automatically update when user.unsafeMetadata changes
            // No need for page reload in React
          } else {
            console.error('❌ Failed to update Google account connection status:', result.error);
          }
        } catch (error) {
          console.error('❌ Error updating Google account connection status:', error);
        }
      };

      // Update metadata first, then show success message
      updateGoogleAccountStatus().finally(() => {
        // Show success message after a short delay to ensure UI is ready
        setTimeout(() => {
          toast.success('Google account connected successfully!', {
            duration: 4000,
          });
        }, 1000);
      });

      // Clean URL if it has oauth_success parameter
      if (urlParams.get('oauth_success')) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

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

      // Update the password last updated timestamp in metadata
      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          passwordLastUpdated: new Date().toISOString(),
        },
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

      // Update the password last updated timestamp in metadata
      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          passwordLastUpdated: new Date().toISOString(),
        },
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

  const handleInitiateDisconnect = (accountId: string, email: string) => {
    setAccountToDisconnect({ id: accountId, email });
    setShowDisconnectDialog(true);
  };

  const handleConfirmDisconnect = async () => {
    if (!accountToDisconnect) return;

    try {
      setIsLoading(true);
      setShowDisconnectDialog(false);

      const account = user?.externalAccounts.find((acc) => acc.id === accountToDisconnect.id);
      const googleEmail = account?.emailAddress;

      // Disconnect the account using the destroy() method
      const accountToDestroy = user?.externalAccounts.find(
        (acc) => acc.id === accountToDisconnect.id,
      );
      if (accountToDestroy) {
        await accountToDestroy.destroy();
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
            accountId: accountToDisconnect.id,
            email: googleEmail,
          },
        }),
      );

      toast.success(
        `Successfully disconnected Google account${googleEmail ? ` (${googleEmail})` : ''}`,
      );
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

      // Store the return URL to handle proper redirection
      sessionStorage.setItem('oauth_return_url', '/account/security');

      // Redirect directly to security page with success parameter - no separate callback needed
      const callbackUrl = `${window.location.origin}/account/security?oauth_success=true`;

      // Debug logging
      console.log('🔧 OAuth Debug Info:', {
        callbackUrl,
        baseUrl: window.location.origin,
        environment: process.env.NODE_ENV,
      });

      // Show loading toast
      toast.loading('Connecting to Google...', { id: 'google-connect' });

      try {
        // Use the correct Clerk Core 2 method to create external account
        const externalAccount = await user.createExternalAccount({
          strategy: 'oauth_google',
          redirectUrl: callbackUrl, // Core 2 uses 'redirectUrl' (camelCase)
        });

        console.log('✅ External account creation response:', {
          hasVerification: !!externalAccount?.verification,
          hasRedirectURL: !!externalAccount?.verification?.externalVerificationRedirectURL,
          redirectURL: externalAccount?.verification?.externalVerificationRedirectURL?.toString(),
        });

        if (externalAccount?.verification?.externalVerificationRedirectURL) {
          // Dismiss loading toast
          toast.dismiss('google-connect');

          // Navigate to the OAuth URL - Core 2 handles this automatically
          window.location.href =
            externalAccount.verification.externalVerificationRedirectURL.toString();
        } else {
          throw new Error('No verification URL provided by Clerk');
        }
      } catch (createAccountError) {
        console.error('❌ Error creating external account:', createAccountError);
        throw createAccountError;
      }
    } catch (error) {
      console.error('❌ Error connecting account:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to connect account';
      if (error instanceof Error) {
        if (error.message.includes('redirect')) {
          errorMessage =
            'OAuth redirect URL mismatch. Please check your Clerk Dashboard configuration.';
        } else if (error.message.includes('verification')) {
          errorMessage = 'OAuth verification failed. Please try again.';
        } else if (error.message.includes('already_connected')) {
          errorMessage = 'This Google account is already connected to another user.';
        } else {
          errorMessage = `Connection failed: ${error.message}`;
        }
      }

      toast.error(errorMessage, { id: 'google-connect' });
      setIsConnectingAccount(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-regular font-serif text-3xl tracking-tight text-eleva-primary">
          Security Settings
        </h1>
        <p className="mt-2 text-sm leading-6 text-eleva-neutral-900/70">
          Manage your password, connected accounts, and security preferences for your account.
        </p>
      </div>

      {/* Password Section */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-3">
        <div className="space-y-1">
          <h3 className="font-regular font-serif text-xl tracking-tight text-eleva-primary">
            Password
          </h3>
          <p className="text-sm leading-6 text-eleva-neutral-900/70">
            Change your password or reset it if you&apos;ve forgotten it.
          </p>
        </div>

        <div className="lg:col-span-2">
          {user?.passwordEnabled ? (
            <div>
              {!showChangePasswordForm ? (
                <div className="rounded-lg border border-eleva-neutral-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="rounded-full bg-green-100 p-2">
                        <svg
                          className="h-5 w-5 text-green-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-medium text-eleva-primary">
                          Password is Active
                        </h4>
                        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                          <p className="text-sm text-eleva-neutral-900/70">
                            Your account is secured with a password.
                            {user?.passwordEnabled &&
                            user?.unsafeMetadata?.passwordLastUpdated &&
                            typeof user.unsafeMetadata.passwordLastUpdated === 'string' ? (
                              <span className="ml-1">
                                Last updated{' '}
                                {getDaysSincePasswordUpdate(
                                  user.unsafeMetadata.passwordLastUpdated,
                                )}
                                .
                              </span>
                            ) : null}
                          </p>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 flex-shrink-0 cursor-help text-eleva-neutral-900/50 hover:text-eleva-primary" />
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                sideOffset={5}
                                className="max-w-xs sm:max-w-sm"
                                avoidCollisions={true}
                              >
                                <p className="text-xs">
                                  We recommend changing your password every 90 days and using a
                                  unique password that you don&apos;t use elsewhere.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-eleva-neutral-900/60">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                            <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Encrypted
                          </span>
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-green-700">
                            <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Secure
                          </span>
                          <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-gray-700">
                            <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            meets requirements
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={handleInitiatePasswordChange}
                      disabled={isSettingPassword}
                      variant="outline"
                      className="ml-4"
                    >
                      {isSettingPassword ? 'Processing...' : 'Change Password'}
                    </Button>
                  </div>
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
        </div>
      </div>

      <Separator className="bg-eleva-neutral-200" />

      {/* Connected Devices Section */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-3">
        <div className="space-y-1">
          <h3 className="font-regular font-serif text-xl tracking-tight text-eleva-primary">
            Connected Devices
          </h3>
          <p className="text-sm leading-6 text-eleva-neutral-900/70">
            Devices that are currently signed in to your account.
          </p>
        </div>

        <div className="lg:col-span-2">
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
        </div>
      </div>

      <Separator className="bg-eleva-neutral-200" />

      {/* Connected Accounts Section */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-3">
        <div className="space-y-1">
          <h3 className="font-regular font-serif text-xl tracking-tight text-eleva-primary">
            Connected Accounts
          </h3>
          <p className="text-sm leading-6 text-eleva-neutral-900/70">
            Manage your connected social accounts and login methods.
          </p>
        </div>

        <div className="lg:col-span-2">
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
                    onClick={() => handleInitiateDisconnect(account.id, account.emailAddress)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Separator className="bg-eleva-neutral-200" />

      {/* Google Account Disconnect Confirmation Dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Google Account?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to disconnect your Google account{' '}
                  <span className="font-semibold">{accountToDisconnect?.email}</span>.
                </p>
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex items-start space-x-3">
                    <svg
                      className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <h4 className="text-sm font-semibold text-yellow-800">
                        This will affect your calendar availability
                      </h4>
                      <div className="mt-2 text-sm text-yellow-700">
                        <ul className="list-inside list-disc space-y-1">
                          <li>You won&apos;t be able to show available time slots for bookings</li>
                          <li>
                            Existing calendar meetings will remain but new ones cannot be created
                          </li>
                          <li>Your expert profile may become unavailable for appointments</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  You can reconnect your Google account at any time to restore calendar
                  functionality.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDisconnect}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Disconnecting...' : 'Disconnect Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User ID section */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-3">
        <div className="space-y-1">
          <h3 className="font-regular font-serif text-xl tracking-tight text-eleva-primary">
            Your User ID
          </h3>
          <p className="text-sm leading-6 text-eleva-neutral-900/70">
            Your unique identifier for API access and support requests.
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center gap-x-2 rounded-lg border border-eleva-neutral-200 bg-eleva-neutral-100/50 p-3">
            <code className="font-mono text-sm text-eleva-neutral-900">{user?.id}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyUserId}
              className="ml-auto text-eleva-neutral-900/60 hover:text-eleva-primary"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Separator className="bg-eleva-neutral-200" />

      {/* Delete Account section */}
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-3">
        <div className="space-y-1">
          <h3 className="font-regular font-serif text-xl tracking-tight text-eleva-primary">
            Delete Account
          </h3>
          <p className="text-sm leading-6 text-eleva-neutral-900/70">
            Permanently delete your account and all associated data.
          </p>
        </div>

        <div className="lg:col-span-2">
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
        </div>
      </div>
    </div>
  );
}
