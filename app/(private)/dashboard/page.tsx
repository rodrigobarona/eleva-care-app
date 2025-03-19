import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { UserButton } from '@clerk/nextjs';
import { auth, currentUser } from '@clerk/nextjs/server';
import { ArrowRightIcon, CalendarIcon, CompassIcon, UsersIcon } from 'lucide-react';
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

  return (
    <div className="container max-w-6xl py-10">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {firstName}!</h1>
          <p className="mt-1 text-muted-foreground">
            We&apos;re excited to have you on the Eleva platform
          </p>
        </div>
        <UserButton />
      </div>

      {/* Hero Banner */}
      <div className="relative mb-10 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-8 text-white">
        <div className="relative z-10 max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold">Eleva - Elevate Your Healthcare Experience</h2>
          <p className="mb-6 text-lg opacity-90">
            Connect with experts, schedule appointments, and manage your healthcare journey all in
            one place.
          </p>
          <Button asChild variant="secondary" className="font-medium">
            <Link href="/appointments/events">
              Explore Services <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="absolute -bottom-10 right-0 opacity-20">
          <svg
            width="300"
            height="300"
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expert Consultations</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Connect with verified healthcare professionals and wellness experts.
            </p>
            <Button variant="link" asChild className="mt-2 h-auto p-0 text-sm">
              <Link href="/experts">Find Experts</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              View and manage your scheduled appointments and consultations.
            </p>
            <Button variant="link" asChild className="mt-2 h-auto p-0 text-sm">
              <Link href="/appointments">My Calendar</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Explore Services</CardTitle>
            <CompassIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Discover a range of health and wellness services available on Eleva.
            </p>
            <Button variant="link" asChild className="mt-2 h-auto p-0 text-sm">
              <Link href="/appointments/events">View Services</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">Getting Started with Eleva</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              1
            </div>
            <div>
              <h3 className="font-medium">Complete your profile</h3>
              <p className="text-sm text-muted-foreground">
                Add your details to get personalized recommendations and better service.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              2
            </div>
            <div>
              <h3 className="font-medium">Browse available experts</h3>
              <p className="text-sm text-muted-foreground">
                Explore our network of verified healthcare professionals and specialists.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              3
            </div>
            <div>
              <h3 className="font-medium">Book your first consultation</h3>
              <p className="text-sm text-muted-foreground">
                Schedule an appointment with your chosen expert at a time that works for you.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <Button asChild>
            <Link href="/account">Complete Your Profile</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
