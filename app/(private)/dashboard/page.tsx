import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { UserNotifications } from '@/components/organisms/dashboard/UserNotifications';
import { ROLE_COMMUNITY_EXPERT, ROLE_TOP_EXPERT } from '@/lib/auth/roles';
import { UserButton } from '@clerk/nextjs';
import { auth, currentUser } from '@clerk/nextjs/server';
import { CalendarIcon, CompassIcon, UsersIcon } from 'lucide-react';
import Link from 'next/link';

export default async function HomePage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    // Handle the case where a user is not authenticated
    return null;
  }

  // Extract first name from user data
  const firstName = user.firstName || 'there';

  // Check if user is an expert
  const userRoles = Array.isArray(user.publicMetadata.role)
    ? user.publicMetadata.role
    : [user.publicMetadata.role];
  const isExpert = userRoles.some(
    (role) => role === ROLE_TOP_EXPERT || role === ROLE_COMMUNITY_EXPERT,
  );

  // Check if expert setup is completed (only for experts)
  const expertSetup = isExpert
    ? (user.unsafeMetadata?.expertSetup as Record<string, boolean> | undefined)
    : undefined;
  const isSetupCompleted = expertSetup && Object.values(expertSetup).every(Boolean);

  return (
    <div className="over container max-w-6xl py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {firstName}!</h1>
          <p className="mt-1 text-muted-foreground">
            We&apos;re excited to have you on the Eleva platform
          </p>
        </div>
        <UserButton />
      </div>

      {/* Hero Banner */}
      <div className="relative mb-6 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-8 text-white">
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

      {/* User Notifications */}
      <UserNotifications />

      {isExpert && (
        <>
          {!isSetupCompleted && (
            <div className="mb-6 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
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
