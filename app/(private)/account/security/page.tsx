"use client";
import React, { useState, useCallback } from "react";
import { Button } from "@/components/atoms/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { useUser } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs";
import { toast } from "sonner";
import { Laptop, Mail, Smartphone } from "lucide-react";
import type { SessionWithActivitiesResource } from "@clerk/types";
import { useSession } from "@clerk/nextjs";
import type { OAuthProvider } from "@clerk/types";
import { z } from "zod";
import { Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/molecules/dialog";
import { Input } from "@/components/atoms/input";
import { UserProfile } from "@clerk/nextjs";

const passwordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  code: z.string().min(6, "Verification code must be 6 characters"),
});

export default function SecurityPage() {
  const { user } = useUser();
  const { signIn } = useSignIn();
  const { session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sessions, setSessions] = useState<SessionWithActivitiesResource[]>([]);
  const [currentSession, setCurrentSession] =
    useState<SessionWithActivitiesResource | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    try {
      const sessions = await user.getSessions();
      setSessions(sessions);
      setCurrentSession(sessions.find((s) => s.id === session?.id) || null);
    } catch (error: unknown) {
      toast.error(
        `Failed to load sessions: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }, [user, session]);

  React.useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const devices = sessions
    .filter(
      (session, index, self) =>
        self.findIndex((s) => s.id === session.id) === index
    )
    .map((session) => ({
      id: session.id,
      sessionId: session.id,
      name: `${session.latestActivity?.browserName || "Unknown"} ${session.latestActivity?.deviceType || ""}`,
      type: session.latestActivity?.isMobile ? "mobile" : "desktop",
      lastSeen: new Date(session.lastActiveAt).toLocaleDateString(),
      isCurrent: session.id === currentSession?.id,
    }));

  const handleInitiatePasswordSet = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) {
      toast.error("No email address found");
      return;
    }

    if (!signIn) {
      toast.error("Sign-in service not available");
      return;
    }

    try {
      setIsLoading(true);
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: user.primaryEmailAddress.emailAddress,
      });
      setShowPasswordForm(true);
      toast.success("Verification code sent to your email");
    } catch (error: unknown) {
      toast.error(
        `Failed to send verification code: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = passwordSchema.safeParse({ password, code });
    if (!validation.success) {
      const errors = validation.error.errors;
      toast.error(errors[0].message);
      return;
    }

    try {
      setIsLoading(true);
      const result = await signIn?.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });

      if (result?.status === "complete") {
        toast.success("Password set successfully");
        setShowPasswordForm(false);
        setPassword("");
        setCode("");
      } else {
        toast.error("Failed to set password. Please try again.");
      }
    } catch (error: unknown) {
      toast.error(
        `Failed to set password: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const connectedAccounts =
    user?.externalAccounts
      .filter(
        (account) => account.provider === ("oauth_google" as OAuthProvider)
      )
      .map((account) => ({
        provider: "google",
        email: account.emailAddress,
        connected: true,
      })) || [];

  const copyUserId = () => {
    navigator.clipboard.writeText(user?.id || "");
    toast.success("User ID copied to clipboard");
  };

  async function handleDeleteAccount() {
    setIsLoading(true);
    try {
      await user?.delete();
      toast.success("Account deleted successfully");
      setIsDialogOpen(false);
    } catch (error: unknown) {
      toast.error(
        `Failed to delete account: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  }

  const handleRevokeDevice = async (sessionId: string) => {
    try {
      setIsLoading(true);
      await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });
      // Optionally refresh the page or update the UI
      window.location.reload();
    } catch (error) {
      console.error("Failed to revoke device:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add User Profile Widget at the top */}
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Manage your account settings and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserProfile />
        </CardContent>
      </Card>

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
              <span className="text-sm text-muted-foreground">
                Password is set
              </span>
              <Button onClick={handleInitiatePasswordSet} disabled={isLoading}>
                {isLoading ? "Processing..." : "Change Password"}
              </Button>
            </div>
          ) : (
            <div>
              {!showPasswordForm ? (
                <Button
                  onClick={handleInitiatePasswordSet}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Set Password"}
                </Button>
              ) : (
                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div>
                    <label
                      htmlFor="new-password"
                      className="block text-sm font-medium mb-1"
                    >
                      New Password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="verification-code"
                      className="block text-sm font-medium mb-1"
                    >
                      Verification Code
                    </label>
                    <input
                      id="verification-code"
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Setting Password..." : "Confirm Password"}
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
          <CardDescription>
            Devices that are currently signed in to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  {device.type === "desktop" ? (
                    <Laptop className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Last seen: {device.lastSeen}
                      {device.isCurrent && " (Current device)"}
                    </p>
                  </div>
                </div>
                {!device.isCurrent && (
                  <Button
                    variant="outline"
                    onClick={() => handleRevokeDevice(device.sessionId)}
                    disabled={isLoading}
                  >
                    Revoke Access
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
            {connectedAccounts.map((account) => (
              <div
                key={account.provider}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Google Account</p>
                    <p className="text-sm text-muted-foreground">
                      {account.email}
                    </p>
                  </div>
                </div>
                <Clerk.Connection
                  name="google"
                  asChild
                  options={{
                    accessType: "offline",
                    scope:
                      "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar",
                  }}
                >
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    disabled={isLoading}
                  >
                    <Clerk.Loading scope="provider:google">
                      {(isLoading) =>
                        isLoading ? (
                          <Icons.spinner className="size-4 animate-spin" />
                        ) : (
                          <>
                            <Icons.google className="mr-2 size-4" />
                            {connectedAccounts.length > 0
                              ? "Reconnect Google Account"
                              : "Connect Google Account"}
                          </>
                        )
                      }
                    </Clerk.Loading>
                  </Button>
                </Clerk.Connection>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add User ID section */}
      <Card>
        <CardHeader>
          <CardTitle>Your User ID</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-x-2 bg-muted p-3 rounded-md">
            <code className="text-sm">{user?.id}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyUserId}
              className="ml-auto"
            >
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
          <fieldset className="border-2 border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete your workspace, custom domain, and all
              associated links + their stats. This action cannot be undone -
              please proceed with caution.
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-destructive">
                    Delete Account
                  </DialogTitle>
                  <DialogDescription className="pt-4">
                    <div className="space-y-4">
                      <p className="font-semibold text-foreground">
                        Warning: This will permanently delete your account and
                        all associated data:
                      </p>
                      <ul className="list-disc pl-4 text-sm space-y-2">
                        <li>All your workspaces and settings</li>
                        <li>Custom domains configurations</li>
                        <li>All links and their analytics data</li>
                        <li>Profile information and preferences</li>
                      </ul>
                      <div className="space-y-4 pt-4">
                        <div>
                          <label
                            htmlFor="delete-confirmation"
                            className="text-sm font-medium"
                          >
                            To verify, type &quot;delete my account&quot; below:
                          </label>
                          <Input
                            id="delete-confirmation"
                            className="mt-2"
                            placeholder="delete my account"
                            onChange={(e) => {
                              const isValid =
                                e.target.value === "delete my account";
                              setCanDelete(isValid);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-3 mt-4">
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
                    {isLoading ? "Deleting..." : "Permanently Delete Account"}
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
