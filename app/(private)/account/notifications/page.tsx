import { SecurityPreferencesForm } from '@/components/features/profile/SecurityPreferencesForm';
import { SecureNovuInbox } from '@/components/integrations/novu/SecureNovuInbox';
import { auth } from '@clerk/nextjs/server';
import { Suspense } from 'react';

// Force dynamic rendering - auth() makes this route inherently dynamic
export const dynamic = 'force-dynamic';

/**
 * NotificationsPage - User notifications and security settings page
 *
 * An async React Server Component that displays the user's notification inbox
 * via Novu integration and security preferences form. Requires authentication.
 *
 * @returns {Promise<JSX.Element>} The rendered notifications page or redirect to sign-in
 *
 * @example
 * ```tsx
 * import NotificationsPage from '@/app/(private)/account/notifications/page';
 *
 * // Used as a Next.js page route - automatically rendered at /account/notifications
 * <NotificationsPage />
 * ```
 */
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
          <Suspense
            fallback={
              <div
                className="min-h-[400px] animate-pulse rounded-lg border bg-card"
                role="status"
                aria-label="Loading notifications"
              >
                <div className="space-y-4 p-4">
                  <div className="h-4 w-1/3 rounded bg-muted" />
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-md bg-muted/50 p-3">
                        <div className="h-10 w-10 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-2/3 rounded bg-muted" />
                          <div className="h-3 w-full rounded bg-muted" />
                          <div className="h-3 w-1/4 rounded bg-muted" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            }
          >
            <SecureNovuInbox className="min-h-[400px] rounded-lg border bg-card" />
          </Suspense>
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
