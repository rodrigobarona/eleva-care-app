'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/molecules/dialog';
import { useSession, useUser } from '@clerk/nextjs';
import type { OAuthProvider, SessionWithActivitiesResource } from '@clerk/types';
import { Copy, Laptop, Mail, Smartphone, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

export default function SecurityPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sessions, setSessions] = useState<SessionWithActivitiesResource[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionWithActivitiesResource | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [isRevokingDevice, setIsRevokingDevice] = useState(false);
  const [isDisconnectingAccount, setIsDisconnectingAccount] = useState(false);
  const [isConnectingAccount, setIsConnectingAccount] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!user || !isLoaded) return;
    try {
      const sessions = await user.getSessions();
      setSessions(sessions);
      setCurrentSession(sessions.find((s) => s.id === session?.id) || null);
    } catch (error: unknown) {
      toast.error(
        `Failed to load sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }, [user, session, isLoaded]);

  React.useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const devices = sessions
    .filter((session, index, self) => self.findIndex((s) => s.id === session.id) === index)
    .map((session) => ({
      id: session.id,
      sessionId: session.id,
      name: `${session.latestActivity?.browserName || 'Unknown'} ${session.latestActivity?.deviceType || ''}`,
      type: session.latestActivity?.isMobile ? 'mobile' : 'desktop',
      lastSeen: new Date(session.lastActiveAt).toLocaleDateString(),
      isCurrent: session.id === currentSession?.id,
    }));

  const handleInitiatePasswordSet = async () => {
    try {
      setIsSettingPassword(true);
      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          password: password,
        },
      });
      setShowPasswordForm(true);
      router.refresh();
      toast.success('Password set successfully');
    } catch (error) {
      console.error('Error initiating password set:', error);
      toast.error('Failed to set password');
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      setIsSettingPassword(true);
      await user?.updatePassword({
        newPassword: password,
      });
      router.refresh();
      toast.success('Password updated successfully');
      setShowPasswordForm(false);
    } catch (error) {
      console.error('Error setting password:', error);
      toast.error('Failed to update password');
    } finally {
      setIsSettingPassword(false);
    }
  };

  const connectedAccounts =
    user?.externalAccounts?.filter(
      (account) => account.provider === ('oauth_google' as OAuthProvider),
    ) || [];

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

  const handleRevokeDevice = async (sessionId: string) => {
    try {
      setIsRevokingDevice(true);
      await fetch(`/v1/client/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      await loadSessions();
      toast.success('Device access revoked');
    } catch (error) {
      console.error('Error revoking device:', error);
      toast.error('Failed to revoke device access');
    } finally {
      setIsRevokingDevice(false);
    }
  };

  const handleDisconnectAccount = async (accountId: string) => {
    try {
      setIsDisconnectingAccount(true);
      if (!user) {
        toast.error('User not found');
        return;
      }

      const account = user.externalAccounts.find((acc) => acc.id === accountId);
      if (!account) {
        toast.error('Account not found');
        return;
      }

      // Use the account object to destroy/disconnect it
      await account.destroy();

      // Refresh user data to update the UI
      await user.reload();

      toast.success('Account disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting account', error);
      toast.error('Failed to disconnect account');
    } finally {
      setIsDisconnectingAccount(false);
    }
  };

  const handleConnectAccount = () => {
    try {
      setIsConnectingAccount(true);

      // Use the recommended URL format for connecting OAuth accounts with Clerk
      const redirectUrl = encodeURIComponent(window.location.href);
      window.location.href = `${process.env.NEXT_PUBLIC_CLERK_ACCOUNT_URL}/connections/oauth_google?redirect_url=${redirectUrl}`;
    } catch (error) {
      console.error('Error connecting account', error);
      toast.error('Failed to connect account');
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
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Password is set</span>
              <Button onClick={handleInitiatePasswordSet} disabled={isSettingPassword}>
                {isSettingPassword ? 'Processing...' : 'Change Password'}
              </Button>
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
                    <input
                      id="new-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded border p-2"
                    />
                  </div>
                  <div>
                    <label htmlFor="verification-code" className="mb-1 block text-sm font-medium">
                      Verification Code
                    </label>
                    <input
                      id="verification-code"
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full rounded border p-2"
                    />
                  </div>
                  <Button type="submit" disabled={isSettingPassword}>
                    {isSettingPassword ? 'Setting Password...' : 'Confirm Password'}
                  </Button>
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
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  {device.type === 'desktop' ? (
                    <Laptop className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Last seen: {device.lastSeen}
                      {device.isCurrent && ' (Current device)'}
                    </p>
                  </div>
                </div>
                {!device.isCurrent && (
                  <Button
                    variant="outline"
                    onClick={() => handleRevokeDevice(device.sessionId)}
                    disabled={isRevokingDevice}
                  >
                    {isRevokingDevice ? 'Revoking...' : 'Revoke Access'}
                  </Button>
                )}
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
                  <Mail className="mr-2 h-4 w-4" />
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
                    size="sm"
                    onClick={() => handleDisconnectAccount(account.id)}
                    disabled={isDisconnectingAccount}
                  >
                    <X className="mr-2 h-4 w-4" />
                    {isDisconnectingAccount ? 'Disconnecting...' : 'Disconnect'}
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
