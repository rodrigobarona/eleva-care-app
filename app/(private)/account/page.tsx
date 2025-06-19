'use client';

import { AccountForm } from '@/components/organisms/forms/AccountForm';
import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

export default function ProfilePage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return null;
  if (!user) return redirect(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="font-regular font-serif text-3xl tracking-tight text-eleva-primary">
          Profile Settings
        </h1>
        <p className="mt-2 text-sm leading-6 text-eleva-neutral-900/70">
          Manage your account information and preferences to personalize your experience.
        </p>
      </div>

      <AccountForm />
    </div>
  );
}
