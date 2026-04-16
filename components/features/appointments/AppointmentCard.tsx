'use client';

import { RecordDialog } from '@/components/features/appointments/RecordDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cancelAppointment } from '@/server/actions/meetings';
import { formatInTimeZone } from 'date-fns-tz';
import { Clock, Link as LinkIcon, Loader2, Mail, Phone, User, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  type: 'appointment';
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
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
  expertTimezone?: string; // Expert's configured timezone from their schedule
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

export function AppointmentCard({
  appointment,
  customerId,
  expertTimezone = 'UTC',
}: AppointmentCardProps) {
  const router = useRouter();
  const isReservation = appointment.type === 'reservation';
  const reservation = isReservation ? (appointment as Reservation) : null;

  // Cancel-appointment dialog state. Only shown for confirmed FUTURE
  // appointments that haven't already been refunded.
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const isCancellable =
    !isReservation &&
    appointment.stripePaymentStatus === 'succeeded' &&
    new Date(appointment.startTime).getTime() > Date.now();

  async function handleCancel() {
    if (isReservation) return;
    setIsCancelling(true);
    try {
      const trimmedReason = cancelReason.trim();
      const result = await cancelAppointment(
        appointment.id,
        trimmedReason.length > 0 ? trimmedReason : undefined,
      );
      if (result.success) {
        toast.success(result.message);
        setIsCancelOpen(false);
        setCancelReason('');
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error('[AppointmentCard] cancel failed', err);
      toast.error('Could not cancel the appointment. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  }

  // Calculate time until expiration for reservations
  const [timeUntilExpiration, setTimeUntilExpiration] = useState(() => {
    if (!reservation) return 0;
    return Math.max(
      0,
      Math.floor((reservation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)),
    ); // hours
  });

  // Update time until expiration every minute
  useEffect(() => {
    if (!reservation) return;

    const updateExpiration = () => {
      const hoursRemaining = Math.max(
        0,
        Math.floor((reservation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)),
      );
      setTimeUntilExpiration(hoursRemaining);
    };

    // Update immediately
    updateExpiration();

    // Update every minute
    const interval = setInterval(updateExpiration, 60 * 1000);

    return () => clearInterval(interval);
  }, [reservation]);

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
              {formatInTimeZone(
                new Date(appointment.startTime),
                expertTimezone,
                'EEEE, MMMM d, yyyy',
              )}
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
              {formatInTimeZone(new Date(appointment.startTime), expertTimezone, 'h:mm a')} -{' '}
              {formatInTimeZone(new Date(appointment.endTime), expertTimezone, 'h:mm a')} (
              {expertTimezone})
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
          {!isReservation && appointment.guestPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <a href={`tel:${appointment.guestPhone}`} className="text-blue-500 hover:underline">
                {appointment.guestPhone}
              </a>
            </div>
          )}

          {isReservation && (
            <div className="rounded-md bg-orange-100 p-3 text-sm text-orange-800">
              <p className="font-medium">⚠️ This is a temporary reservation</p>
              <p>
                The guest started a Multibanco payment but hasn&apos;t completed it yet. This slot
                is held until{' '}
                {reservation &&
                  formatInTimeZone(reservation.expiresAt, expertTimezone, 'MMM d, h:mm a')}
                .
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
              <div className="flex flex-wrap items-center gap-2">
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
                {isCancellable && (
                  <AlertDialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <X className="mr-1 h-4 w-4" />
                        Cancel booking
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will issue a full refund to {appointment.guestName} and email
                          them the cancellation notice. The Google Calendar event will be
                          removed and the slot becomes available again. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="grid gap-2 py-2">
                        <Label htmlFor={`cancel-reason-${appointment.id}`}>
                          Reason (optional, shared with the guest)
                        </Label>
                        <Textarea
                          id={`cancel-reason-${appointment.id}`}
                          placeholder="e.g., Personal emergency — I'll reach out to reschedule."
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          maxLength={500}
                          disabled={isCancelling}
                        />
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isCancelling}>
                          Keep appointment
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            // Prevent the dialog from closing immediately so the
                            // user sees the loading state on the button.
                            e.preventDefault();
                            void handleCancel();
                          }}
                          disabled={isCancelling}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isCancelling ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Cancelling…
                            </>
                          ) : (
                            'Cancel and refund'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
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
