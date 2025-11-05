/**
 * Onboarding Page
 *
 * Initial setup flow for new users after authentication.
 * Redirects to the appropriate setup page based on user type.
 */
import { withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';

export default async function OnboardingPage() {
  // Ensure user is authenticated
  const { user } = await withAuth({ ensureSignedIn: true });

  if (!user) {
    redirect('/sign-in');
  }

  // For now, redirect to dashboard
  // TODO: Add onboarding flow logic here
  redirect('/dashboard');

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Setting up your account...</h1>
        <p className="mt-2 text-gray-600">Please wait</p>
      </div>
    </div>
  );
}
