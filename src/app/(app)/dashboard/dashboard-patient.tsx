'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/lib/i18n/navigation';
import type { DashboardMeeting, PatientStats } from '@/server/actions/dashboard';
import { ArrowRight, Calendar, CalendarCheck, Stethoscope, Users } from 'lucide-react';
import { QuickActions } from './components/quick-actions';
import { RecentSessions } from './components/recent-sessions';
import { StatCard } from './components/stat-card';
import { UpcomingAppointments } from './components/upcoming-appointments';

interface PatientDashboardProps {
  firstName: string;
  stats: PatientStats;
  upcomingMeetings: DashboardMeeting[];
  recentMeetings: DashboardMeeting[];
}

function formatNextAppointment(nextAppointment: PatientStats['nextAppointment']) {
  if (!nextAppointment) return 'None scheduled';
  const date = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(nextAppointment.startTime));
  return `${date} — ${nextAppointment.expertName}`;
}

export function PatientDashboard({
  firstName,
  stats,
  upcomingMeetings,
  recentMeetings,
}: PatientDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {firstName}!</h1>
        <p className="mt-1 text-muted-foreground">Your health journey at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Upcoming Sessions"
          value={stats.upcomingSessions}
          icon={Calendar}
        />
        <StatCard
          label="Total Bookings"
          value={stats.totalBookings}
          icon={CalendarCheck}
        />
        <StatCard
          label="Experts Seen"
          value={stats.uniqueExperts}
          icon={Stethoscope}
        />
        <StatCard
          label="Next Appointment"
          value={stats.nextAppointment ? '' : '—'}
          icon={Users}
          description={formatNextAppointment(stats.nextAppointment)}
        />
      </div>

      <UpcomingAppointments meetings={upcomingMeetings} role="patient" />

      <QuickActions role="patient" />

      <RecentSessions meetings={recentMeetings} role="patient" />

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Are you a healthcare professional?</CardTitle>
          <CardDescription>
            Join our expert network and start helping patients on Eleva Care.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={'/apply' as any}>
              Become an Expert
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
