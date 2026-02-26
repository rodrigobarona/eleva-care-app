'use client';

/**
 * Team Creation Form
 *
 * Client component for creating a new team.
 */
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from '@/lib/i18n/navigation';
import { createTeam } from '@/server/actions/teams';
import { Building2, Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';

export function TeamCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Team name is required');
      return;
    }

    startTransition(async () => {
      const result = await createTeam(name.trim());

      if (result.success) {
        router.push('/team');
        router.refresh();
      } else {
        setError(result.error || 'Failed to create team');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Team Details
        </CardTitle>
        <CardDescription>
          Choose a name for your team. You can change it later in settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              placeholder="e.g., Women's Health Clinic Porto"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              This will be visible to your team members and patients.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending || !name.trim()} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Team...
              </>
            ) : (
              'Create Team'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
