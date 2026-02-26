'use server';

import { db } from '@/drizzle/db';
import {
  ExpertApplicationsTable,
  OrganizationsTable,
  RolesTable,
  UserOrgMembershipsTable,
  UsersTable,
} from '@/drizzle/schema';
import { isAdmin } from '@/lib/auth/roles.server';
import type { WorkOSRole } from '@/types/workos-rbac';
import { WORKOS_ROLES } from '@/types/workos-rbac';
import { withAuth } from '@workos-inc/authkit-nextjs';
import * as Sentry from '@sentry/nextjs';
import { and, desc, eq, sql } from 'drizzle-orm';

import { sendEmail } from '@/lib/integrations/novu/email';

import { createInviteSubscription } from './subscriptions';

const { logger } = Sentry;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://eleva.care';

// ============================================================================
// Types
// ============================================================================

export type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

export interface ExpertApplication {
  id: string;
  workosUserId: string;
  expertise: string;
  credentials: string;
  experience: string;
  motivation: string;
  hourlyRate: number | null;
  website: string | null;
  linkedIn: string | null;
  resume: string | null;
  status: ApplicationStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmitApplicationInput {
  expertise: string;
  credentials: string;
  experience: string;
  motivation: string;
  hourlyRate?: number;
  website?: string;
  linkedIn?: string;
}

// ============================================================================
// User-Facing Actions
// ============================================================================

/**
 * Submit an expert application for the current user.
 *
 * Checks that the user doesn't already have a pending/approved application
 * before inserting a new row into ExpertApplicationsTable.
 */
export async function submitExpertApplication(
  input: SubmitApplicationInput,
): Promise<{ success: boolean; applicationId?: string; error?: string }> {
  return Sentry.withServerActionInstrumentation('submitExpertApplication', { recordResponse: true }, async () => {
    try {
      const { user } = await withAuth({ ensureSignedIn: true });

      const existing = await db.query.ExpertApplicationsTable.findFirst({
        where: eq(ExpertApplicationsTable.workosUserId, user.id),
      });

      if (existing) {
        if (existing.status === 'approved') {
          return { success: false, error: 'You are already an approved expert.' };
        }
        if (existing.status === 'pending' || existing.status === 'under_review') {
          return { success: false, error: 'You already have a pending application.' };
        }
        // If rejected, allow resubmission by updating the existing row
        const [updated] = await db
          .update(ExpertApplicationsTable)
          .set({
            expertise: input.expertise,
            credentials: input.credentials,
            experience: input.experience,
            motivation: input.motivation,
            hourlyRate: input.hourlyRate ?? null,
            website: input.website ?? null,
            linkedIn: input.linkedIn ?? null,
            status: 'pending',
            reviewedBy: null,
            reviewedAt: null,
            reviewNotes: null,
            rejectionReason: null,
          })
          .where(eq(ExpertApplicationsTable.id, existing.id))
          .returning({ id: ExpertApplicationsTable.id });

        logger.info(logger.fmt`Expert application resubmitted: ${updated.id}`);
        return { success: true, applicationId: updated.id };
      }

      const [application] = await db
        .insert(ExpertApplicationsTable)
        .values({
          workosUserId: user.id,
          expertise: input.expertise,
          credentials: input.credentials,
          experience: input.experience,
          motivation: input.motivation,
          hourlyRate: input.hourlyRate ?? null,
          website: input.website ?? null,
          linkedIn: input.linkedIn ?? null,
        })
        .returning({ id: ExpertApplicationsTable.id });

      logger.info(logger.fmt`Expert application submitted: ${application.id}`);

      // Send confirmation email to applicant
      sendEmail({
        to: user.email,
        subject: 'Application Received — Eleva Care',
        html: `<p>Hi ${user.firstName || 'there'},</p>
<p>Thank you for applying to become an expert on Eleva Care! We've received your application and our team will review it shortly.</p>
<p>You'll receive an email once a decision has been made.</p>
<p>Best regards,<br/>The Eleva Care Team</p>`,
      }).catch((err) => logger.warn('Failed to send application confirmation email', { err }));

      return { success: true, applicationId: application.id };
    } catch (error) {
      logger.error('Failed to submit expert application', { error });
      Sentry.captureException(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit application',
      };
    }
  });
}

/**
 * Get the current user's expert application (if any).
 */
export async function getMyApplication(): Promise<ExpertApplication | null> {
  const { user } = await withAuth({ ensureSignedIn: true });

  const application = await db.query.ExpertApplicationsTable.findFirst({
    where: eq(ExpertApplicationsTable.workosUserId, user.id),
  });

  return (application as ExpertApplication) ?? null;
}

// ============================================================================
// Admin Actions
// ============================================================================

/**
 * Approve an expert application.
 *
 * This performs the full approval flow:
 * 1. Updates the application status to 'approved'
 * 2. Assigns the WorkOS RBAC role (expert_community or expert_top)
 * 3. Creates a €0 invite subscription via Stripe
 */
export async function approveExpertApplication(
  applicationId: string,
  tier: 'community' | 'top',
  reviewNotes?: string,
): Promise<{ success: boolean; error?: string }> {
  return Sentry.withServerActionInstrumentation('approveExpertApplication', { recordResponse: true }, async () => {
    try {
      const { user: adminUser } = await withAuth({ ensureSignedIn: true });
      const userIsAdmin = await isAdmin();
      if (!userIsAdmin) {
        return { success: false, error: 'Unauthorized: admin role required' };
      }

      const application = await db.query.ExpertApplicationsTable.findFirst({
        where: eq(ExpertApplicationsTable.id, applicationId),
      });

      if (!application) {
        return { success: false, error: 'Application not found' };
      }

      if (application.status === 'approved') {
        return { success: false, error: 'Application is already approved' };
      }

      const targetRole: WorkOSRole =
        tier === 'top' ? WORKOS_ROLES.EXPERT_TOP : WORKOS_ROLES.EXPERT_COMMUNITY;

      // 1. Assign WorkOS RBAC role
      await db.transaction(async (tx) => {
        // Remove existing roles and insert the new expert role
        await tx.delete(RolesTable).where(eq(RolesTable.workosUserId, application.workosUserId));
        await tx.insert(RolesTable).values({
          workosUserId: application.workosUserId,
          role: targetRole,
        });

        // Update user's application role in UsersTable
        await tx
          .update(UsersTable)
          .set({ role: targetRole })
          .where(eq(UsersTable.workosUserId, application.workosUserId));

        // Convert organization type to expert_individual if it isn't already
        const membership = await tx.query.UserOrgMembershipsTable.findFirst({
          where: eq(UserOrgMembershipsTable.workosUserId, application.workosUserId),
        });

        if (membership?.orgId) {
          await tx
            .update(OrganizationsTable)
            .set({ type: 'expert_individual' })
            .where(eq(OrganizationsTable.id, membership.orgId));
        }

        // 2. Update application status
        await tx
          .update(ExpertApplicationsTable)
          .set({
            status: 'approved',
            reviewedBy: adminUser.id,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes ?? null,
          })
          .where(eq(ExpertApplicationsTable.id, applicationId));
      });

      // 3. Create €0 invite subscription (outside transaction -- Stripe call)
      const subResult = await createInviteSubscription(application.workosUserId, tier);
      if (!subResult.success) {
        logger.warn('Invite subscription creation failed (role was still assigned)', {
          applicationId,
          error: subResult.error,
        });
      }

      logger.info(logger.fmt`Expert application approved: ${applicationId} as ${tier}`);

      // Send approval email
      const applicantUser = await db.query.UsersTable.findFirst({
        where: eq(UsersTable.workosUserId, application.workosUserId),
        columns: { email: true, firstName: true },
      });
      if (applicantUser?.email) {
        const tierName = tier === 'top' ? 'Top Expert' : 'Community Expert';
        sendEmail({
          to: applicantUser.email,
          subject: 'Application Approved — Welcome to Eleva Care!',
          html: `<p>Hi ${applicantUser.firstName || 'there'},</p>
<p>Great news! Your application to become an expert on Eleva Care has been approved. You've been assigned the <strong>${tierName}</strong> tier.</p>
<p>You can now complete your expert profile setup:</p>
<p><a href="${APP_URL}/setup">Complete Your Setup →</a></p>
<p>Best regards,<br/>The Eleva Care Team</p>`,
        }).catch((err) => logger.warn('Failed to send approval email', { err }));
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to approve expert application', { error });
      Sentry.captureException(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve application',
      };
    }
  });
}

/**
 * Reject an expert application with a reason.
 */
export async function rejectExpertApplication(
  applicationId: string,
  rejectionReason: string,
  reviewNotes?: string,
): Promise<{ success: boolean; error?: string }> {
  return Sentry.withServerActionInstrumentation('rejectExpertApplication', { recordResponse: true }, async () => {
    try {
      const { user: adminUser } = await withAuth({ ensureSignedIn: true });
      const userIsAdmin = await isAdmin();
      if (!userIsAdmin) {
        return { success: false, error: 'Unauthorized: admin role required' };
      }

      const application = await db.query.ExpertApplicationsTable.findFirst({
        where: eq(ExpertApplicationsTable.id, applicationId),
      });

      if (!application) {
        return { success: false, error: 'Application not found' };
      }

      if (application.status === 'approved') {
        return { success: false, error: 'Cannot reject an already approved application' };
      }

      await db
        .update(ExpertApplicationsTable)
        .set({
          status: 'rejected',
          reviewedBy: adminUser.id,
          reviewedAt: new Date(),
          rejectionReason,
          reviewNotes: reviewNotes ?? null,
        })
        .where(eq(ExpertApplicationsTable.id, applicationId));

      logger.info(logger.fmt`Expert application rejected: ${applicationId}`);

      // Send rejection email
      const applicantUser = await db.query.UsersTable.findFirst({
        where: eq(UsersTable.workosUserId, application.workosUserId),
        columns: { email: true, firstName: true },
      });
      if (applicantUser?.email) {
        sendEmail({
          to: applicantUser.email,
          subject: 'Application Update — Eleva Care',
          html: `<p>Hi ${applicantUser.firstName || 'there'},</p>
<p>Thank you for your interest in becoming an expert on Eleva Care. After careful review, we're unable to approve your application at this time.</p>
<p><strong>Reason:</strong> ${rejectionReason}</p>
<p>You're welcome to update your application and reapply:</p>
<p><a href="${APP_URL}/apply">Update Your Application →</a></p>
<p>Best regards,<br/>The Eleva Care Team</p>`,
        }).catch((err) => logger.warn('Failed to send rejection email', { err }));
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to reject expert application', { error });
      Sentry.captureException(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject application',
      };
    }
  });
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * List expert applications with optional status filter.
 * Admin-only.
 */
export async function listExpertApplications(
  status?: ApplicationStatus,
  limit = 50,
): Promise<{ success: boolean; data?: (ExpertApplication & { userName?: string; userEmail?: string })[]; error?: string }> {
  try {
    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const conditions = status
      ? and(eq(ExpertApplicationsTable.status, status))
      : undefined;

    const applications = await db
      .select({
        id: ExpertApplicationsTable.id,
        workosUserId: ExpertApplicationsTable.workosUserId,
        expertise: ExpertApplicationsTable.expertise,
        credentials: ExpertApplicationsTable.credentials,
        experience: ExpertApplicationsTable.experience,
        motivation: ExpertApplicationsTable.motivation,
        hourlyRate: ExpertApplicationsTable.hourlyRate,
        website: ExpertApplicationsTable.website,
        linkedIn: ExpertApplicationsTable.linkedIn,
        resume: ExpertApplicationsTable.resume,
        status: ExpertApplicationsTable.status,
        reviewedBy: ExpertApplicationsTable.reviewedBy,
        reviewedAt: ExpertApplicationsTable.reviewedAt,
        reviewNotes: ExpertApplicationsTable.reviewNotes,
        rejectionReason: ExpertApplicationsTable.rejectionReason,
        createdAt: ExpertApplicationsTable.createdAt,
        updatedAt: ExpertApplicationsTable.updatedAt,
        userName: sql<string>`concat(${UsersTable.firstName}, ' ', ${UsersTable.lastName})`.as('user_name'),
        userEmail: UsersTable.email,
      })
      .from(ExpertApplicationsTable)
      .leftJoin(UsersTable, eq(ExpertApplicationsTable.workosUserId, UsersTable.workosUserId))
      .where(conditions)
      .orderBy(desc(ExpertApplicationsTable.createdAt))
      .limit(limit);

    return { success: true, data: applications as any };
  } catch (error) {
    logger.error('Failed to list expert applications', { error });
    return { success: false, error: 'Failed to load applications' };
  }
}

/**
 * Get a single expert application by ID.
 * Admin-only.
 */
export async function getExpertApplication(
  applicationId: string,
): Promise<{ success: boolean; data?: ExpertApplication & { userName?: string; userEmail?: string }; error?: string }> {
  try {
    const userIsAdmin = await isAdmin();
    if (!userIsAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const [application] = await db
      .select({
        id: ExpertApplicationsTable.id,
        workosUserId: ExpertApplicationsTable.workosUserId,
        expertise: ExpertApplicationsTable.expertise,
        credentials: ExpertApplicationsTable.credentials,
        experience: ExpertApplicationsTable.experience,
        motivation: ExpertApplicationsTable.motivation,
        hourlyRate: ExpertApplicationsTable.hourlyRate,
        website: ExpertApplicationsTable.website,
        linkedIn: ExpertApplicationsTable.linkedIn,
        resume: ExpertApplicationsTable.resume,
        status: ExpertApplicationsTable.status,
        reviewedBy: ExpertApplicationsTable.reviewedBy,
        reviewedAt: ExpertApplicationsTable.reviewedAt,
        reviewNotes: ExpertApplicationsTable.reviewNotes,
        rejectionReason: ExpertApplicationsTable.rejectionReason,
        createdAt: ExpertApplicationsTable.createdAt,
        updatedAt: ExpertApplicationsTable.updatedAt,
        userName: sql<string>`concat(${UsersTable.firstName}, ' ', ${UsersTable.lastName})`.as('user_name'),
        userEmail: UsersTable.email,
      })
      .from(ExpertApplicationsTable)
      .leftJoin(UsersTable, eq(ExpertApplicationsTable.workosUserId, UsersTable.workosUserId))
      .where(eq(ExpertApplicationsTable.id, applicationId))
      .limit(1);

    if (!application) {
      return { success: false, error: 'Application not found' };
    }

    return { success: true, data: application as any };
  } catch (error) {
    logger.error('Failed to get expert application', { error });
    return { success: false, error: 'Failed to load application' };
  }
}

/**
 * Get application counts by status. Admin-only.
 */
export async function getApplicationCounts(): Promise<{
  pending: number;
  under_review: number;
  approved: number;
  rejected: number;
  total: number;
}> {
  const userIsAdmin = await isAdmin();
  if (!userIsAdmin) {
    return { pending: 0, under_review: 0, approved: 0, rejected: 0, total: 0 };
  }

  const counts = await db
    .select({
      status: ExpertApplicationsTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(ExpertApplicationsTable)
    .groupBy(ExpertApplicationsTable.status);

  const result = { pending: 0, under_review: 0, approved: 0, rejected: 0, total: 0 };
  for (const row of counts) {
    const status = row.status as ApplicationStatus;
    result[status] = row.count;
    result.total += row.count;
  }

  return result;
}
