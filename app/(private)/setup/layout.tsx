import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Expert Setup - Eleva Care',
  description: 'Complete your expert profile setup',
};

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) {
    return redirect('/sign-in');
  }

  // Get current user to check role
  const user = await currentUser();
  if (!user) return redirect('/sign-in');

  // Check if user has an expert role
  const userRoles = user.publicMetadata?.role;
  let hasExpertRole = false;

  if (Array.isArray(userRoles)) {
    hasExpertRole = userRoles.some((role) => role === 'community_expert' || role === 'top_expert');
  } else if (typeof userRoles === 'string') {
    hasExpertRole = userRoles === 'community_expert' || userRoles === 'top_expert';
  }

  // Only allow experts to access this page
  if (!hasExpertRole) {
    return redirect('/');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
    </div>
  );
}
