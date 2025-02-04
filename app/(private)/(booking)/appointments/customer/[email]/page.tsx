"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { AppointmentCard } from "@/components/organisms/AppointmentCard";

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

export default function CustomerDetailsPage() {
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
        const sortedAppointments = data.appointments.sort(
          (a: Appointment, b: Appointment) => {
            return (
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
          }
        );

        setAppointments(sortedAppointments);
      } catch (error) {
        setError("Failed to load customer appointments");
        console.error("Error loading customer appointments:", error);
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
    <div className="container mx-auto p-6">
      <Link
        href="/appointments"
        className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to All Appointments
      </Link>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">Customer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              <strong>Email:</strong> {email}
            </p>
            <p>
              <strong>Total Appointments:</strong> {appointments.length}
            </p>
            {appointments.length > 0 && (
              <p>
                <strong>Customer Name:</strong> {appointments[0].guestName}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold mb-4">Appointment History</h2>
      <div className="space-y-4">
        {appointments.map((appointment) => (
          <AppointmentCard key={appointment.id} appointment={appointment} />
        ))}
      </div>
    </div>
  );
}
