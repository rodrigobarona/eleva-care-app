/**
 * Team Members Page
 *
 * Uses the WorkOS UsersManagement widget for invite/remove/role management.
 * Adds a seat usage banner on top.
 */
import { getTeamInfo, getTeamWidgetToken, getUserOrganizations } from '@/server/actions/teams';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import { TeamMembersClient } from './TeamMembersClient';

export default async function TeamMembersPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  if (!user) {
    redirect('/login');
  }

  // Find the user's team org
  const orgs = await getUserOrganizations();
  const teamOrg = orgs.find((o) => o.type === 'team');

  if (!teamOrg) {
    redirect('/team');
  }

  // Get team info and widget token in parallel
  const [teamInfo, widgetToken] = await Promise.all([
    getTeamInfo(teamOrg.id),
    getTeamWidgetToken(teamOrg.id),
  ]);

  if (!teamInfo) {
    redirect('/team');
  }

  return (
    <TeamMembersClient
      teamInfo={{
        name: teamInfo.name,
        tier: teamInfo.tier,
        currentSeats: teamInfo.seatInfo.currentSeats,
        maxSeats: teamInfo.seatInfo.maxSeats,
        canInvite: teamInfo.seatInfo.canInvite,
      }}
      widgetToken={widgetToken}
    />
  );
}
