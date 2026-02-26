/**
 * Team Settings Page
 *
 * Allows team owners to manage team name, subscription, and billing.
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
import { Link } from '@/lib/i18n/navigation';
import { Building2, CreditCard, Settings } from 'lucide-react';

export default async function TeamSettingsPage() {
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

  const teamInfo = await getTeamInfo(teamOrg.id);

  if (!teamInfo) {
    redirect('/team');
  }

  const isOwner = teamOrg.role === 'owner';

  return (
    <div className="container mx-auto space-y-6 py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Team Settings</h1>
        <p className="text-muted-foreground">
          Manage your team configuration and billing.
        </p>
      </div>

      {/* Team Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Team Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Team Name</label>
            <p className="text-lg">{teamInfo.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Team ID</label>
            <p className="font-mono text-sm text-muted-foreground">{teamInfo.id}</p>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>
            Your team subscription plan and billing details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Current Plan:</span>
            {teamInfo.tier ? (
              <Badge variant="secondary" className="capitalize">
                {teamInfo.tier}
              </Badge>
            ) : (
              <Badge variant="outline">No Active Plan</Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Seats:</span>
            <span>
              {teamInfo.seatInfo.currentSeats} /{' '}
              {teamInfo.seatInfo.maxSeats === -1 ? 'Unlimited' : teamInfo.seatInfo.maxSeats}
            </span>
          </div>

          {isOwner && (
            <div className="flex gap-2 pt-2">
              {!teamInfo.tier && (
                <Link href="/team/settings/subscribe">
                  <Button>Subscribe to a Plan</Button>
                </Link>
              )}
              {teamInfo.tier && teamInfo.tier !== 'enterprise' && (
                <Button variant="outline">Upgrade Plan</Button>
              )}
              {teamInfo.stripeCustomerId && (
                <Button variant="outline" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Manage Billing
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone (Owner only) */}
      {isOwner && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Settings className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect your entire team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" disabled>
              Delete Team
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              This action cannot be undone. All team data will be permanently deleted.
              Contact support to delete your team.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
