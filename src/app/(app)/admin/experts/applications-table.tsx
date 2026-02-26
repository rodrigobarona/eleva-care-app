'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ApplicationStatus, ExpertApplication } from '@/server/actions/expert-applications';
import { Link } from '@/lib/i18n/navigation';
import { Eye } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

const STATUS_BADGE: Record<ApplicationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  under_review: { label: 'Under Review', variant: 'default' },
  approved: { label: 'Approved', variant: 'outline' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

interface ApplicationsTableProps {
  applications: (ExpertApplication & { userName?: string; userEmail?: string })[];
  counts: {
    pending: number;
    under_review: number;
    approved: number;
    rejected: number;
    total: number;
  };
  currentFilter?: ApplicationStatus;
}

export function ApplicationsTable({ applications, counts, currentFilter }: ApplicationsTableProps) {
  const router = useRouter();

  const filters: { label: string; value: ApplicationStatus | undefined; count: number }[] = [
    { label: 'All', value: undefined, count: counts.total },
    { label: 'Pending', value: 'pending', count: counts.pending },
    { label: 'Under Review', value: 'under_review', count: counts.under_review },
    { label: 'Approved', value: 'approved', count: counts.approved },
    { label: 'Rejected', value: 'rejected', count: counts.rejected },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.label}
            variant={currentFilter === filter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              const params = new URLSearchParams();
              if (filter.value) params.set('status', filter.value);
              router.push(`/admin/experts${params.toString() ? `?${params}` : ''}`);
            }}
          >
            {filter.label}
            <span className="ml-1.5 rounded-full bg-background/20 px-1.5 text-xs">
              {filter.count}
            </span>
          </Button>
        ))}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant</TableHead>
              <TableHead>Expertise</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No applications found.
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => {
                const badge = STATUS_BADGE[app.status];
                return (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{app.userName?.trim() || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{app.userEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{app.expertise}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
                        new Date(app.createdAt),
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/experts/${app.id}` as any}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
