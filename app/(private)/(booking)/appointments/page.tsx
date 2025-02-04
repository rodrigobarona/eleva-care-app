"use client";

import React from "react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/molecules/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Clock, Link, Mail, User } from "lucide-react";
import { Button } from "@/components/atoms/button";

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

export default function AppointmentsPage() {
  const { user, isLoaded } = useUser();
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadAppointments = React.useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/appointments");
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setAppointments(data.appointments);
    } catch (error) {
      setError("Failed to load appointments");
      console.error("Error loading appointments:", error);
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

  const filterAppointments = (filter: "today" | "future" | "past" | "all") => {
    return appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.startTime);
      appointmentDate.setHours(0, 0, 0, 0);

      switch (filter) {
        case "today":
          return appointmentDate.getTime() === today.getTime();
        case "future":
          return appointmentDate > today;
        case "past":
          return appointmentDate < today;
        default:
          return true;
      }
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "succeeded":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-semibold">
              Meeting with {appointment.guestName}
            </CardTitle>
            <CardDescription>
              {format(new Date(appointment.startTime), "EEEE, MMMM d, yyyy")}
            </CardDescription>
          </div>
          <Badge
            variant={getStatusBadgeVariant(appointment.stripePaymentStatus)}
          >
            {appointment.stripePaymentStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>
              {format(new Date(appointment.startTime), "h:mm a")} -{" "}
              {format(new Date(appointment.endTime), "h:mm a")} (
              {appointment.timezone})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{appointment.guestName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>{appointment.guestEmail}</span>
          </div>
          {appointment.meetingUrl && (
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              <a
                href={appointment.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Join Meeting
              </a>
            </div>
          )}
          {appointment.guestNotes && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Guest Notes:</h4>
              <p className="text-gray-600">{appointment.guestNotes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!isLoaded || isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error: {error}
        <Button
          type="button"
          variant="link"
          onClick={loadAppointments}
          className="ml-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Your Appointments</h1>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="future">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          {filterAppointments("today").map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </TabsContent>

        <TabsContent value="future">
          {filterAppointments("future").map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </TabsContent>

        <TabsContent value="past">
          {filterAppointments("past").map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </TabsContent>

        <TabsContent value="all">
          {filterAppointments("all").map((appointment) => (
            <AppointmentCard key={appointment.id} appointment={appointment} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
