/**
 * Create Team Page
 *
 * Simple form for creating a new team organization.
 */
import { TeamCreateForm } from '@/app/(app)/team/create/TeamCreateForm';
import { redirect } from '@/lib/i18n/navigation';
import { withAuth } from '@workos-inc/authkit-nextjs';

export default async function CreateTeamPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto max-w-lg py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create a Team</h1>
        <p className="text-muted-foreground">
          Create a team to invite other experts and manage them together.
        </p>
      </div>
      <TeamCreateForm />
    </div>
  );
}
