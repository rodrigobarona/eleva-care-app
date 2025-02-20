'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { AppointmentCard } from '@/components/organisms/AppointmentCard';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { Suspense } from 'react';

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

function CustomerDetailsContent() {
  const params = useParams();
  const email = decodeURIComponent(params.email as string);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadCustomerAppointments = async () => {
      try {
        const response = await fetch(`/api/appointments/customer/${email}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        // Sort appointments chronologically
        const sortedAppointments = data.appointments.sort((a: Appointment, b: Appointment) => {
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        });

        setAppointments(sortedAppointments);
      } catch (error) {
        setError('Failed to load customer appointments');
        console.error('Error loading customer appointments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomerAppointments();
  }, [email]);

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/appointments"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Appointments
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Details: {email}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <p className="text-muted-foreground">No appointments found for this customer.</p>
            ) : (
              appointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CustomerDetailsPage() {
  return (
    <Suspense fallback={<div>Loading customer details...</div>}>
      <CustomerDetailsContent />
    </Suspense>
  );
}
