'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Separator } from '@/components/atoms/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/molecules/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/molecules/tabs';
import { useUser } from '@clerk/nextjs';
import { ArrowLeft, Calendar, CreditCard, User } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React from 'react';

interface CustomerDetails {
  id: string;
  name: string;
  email: string;
  stripeCustomerId: string;
  createdAt: string;
  totalSpend: number;
  appointmentsCount: number;
}

interface Appointment {
  id: string;
  eventName: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  amount: number;
}

interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  status: string;
  description: string;
  paymentMethodLast4?: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = React.useState<CustomerDetails | null>(null);
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [paymentHistory, setPaymentHistory] = React.useState<PaymentHistory[]>([]);

  const customerId = params.id as string;

  const loadCustomerDetails = React.useCallback(async () => {
    if (!user || !customerId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/customers/${customerId}`);

      if (!response.ok) {
        throw new Error('Failed to load customer details');
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setCustomerDetails(data.customer);
      setAppointments(data.appointments || []);
      setPaymentHistory(data.paymentHistory || []);
    } catch (error) {
      console.error('Error loading customer details:', error);
      setError('Failed to load customer details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, customerId]);

  React.useEffect(() => {
    if (isLoaded && user) {
      loadCustomerDetails();
    }
  }, [isLoaded, user, loadCustomerDetails]);

  if (!isLoaded || isLoading) {
    return (
      <div className="container py-10">
        <div className="mb-6 flex items-center">
          <Button variant="ghost" size="sm" className="mr-4" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Customer Details</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>Please wait while we load customer details.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error || !customerDetails) {
    return (
      <div className="container py-10">
        <div className="mb-6 flex items-center">
          <Button variant="ghost" size="sm" className="mr-4" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Customer Details</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error || 'Customer not found'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadCustomerDetails}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="sm" className="mr-4" asChild>
          <Link href="/customers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{customerDetails.name}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>Personal details and statistics</CardDescription>
            </div>
            <User className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="mt-3 space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Full Name</span>
                <p>{customerDetails.name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Email</span>
                <p>{customerDetails.email}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Customer Since</span>
                <p>{new Date(customerDetails.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Stripe Customer ID
                </span>
                <p className="font-mono text-sm">{customerDetails.stripeCustomerId}</p>
              </div>
              <Separator />
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Total Appointments
                </span>
                <p>{customerDetails.appointmentsCount}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Total Spend</span>
                <p className="font-semibold">€{customerDetails.totalSpend.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Customer engagement overview</CardDescription>
            </div>
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium text-muted-foreground">Appointments</div>
                <div className="text-2xl font-bold">{customerDetails.appointmentsCount}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium text-muted-foreground">Total Revenue</div>
                <div className="text-2xl font-bold">€{customerDetails.totalSpend.toFixed(2)}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium text-muted-foreground">Last Session</div>
                <div className="text-md font-semibold">
                  {appointments.length > 0
                    ? new Date(appointments[0].startTime).toLocaleDateString()
                    : 'N/A'}
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium text-muted-foreground">Next Session</div>
                <div className="text-md font-semibold">
                  {appointments.find((a) => new Date(a.startTime) > new Date())
                    ? new Date(
                        appointments.find((a) => new Date(a.startTime) > new Date())?.startTime ||
                          Date.now(),
                      ).toLocaleDateString()
                    : 'None scheduled'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="appointments" className="mt-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="appointments">
            <Calendar className="mr-2 h-4 w-4" />
            Appointments
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="mr-2 h-4 w-4" />
            Payment History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Appointment History</CardTitle>
              <CardDescription>All appointments booked by this customer</CardDescription>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-8 text-center">
                  <Calendar className="mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-1 text-lg font-medium text-gray-900">No appointments yet</h3>
                  <p className="text-gray-500">
                    This customer hasn&apos;t booked any appointments yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium">{appointment.eventName}</TableCell>
                        <TableCell>
                          {new Date(appointment.startTime).toLocaleDateString()}{' '}
                          {new Date(appointment.startTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              appointment.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : appointment.status === 'upcoming'
                                  ? 'bg-blue-100 text-blue-800'
                                  : appointment.status === 'canceled'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {appointment.status.charAt(0).toUpperCase() +
                              appointment.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              appointment.paymentStatus === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : appointment.paymentStatus === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : appointment.paymentStatus === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {appointment.paymentStatus.charAt(0).toUpperCase() +
                              appointment.paymentStatus.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>€{appointment.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All payments made by this customer</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-8 text-center">
                  <CreditCard className="mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-1 text-lg font-medium text-gray-900">No payment history</h3>
                  <p className="text-gray-500">This customer hasn&apos;t made any payments yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{payment.description}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              payment.status === 'succeeded'
                                ? 'bg-green-100 text-green-800'
                                : payment.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : payment.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {payment.paymentMethodLast4
                            ? `•••• ${payment.paymentMethodLast4}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell>€{payment.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
