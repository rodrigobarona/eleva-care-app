'use client';

import { AccountForm } from '@/components/organisms/forms/AccountForm';
import { useUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

export default function ProfilePage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return null;
  if (!user) return redirect(`${process.env.NEXT_PUBLIC_CLERK_UNAUTHORIZED_URL}`);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Profile</h3>
        <p className="text-muted-foreground text-sm">Update your personal information.</p>
      </div>

      <AccountForm />
    </div>
  );
}
