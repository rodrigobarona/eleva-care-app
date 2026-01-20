import { SecurityPreferencesForm } from '@/components/features/profile/SecurityPreferencesForm';
import { SecureNovuInbox } from '@/components/integrations/novu/SecureNovuInbox';
import { auth } from '@clerk/nextjs/server';

// Force dynamic rendering - auth() makes this route inherently dynamic
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const { userId, redirectToSignIn } = await auth();
  if (userId == null) return redirectToSignIn();

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">My Notifications</h1>
          <p className="text-muted-foreground">
            View and manage your notifications and security settings.
          </p>
        </div>

        {/* Novu Inbox - Full notification list */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-medium">Notification Inbox</h2>
            <p className="text-sm text-muted-foreground">
              View all your notifications including appointments, payments, and system alerts.
            </p>
          </div>
          <SecureNovuInbox className="min-h-[400px] rounded-lg border bg-card" />
        </div>

        {/* Security Preferences Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-medium">Security & Privacy</h2>
            <p className="text-sm text-muted-foreground">
              Control when you receive security notifications and alerts about your account
              activity.
            </p>
          </div>
          <SecurityPreferencesForm />
        </div>
      </div>
    </div>
  );
}
