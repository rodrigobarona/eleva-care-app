'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExpertApplication } from '@/server/actions/expert-applications';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: 'Pending Review',
    variant: 'secondary' as const,
    color: 'text-yellow-600',
    description: 'Your application has been submitted and is waiting for review by our team.',
  },
  under_review: {
    icon: Clock,
    label: 'Under Review',
    variant: 'default' as const,
    color: 'text-blue-600',
    description: 'An administrator is currently reviewing your application.',
  },
  approved: {
    icon: CheckCircle2,
    label: 'Approved',
    variant: 'default' as const,
    color: 'text-green-600',
    description: 'Congratulations! Your application has been approved.',
  },
  rejected: {
    icon: XCircle,
    label: 'Not Approved',
    variant: 'destructive' as const,
    color: 'text-red-600',
    description: 'Unfortunately, your application was not approved at this time.',
  },
};

interface ApplicationStatusProps {
  application: ExpertApplication;
}

export function ApplicationStatus({ application }: ApplicationStatusProps) {
  const config = STATUS_CONFIG[application.status];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon className={`h-6 w-6 ${config.color}`} />
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              Application Status
              <Badge variant={config.variant}>{config.label}</Badge>
            </CardTitle>
            <CardDescription className="mt-1">{config.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">Expertise:</span>{' '}
            {application.expertise}
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Submitted:</span>{' '}
            {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
              new Date(application.createdAt),
            )}
          </div>
          {application.rejectionReason && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <span className="font-medium text-destructive">Reason:</span>{' '}
              {application.rejectionReason}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
