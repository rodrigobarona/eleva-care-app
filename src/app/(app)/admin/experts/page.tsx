/**
 * Admin Expert Applications Page
 *
 * Lists all expert applications with status filtering.
 * Admin-only (enforced by admin layout + proxy).
 */
import type { ApplicationStatus } from '@/server/actions/expert-applications';
import {
  getApplicationCounts,
  listExpertApplications,
} from '@/server/actions/expert-applications';
import { Metadata } from 'next';

import { ApplicationsTable } from './applications-table';

export const metadata: Metadata = {
  title: 'Expert Applications | Admin',
  description: 'Review and manage expert applications',
};

export default async function ExpertApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const validStatuses: readonly string[] = ['pending', 'under_review', 'approved', 'rejected'];
  const statusFilter = status && validStatuses.includes(status)
    ? (status as ApplicationStatus)
    : undefined;

  const [applicationsResult, counts] = await Promise.all([
    listExpertApplications(statusFilter),
    getApplicationCounts(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Expert Applications</h1>
        <p className="text-sm text-muted-foreground">
          Review, approve, or reject expert applications.
        </p>
      </div>

      <ApplicationsTable
        applications={applicationsResult.data ?? []}
        counts={counts}
        currentFilter={statusFilter}
      />
    </div>
  );
}
