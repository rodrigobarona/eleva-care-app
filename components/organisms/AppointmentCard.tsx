"use client";
import React from "react";
import { format } from "date-fns";
import { Clock, Link as LinkIcon, Mail, User } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";

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

export function AppointmentCard({ appointment }: { appointment: Appointment }) {
  return (
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
            <Link
              href={`/appointments/customer/${encodeURIComponent(appointment.guestEmail)}`}
              className="text-blue-500 hover:underline"
            >
              {appointment.guestEmail}
            </Link>
          </div>
          {appointment.meetingUrl && (
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
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
}
