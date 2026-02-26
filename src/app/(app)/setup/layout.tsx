import { getUserOrganizationType } from '@/lib/integrations/workos/auto-organization';
import { isUserExpert } from '@/lib/integrations/workos/roles';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Expert Setup - Eleva Care',
  description: 'Complete your expert profile setup',
};

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const { user } = await withAuth({ ensureSignedIn: true });

  const hasExpertRole = await isUserExpert(user.id);

  if (!hasExpertRole) {
    // If the user has an expert_individual org but no role,
    // they need to apply first (or wait for approval)
    const orgType = await getUserOrganizationType(user.id);
    if (orgType === 'expert_individual') {
      return redirect('/apply');
    }
    return redirect('/unauthorized');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
    </div>
  );
}
