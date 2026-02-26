/**
 * Team Overview Page
 *
 * Shows team name, plan tier, member count / seat limit,
 * and quick actions for team management.
 */
import { getTeamInfo, getUserOrganizations } from '@/server/actions/teams';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Link } from '@/lib/i18n/navigation';
import { Building2, Settings, Users } from 'lucide-react';

export default async function TeamPage() {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });

  if (!user || !organizationId) {
    redirect('/login');
  }

  // Find the user's team org
  const orgs = await getUserOrganizations();
  const teamOrg = orgs.find((o) => o.type === 'team');

  if (!teamOrg) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              No Team Found
            </CardTitle>
            <CardDescription>
              You are not part of any team organization yet.
              Create a team to invite experts and manage them together.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/team/create">
              <Button>Create a Team</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const teamInfo = await getTeamInfo(teamOrg.id);

  if (!teamInfo) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-muted-foreground">Unable to load team information.</p>
      </div>
    );
  }

  const seatPercentage =
    teamInfo.seatInfo.maxSeats === -1
      ? 0
      : Math.round((teamInfo.seatInfo.currentSeats / teamInfo.seatInfo.maxSeats) * 100);

  return (
    <div className="container mx-auto space-y-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{teamInfo.name}</h1>
          <p className="text-muted-foreground">Team Dashboard</p>
        </div>
        {teamInfo.tier && (
          <Badge variant="secondary" className="text-sm capitalize">
            {teamInfo.tier} Plan
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Seat Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamInfo.seatInfo.currentSeats}
              {teamInfo.seatInfo.maxSeats !== -1 && (
                <span className="text-sm font-normal text-muted-foreground">
                  {' '}/ {teamInfo.seatInfo.maxSeats}
                </span>
              )}
            </div>
            {teamInfo.seatInfo.maxSeats !== -1 && (
              <Progress value={seatPercentage} className="mt-2" />
            )}
            {!teamInfo.seatInfo.canInvite && (
              <p className="mt-2 text-xs text-amber-600">
                Seat limit reached. Upgrade your plan to invite more experts.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Plan Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {teamInfo.tier || 'No Plan'}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {teamInfo.tier === 'starter' && 'Up to 3 experts'}
              {teamInfo.tier === 'professional' && 'Up to 10 experts'}
              {teamInfo.tier === 'enterprise' && 'Unlimited experts'}
              {!teamInfo.tier && 'Subscribe to a plan to get started'}
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link href="/team/members">
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" />
                Manage Members
              </Button>
            </Link>
            <Link href="/team/settings">
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <Settings className="h-4 w-4" />
                Team Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
