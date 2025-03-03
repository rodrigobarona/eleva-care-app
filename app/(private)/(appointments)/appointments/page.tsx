'use client';

import { Button } from '@/components/atoms/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/molecules/tabs';
import { AppointmentCard } from '@/components/organisms/AppointmentCard';
import { useUser } from '@clerk/nextjs';
import { Calendar } from 'lucide-react';
import React from 'react';

interface Appointment {
  id: string;
  guestName: string;
  guestEmail: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  meetingUrl?: string;
  guestNotes?: string;
  stripePaymentStatus: string;
  stripeTransferStatus?: string;
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-8 text-center">
    <Calendar className="mb-4 h-12 w-12 text-gray-400" />
    <h3 className="mb-1 text-lg font-medium text-gray-900">No appointments</h3>
    <p className="text-gray-500">{message}</p>
  </div>
);

export default function AppointmentsPage() {
  const { user, isLoaded } = useUser();
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadAppointments = React.useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/appointments');
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setAppointments(data.appointments);
    } catch (error) {
      setError('Failed to load appointments');
      console.error('Error loading appointments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (isLoaded && user) {
      loadAppointments();
    }
  }, [isLoaded, user, loadAppointments]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filterAppointments = (filter: 'today' | 'future' | 'past' | 'all') => {
    const filtered = appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.startTime);
      appointmentDate.setHours(0, 0, 0, 0);

      switch (filter) {
        case 'today':
          return appointmentDate.getTime() === today.getTime();
        case 'future':
          return appointmentDate > today;
        case 'past':
          return appointmentDate < today;
        default:
          return true;
      }
    });

    // Sort based on the filter type
    return filtered.sort((a, b) => {
      const dateA = new Date(a.startTime);
      const dateB = new Date(b.startTime);

      if (filter === 'future' || filter === 'today') {
        // For upcoming events: nearest date first
        return dateA.getTime() - dateB.getTime();
      }
      // For past events: most recent first
      return dateB.getTime() - dateA.getTime();
    });
  };

  const renderAppointments = (filter: 'today' | 'future' | 'past' | 'all') => {
    const filtered = filterAppointments(filter);

    if (filtered.length === 0) {
      const messages = {
        today: 'You have no appointments scheduled for today.',
        future: 'You have no upcoming appointments scheduled.',
        past: 'You have no past appointments.',
        all: 'You have no appointments yet.',
      };

      return <EmptyState message={messages[filter]} />;
    }

    return filtered.map((appointment) => (
      <AppointmentCard key={appointment.id} appointment={appointment} />
    ));
  };

  if (!isLoaded || isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error: {error}
        <Button type="button" variant="link" onClick={loadAppointments} className="ml-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-3xl font-bold">Your Appointments</h1>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="future">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="today">{renderAppointments('today')}</TabsContent>

        <TabsContent value="future">{renderAppointments('future')}</TabsContent>

        <TabsContent value="past">{renderAppointments('past')}</TabsContent>

        <TabsContent value="all">{renderAppointments('all')}</TabsContent>
      </Tabs>
    </div>
  );
}
