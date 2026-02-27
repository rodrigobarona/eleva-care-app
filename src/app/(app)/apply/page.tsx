/**
 * Expert Application Page
 *
 * Handles the full lifecycle of expert applications:
 * - New users see the application form
 * - Users with pending applications see a status card
 * - Approved users are redirected to /setup
 * - Rejected users can reapply
 */
import { getMyApplication } from '@/server/actions/expert-applications';
import { isUserExpert } from '@/lib/integrations/workos/roles';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';

import { ApplicationForm } from './application-form';
import { ApplicationStatus } from './application-status';

export const metadata: Metadata = {
  title: 'Become an Expert | Eleva Care',
  description: 'Apply to become a healthcare expert on Eleva Care',
};

export default async function ApplyPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  // If already an expert, redirect to setup/dashboard
  const isExpert = await isUserExpert(user.id);
  if (isExpert) {
    redirect('/setup');
  }

  const application = await getMyApplication();

  // Approved application -- redirect to setup (role should already be assigned)
  if (application?.status === 'approved') {
    redirect('/setup');
  }

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Become an Expert</h1>
        <p className="mt-2 text-muted-foreground">
          Join our network of healthcare professionals and start helping patients on Eleva Care.
        </p>
      </div>

      {application && (application.status === 'pending' || application.status === 'under_review') ? (
        <ApplicationStatus application={application} />
      ) : application?.status === 'rejected' ? (
        <div className="space-y-6">
          <ApplicationStatus application={application} />
          <div>
            <h2 className="text-xl font-semibold">Reapply</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You can update your application and submit it again for review.
            </p>
          </div>
          <ApplicationForm defaultValues={application} />
        </div>
      ) : (
        <ApplicationForm />
      )}
    </div>
  );
}
