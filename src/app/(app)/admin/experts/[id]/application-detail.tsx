'use client';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/lib/i18n/navigation';
import type { ExpertApplication } from '@/server/actions/expert-applications';
import {
  approveExpertApplication,
  rejectExpertApplication,
} from '@/server/actions/expert-applications';
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface ApplicationDetailProps {
  application: ExpertApplication & { userName?: string; userEmail?: string };
}

export function ApplicationDetail({ application }: ApplicationDetailProps) {
  const router = useRouter();
  const [tier, setTier] = useState<'community' | 'top'>('community');
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const isPending = application.status === 'pending' || application.status === 'under_review';

  async function handleApprove() {
    setIsApproving(true);
    try {
      const result = await approveExpertApplication(application.id, tier, approveNotes || undefined);
      if (result.success) {
        toast.success(`Application approved as ${tier === 'top' ? 'Top Expert' : 'Community Expert'}`);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to approve');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setIsRejecting(true);
    try {
      const result = await rejectExpertApplication(
        application.id,
        rejectReason,
        rejectNotes || undefined,
      );
      if (result.success) {
        toast.success('Application rejected');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to reject');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsRejecting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={'/admin/experts' as any}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {application.userName?.trim() || 'Unknown Applicant'}
          </h1>
          <p className="text-sm text-muted-foreground">{application.userEmail}</p>
        </div>
        <Badge
          variant={
            application.status === 'approved'
              ? 'outline'
              : application.status === 'rejected'
                ? 'destructive'
                : 'secondary'
          }
          className="ml-auto"
        >
          {application.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Application Details</CardTitle>
              <CardDescription>
                Submitted on{' '}
                {new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(
                  new Date(application.createdAt),
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Field label="Area of Expertise" value={application.expertise} />
              <Field label="Professional Credentials" value={application.credentials} />
              <Field label="Professional Experience" value={application.experience} multiline />
              <Field label="Motivation" value={application.motivation} multiline />
              {application.hourlyRate && (
                <Field
                  label="Proposed Hourly Rate"
                  value={`€${application.hourlyRate}`}
                />
              )}
              <div className="flex gap-4">
                {application.website && (
                  <a
                    href={application.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Website <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {application.linkedIn && (
                  <a
                    href={application.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    LinkedIn <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {application.reviewedAt && (
            <Card>
              <CardHeader>
                <CardTitle>Review Decision</CardTitle>
                <CardDescription>
                  Reviewed on{' '}
                  {new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(
                    new Date(application.reviewedAt),
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {application.rejectionReason && (
                  <Field label="Rejection Reason" value={application.rejectionReason} />
                )}
                {application.reviewNotes && (
                  <Field label="Review Notes" value={application.reviewNotes} />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {isPending && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Approve
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Expert Tier</Label>
                  <Select value={tier} onValueChange={(v) => setTier(v as 'community' | 'top')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="community">Community Expert (20% commission)</SelectItem>
                      <SelectItem value="top">Top Expert (15% commission)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Internal notes about the decision..."
                    value={approveNotes}
                    onChange={(e) => setApproveNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" disabled={isApproving}>
                      {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Approve as {tier === 'top' ? 'Top Expert' : 'Community Expert'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Approval</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will assign the <strong>{tier === 'top' ? 'Top Expert' : 'Community Expert'}</strong>{' '}
                        role to {application.userName?.trim() || application.userEmail} and create a
                        €0 invite subscription. They will be able to access the expert setup flow.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleApprove} disabled={isApproving}>
                        {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Approval
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Reject
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Rejection Reason (required)</Label>
                  <Textarea
                    placeholder="This reason will be visible to the applicant..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Internal Notes (optional)</Label>
                  <Textarea
                    placeholder="Internal notes..."
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    rows={2}
                  />
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={isRejecting}>
                      {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Reject Application
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Rejection</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to reject this application? The applicant will be able
                        to see the rejection reason and reapply.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleReject}
                        disabled={isRejecting || !rejectReason.trim()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Rejection
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className={`mt-1 text-sm ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</dd>
    </div>
  );
}
