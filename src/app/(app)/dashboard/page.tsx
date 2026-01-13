import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/drizzle/db';
import { ProfilesTable } from '@/drizzle/schema';
import { isUserExpert } from '@/lib/integrations/workos/roles';
import { checkExpertSetupStatus } from '@/server/actions/expert-setup';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { eq } from 'drizzle-orm';
import { CalendarIcon, CheckCircle2, CompassIcon, User, UsersIcon } from 'lucide-react';
import Link from 'next/link';

/**
 * Dashboard - AuthKit Next.js Implementation
 *
 * Uses AuthKit for authentication with database queries for:
 * - Expert status from roles utility
 * - Setup status from ExpertSetupTable
 * - Profile status from ProfilesTable
 */
export default async function HomePage() {
  // Require authentication - auto-redirects if not logged in
  const { user } = await withAuth({ ensureSignedIn: true });

  // Parallel fetch from database for optimal performance
  const [isExpert, profile] = await Promise.all([
    // Check if user has expert role
    isUserExpert(user.id),
    // Get profile publication status (only exists for experts)
    db.query.ProfilesTable.findFirst({
      where: eq(ProfilesTable.workosUserId, user.id),
      columns: {
        published: true,
      },
    }),
  ]);

  // Get expert setup status ONLY if user is an expert
  // This prevents auto-creating expert_setup records for regular patients
  let setupData: {
    setupStatus: {
      profile: boolean;
      availability: boolean;
      events: boolean;
      identity: boolean;
      payment: boolean;
      google_account: boolean;
    };
    isSetupComplete: boolean;
    setupCompletedAt: Date | null;
  } = {
    setupStatus: {
      profile: false,
      availability: false,
      events: false,
      identity: false,
      payment: false,
      google_account: false,
    },
    isSetupComplete: false,
    setupCompletedAt: null,
  };

  if (isExpert) {
    setupData = await checkExpertSetupStatus().catch(() => setupData);
  }

  // Extract first name with fallback
  const firstName = user.firstName || 'there';

  // Setup completion status
  const isSetupCompleted = isExpert ? setupData.isSetupComplete : false;

  // Profile publication status
  const isProfilePublished = profile?.published ?? false;

  return (
    <div className="over container max-w-6xl py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {firstName}!</h1>
          <p className="mt-1 text-muted-foreground">
            We&apos;re excited to have you on the Eleva platform
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/account">
            <User className="mr-2 h-4 w-4" />
            Account
          </Link>
        </Button>
      </div>

      {/* Hero Banner */}
      <div className="relative mb-6 overflow-hidden rounded-xl bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 p-8 text-white">
        <div className="relative z-10 max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold">Eleva - Elevate Your Healthcare Experience</h2>
          <p className="mb-6 text-lg opacity-90">
            Connect with experts, schedule appointments, and manage your healthcare journey all in
            one place.
          </p>
        </div>
        <div className="absolute -bottom-10 right-0 opacity-20">
          <svg
            width="250"
            height="250"
            viewBox="0 0 600 600"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Eleva Logo"
            aria-labelledby="eleva-logo"
          >
            <title id="eleva-logo">Eleva Logo</title>
            <g transform="translate(300,300)">
              <path
                d="M93.9,-97.4C123.9,-74.9,151.8,-44.8,162.5,-7.7C173.2,29.5,166.6,73.7,141.4,102.6C116.2,131.5,72.4,145.2,30.6,152.9C-11.3,160.5,-51.2,162.1,-89.4,147.1C-127.6,132.1,-164.1,100.6,-180.3,60.1C-196.5,19.6,-192.4,-29.7,-171.6,-69.3C-150.8,-108.8,-113.2,-138.5,-76.1,-159.2C-38.9,-179.9,-2.1,-191.6,24.7,-180.9C51.5,-170.2,64,-119.9,93.9,-97.4Z"
                fill="currentColor"
              />
            </g>
          </svg>
        </div>
      </div>

      {isExpert && (
        <>
          {!isSetupCompleted && (
            <div className="mb-6 rounded-xl border bg-card p-6 text-card-foreground shadow-xs">
              <h2 className="mb-4 text-2xl font-bold tracking-tight">Complete Your Expert Setup</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium">Set up your expert profile</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete your profile with expertise, bio, and profile picture to attract
                      clients.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    2
                  </div>
                  <div>
                    <h3 className="font-medium">Configure your availability</h3>
                    <p className="text-sm text-muted-foreground">
                      Set your working hours and connect your Google Calendar for seamless
                      scheduling.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    3
                  </div>
                  <div>
                    <h3 className="font-medium">Set up payments</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your payment account and verify your identity to start receiving
                      payments.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Button asChild>
                  <Link href="/setup">Complete Expert Setup</Link>
                </Button>
              </div>
            </div>
          )}

          {isSetupCompleted && !isProfilePublished && (
            <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-6 shadow-xs">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-blue-100 p-2 text-blue-700">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h2 className="mb-1 text-xl font-semibold text-blue-800">
                    Setup Complete! Ready to launch?
                  </h2>
                  <p className="mb-4 text-blue-700">
                    Your profile setup is complete! Take the final step and publish your profile to
                    start accepting clients.
                  </p>
                  <Button asChild>
                    <Link href="/booking/expert">Publish Your Profile</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  View and manage your upcoming consultations and bookings.
                </p>
                <Button variant="link" asChild className="mt-2 h-auto p-0 text-sm">
                  <Link href="/appointments">View Calendar</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Records & Notes</CardTitle>
                <CompassIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Access and manage consultation records and patient notes.
                </p>
                <Button variant="link" asChild className="mt-2 h-auto p-0 text-sm">
                  <Link href="/appointments/records">View Records</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Patients</CardTitle>
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Manage your patient list and view customer information.
                </p>
                <Button variant="link" asChild className="mt-2 h-auto p-0 text-sm">
                  <Link href="/appointments/patients">View Patients</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
