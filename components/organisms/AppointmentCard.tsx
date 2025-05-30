'use client';

import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { RecordDialog } from '@/components/organisms/RecordDialog';
import { format } from 'date-fns';
import { Clock, Link as LinkIcon, Mail, User } from 'lucide-react';
import Link from 'next/link';

interface Appointment {
  id: string;
  type: 'appointment';
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

interface Reservation {
  id: string;
  type: 'reservation';
  guestName: string;
  guestEmail: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  expiresAt: Date;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  eventId: string;
}

type AppointmentOrReservation = Appointment | Reservation;

interface AppointmentCardProps {
  appointment: AppointmentOrReservation;
  customerId?: string; // Optional secure customer ID for patient link
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'succeeded':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
};

export function AppointmentCard({ appointment, customerId }: AppointmentCardProps) {
  const isReservation = appointment.type === 'reservation';
  const reservation = isReservation ? (appointment as Reservation) : null;

  // Calculate time until expiration for reservations
  const timeUntilExpiration = reservation
    ? Math.max(0, Math.floor((reservation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60))) // hours
    : 0;

  const isExpiringSoon = timeUntilExpiration <= 2; // Less than 2 hours

  return (
    <Card className={`mb-4 ${isReservation ? 'border-orange-200 bg-orange-50/50' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle
              className={`text-xl font-semibold ${isReservation ? 'text-orange-900' : ''}`}
            >
              {isReservation ? (
                <div className="flex items-center gap-2">
                  <span>⏳ Pending Reservation</span>
                  {isExpiringSoon && <span className="text-sm text-red-600">(Expiring Soon)</span>}
                </div>
              ) : (
                `Meeting with ${appointment.guestName}`
              )}
            </CardTitle>
            <CardDescription>
              {format(new Date(appointment.startTime), 'EEEE, MMMM d, yyyy')}
              {isReservation && (
                <span className="ml-2 text-orange-600">• Expires in {timeUntilExpiration}h</span>
              )}
            </CardDescription>
          </div>
          {isReservation ? (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              Awaiting Payment
            </Badge>
          ) : (
            <Badge variant={getStatusBadgeVariant(appointment.stripePaymentStatus)}>
              {appointment.stripePaymentStatus}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>
              {format(new Date(appointment.startTime), 'h:mm a')} -{' '}
              {format(new Date(appointment.endTime), 'h:mm a')} ({appointment.timezone})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{appointment.guestName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            {customerId ? (
              <Link
                href={`/appointments/patients/${customerId}`}
                className="text-blue-500 hover:underline"
              >
                {appointment.guestEmail}
              </Link>
            ) : (
              <span className="text-gray-600">{appointment.guestEmail}</span>
            )}
          </div>

          {isReservation && (
            <div className="rounded-md bg-orange-100 p-3 text-sm text-orange-800">
              <p className="font-medium">⚠️ This is a temporary reservation</p>
              <p>
                The guest started a Multibanco payment but hasn&apos;t completed it yet. This slot
                is held until {reservation && format(reservation.expiresAt, 'MMM d, h:mm a')}.
              </p>
              {isExpiringSoon && (
                <p className="mt-1 font-medium text-red-700">
                  ⚡ Expires in {timeUntilExpiration} hours - slot will become available again
                </p>
              )}
            </div>
          )}

          {!isReservation && appointment.meetingUrl && (
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={appointment.meetingUrl} target="_blank" rel="noopener noreferrer">
                    Join Meeting
                  </Link>
                </Button>
                <RecordDialog
                  meetingId={appointment.id}
                  guestName={appointment.guestName}
                  guestEmail={appointment.guestEmail}
                  appointmentDate={appointment.startTime}
                />
              </div>
            </div>
          )}
          {!isReservation && appointment.guestNotes && (
            <div className="mt-4">
              <h4 className="mb-2 font-medium">Guest Notes:</h4>
              <p className="text-gray-600">{appointment.guestNotes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
