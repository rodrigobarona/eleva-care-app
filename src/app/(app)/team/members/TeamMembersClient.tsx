'use client';

/**
 * Team Members Client Component
 *
 * Renders the WorkOS UsersManagement widget with a seat usage banner.
 * The widget handles all invite/remove/role-change UI and API calls.
 */
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
import { Theme } from '@radix-ui/themes';
import { UsersManagement, WorkOsWidgets } from '@workos-inc/widgets';
import { AlertTriangle, ArrowUpCircle, Users } from 'lucide-react';

interface TeamMembersClientProps {
  teamInfo: {
    name: string;
    tier: string | null;
    currentSeats: number;
    maxSeats: number;
    canInvite: boolean;
  };
  widgetToken: string | null;
}

export function TeamMembersClient({ teamInfo, widgetToken }: TeamMembersClientProps) {
  const seatPercentage =
    teamInfo.maxSeats === -1
      ? 0
      : Math.round((teamInfo.currentSeats / teamInfo.maxSeats) * 100);

  const isNearLimit = teamInfo.maxSeats !== -1 && seatPercentage >= 80;
  const isAtLimit = !teamInfo.canInvite;

  return (
    <div className="container mx-auto space-y-6 py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Team Members</h1>
        <p className="text-muted-foreground">
          Manage your team members, invite new experts, and assign roles.
        </p>
      </div>

      {/* Seat Usage Banner */}
      <Card className={isAtLimit ? 'border-amber-500' : isNearLimit ? 'border-amber-300' : ''}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Seat Usage
              {teamInfo.tier && (
                <Badge variant="secondary" className="capitalize">
                  {teamInfo.tier}
                </Badge>
              )}
            </CardTitle>
            {(isNearLimit || isAtLimit) && (
              <Link href="/team/settings">
                <Button variant="outline" size="sm" className="gap-1">
                  <ArrowUpCircle className="h-3.5 w-3.5" />
                  Upgrade Plan
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="mb-1 flex justify-between text-sm">
                <span>
                  {teamInfo.currentSeats} of{' '}
                  {teamInfo.maxSeats === -1 ? 'unlimited' : teamInfo.maxSeats} seats used
                </span>
                {teamInfo.maxSeats !== -1 && (
                  <span className="text-muted-foreground">{seatPercentage}%</span>
                )}
              </div>
              {teamInfo.maxSeats !== -1 && (
                <Progress
                  value={seatPercentage}
                  className={isAtLimit ? '[&>div]:bg-amber-500' : ''}
                />
              )}
            </div>
          </div>
          {isAtLimit && (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Seat limit reached. Upgrade your plan to invite more team members.
            </div>
          )}
        </CardContent>
      </Card>

      {/* WorkOS UsersManagement Widget */}
      {widgetToken ? (
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              Invite new experts, manage roles, and remove members from your team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkOsWidgets>
              <Theme accentColor="blue">
                <UsersManagement authToken={widgetToken} />
              </Theme>
            </WorkOsWidgets>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Unable to load member management. Please try refreshing the page.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
