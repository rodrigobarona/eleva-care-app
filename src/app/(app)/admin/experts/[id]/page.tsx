/**
 * Admin Expert Application Detail Page
 *
 * Shows full application details with approve/reject actions.
 */
import { getExpertApplication } from '@/server/actions/expert-applications';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ApplicationDetail } from './application-detail';

export const metadata: Metadata = {
  title: 'Application Detail | Admin',
  description: 'Review expert application details',
};

export default async function ExpertApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await getExpertApplication(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <ApplicationDetail application={result.data} />
    </div>
  );
}
