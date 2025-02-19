'use client';

import { useUser } from '@clerk/nextjs';

import { Skeleton } from '@/components/atoms/skeleton';

export default function Dashboard() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="container">
        <Skeleton className="mb-4 h-32 w-full" />
        <Skeleton className="h-24 w-3/4" />
      </div>
    );
  }

  return (
    <main>
      <div className="container">
        <div className="card start-hero">
          <p className="text-body-2 start-hero-intro">Welcome, {user?.firstName}!</p>
          <p className="text-display-2">
            Your authentication is all sorted.
            <br />
            Build the important stuff.
          </p>
        </div>
        <section className="next-steps-section">
          <h2 className="text-heading-1">Next steps for you</h2>
          {/* Add your dashboard content here */}
        </section>
      </div>
    </main>
  );
}
