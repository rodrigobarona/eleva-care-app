'use server';

import { PRACTITIONER_AGREEMENT_CONFIG } from '@/config/legal-agreements';
import { db } from '@/drizzle/db';
import { ProfileTable } from '@/drizzle/schema';
import { hasRole } from '@/lib/auth/roles.server';
import { logAuditEvent } from '@/lib/logAuditEvent';
import { getRequestMetadata } from '@/lib/server-utils';
import { checkExpertSetupStatus } from '@/server/actions/expert-setup';
import {
  PRACTITIONER_AGREEMENT_ACCEPTED,
  PROFILE_PUBLISHED,
  PROFILE_UNPUBLISHED,
} from '@/types/audit';
import { auth, currentUser } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Toggles the publication status of an expert profile.
 * When publishing for the first time, verifies that all expert setup steps are complete.
 */
export async function toggleProfilePublication() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return { success: false, message: 'Not authenticated', isPublished: false };
  }

  // Check if user has expert role
  const isExpert = (await hasRole('community_expert')) || (await hasRole('top_expert'));
  if (!isExpert) {
    return { success: false, message: 'Not authorized', isPublished: false };
  }

  try {
    // Get current profile
    const profile = await db.query.ProfileTable.findFirst({
      where: eq(ProfileTable.clerkUserId, userId),
    });

    if (!profile) {
      return { success: false, message: 'Profile not found', isPublished: false };
    }

    // Calculate the target publication status
    const targetPublishedStatus = !profile.published;

    // If trying to publish (not unpublish), check if all steps are complete
    if (targetPublishedStatus === true) {
      // Check if all expert setup steps are complete
      const setupStatus = await checkExpertSetupStatus();

      // Handle different response structures
      const setupSteps = setupStatus.setupStatus || {};
      const allStepsComplete = Object.values(setupSteps).every(Boolean);

      if (!allStepsComplete) {
        // Create list of incomplete steps
        const incompleteSteps = Object.entries(setupSteps)
          .filter(([_, complete]) => !complete)
          .map(([step]) => step);

        return {
          success: false,
          message: 'Cannot publish profile until all setup steps are complete',
          isPublished: false,
          incompleteSteps,
        };
      }
    }
    // If unpublishing, we don't need to check for completion status - allow it regardless

    // Get request metadata for audit logging
    const { ipAddress, userAgent } = await getRequestMetadata();

    // Prepare update data
    const updateData: {
      published: boolean;
      practitionerAgreementAcceptedAt?: Date;
      practitionerAgreementVersion?: string;
      practitionerAgreementIpAddress?: string;
    } = {
      published: targetPublishedStatus,
    };

    // If publishing for the first time, record agreement acceptance
    if (targetPublishedStatus === true && !profile.practitionerAgreementAcceptedAt) {
      updateData.practitionerAgreementAcceptedAt = new Date();
      updateData.practitionerAgreementVersion = PRACTITIONER_AGREEMENT_CONFIG.version;
      updateData.practitionerAgreementIpAddress = ipAddress;
    }

    // Update the published status (and agreement data if first time publishing)
    await db.update(ProfileTable).set(updateData).where(eq(ProfileTable.clerkUserId, userId));

    // Log to audit database
    try {
      if (targetPublishedStatus === true) {
        // Log profile publication
        await logAuditEvent(
          userId,
          PROFILE_PUBLISHED,
          'profile',
          profile.id,
          { published: false },
          {
            published: true,
            publishedAt: new Date().toISOString(),
            expertName: `${user.firstName} ${user.lastName}`,
          },
          ipAddress,
          userAgent,
        );

        // Log agreement acceptance (if first time)
        if (!profile.practitionerAgreementAcceptedAt) {
          await logAuditEvent(
            userId,
            PRACTITIONER_AGREEMENT_ACCEPTED,
            'legal_agreement',
            `expert-agreement-${profile.id}`,
            null,
            {
              agreementType: 'practitioner_agreement',
              version: PRACTITIONER_AGREEMENT_CONFIG.version,
              acceptedAt: new Date().toISOString(),
              documentPath: PRACTITIONER_AGREEMENT_CONFIG.documentPath,
              expertName: `${user.firstName} ${user.lastName}`,
            },
            ipAddress,
            userAgent,
          );
        }
      } else {
        // Log profile unpublication
        await logAuditEvent(
          userId,
          PROFILE_UNPUBLISHED,
          'profile',
          profile.id,
          { published: true },
          {
            published: false,
            unpublishedAt: new Date().toISOString(),
            expertName: `${user.firstName} ${user.lastName}`,
          },
          ipAddress,
          userAgent,
        );
      }
    } catch (auditError) {
      // Log error but don't fail the operation
      console.error('Failed to log audit event for profile publication:', auditError);
    }

    // Revalidate paths where profile data might be displayed
    revalidatePath('/');
    revalidatePath('/experts');
    revalidatePath('/booking/expert/[username]');
    revalidatePath('/account');
    revalidatePath('/booking/expert');

    return {
      success: true,
      message: targetPublishedStatus ? 'Profile published successfully' : 'Profile unpublished',
      isPublished: targetPublishedStatus,
    };
  } catch (error) {
    console.error('Error toggling profile publication:', error);
    return {
      success: false,
      message: 'Failed to update profile publication status',
      isPublished: false,
    };
  }
}
