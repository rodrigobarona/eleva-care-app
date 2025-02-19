'use client';

import { redirect } from 'next/navigation';

import { useUser } from '@clerk/nextjs';

import { AccountForm } from '@/components/organisms/forms/AccountForm';

export default function ProfilePage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return null;
  if (!user) return redirect('/sign-in');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-sm text-muted-foreground">Update your personal information.</p>
      </div>

      <AccountForm />
    </div>
  );
}
