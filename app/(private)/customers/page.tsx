'use client';

import { Button } from '@/components/atoms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/atoms/card';
import { Input } from '@/components/atoms/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/molecules/table';
import { useUser } from '@clerk/nextjs';
import { Search, Users } from 'lucide-react';
import React from 'react';

interface Customer {
  id: string;
  name: string;
  email: string;
  appointmentsCount: number;
  totalSpend: number;
  lastAppointment: Date | null;
  stripeCustomerId: string;
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 p-8 text-center">
    <Users className="mb-4 h-12 w-12 text-gray-400" />
    <h3 className="mb-1 text-lg font-medium text-gray-900">No customers yet</h3>
    <p className="text-gray-500">
      When clients book appointments with you, they&apos;ll appear here.
    </p>
  </div>
);

export default function CustomersPage() {
  const { user, isLoaded } = useUser();
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = React.useState<Customer[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const loadCustomers = React.useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/customers');

      if (!response.ok) {
        throw new Error('Failed to load customers');
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setCustomers(data.customers);
      setFilteredCustomers(data.customers);
    } catch (error) {
      console.error('Error loading customers:', error);
      setError('Failed to load customers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (isLoaded && user) {
      loadCustomers();
    }
  }, [isLoaded, user, loadCustomers]);

  React.useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) || customer.email.toLowerCase().includes(query),
    );

    setFilteredCustomers(filtered);
  }, [searchQuery, customers]);

  if (!isLoaded || isLoading) {
    return (
      <div className="container py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Customers</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>Please wait while we load your customer data.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Customers</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadCustomers}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Customers</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Customers</CardTitle>
          <CardDescription>
            Manage and view details about clients who have booked with you.
          </CardDescription>
          <div className="mt-4 flex w-full max-w-sm items-center space-x-2">
            <Input
              type="text"
              placeholder="Search by name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            <Button type="submit" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Appointments</TableHead>
                  <TableHead>Total Spend</TableHead>
                  <TableHead>Last Appointment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.appointmentsCount}</TableCell>
                    <TableCell>€{customer.totalSpend.toFixed(2)}</TableCell>
                    <TableCell>
                      {customer.lastAppointment
                        ? new Date(customer.lastAppointment).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/customers/${customer.id}`}>View Details</a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
