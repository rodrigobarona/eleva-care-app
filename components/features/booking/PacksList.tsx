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
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { deletePack, updatePackActiveState } from '@/server/actions/packs';
import { Euro, Package, PackagePlus, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { toast } from 'sonner';

type Pack = {
  id: string;
  name: string;
  description: string | null;
  sessionsCount: number;
  price: number;
  isActive: boolean;
  expirationDays: number | null;
  event: {
    name: string;
    slug: string;
  };
};

interface PacksListProps {
  initialPacks: Pack[];
}

export function PacksList({ initialPacks }: PacksListProps) {
  const [packs, setPacks] = React.useState(initialPacks);

  const handleToggleActive = async (packId: string, currentState: boolean) => {
    setPacks((prev) => prev.map((p) => (p.id === packId ? { ...p, isActive: !currentState } : p)));

    const result = await updatePackActiveState(packId, !currentState);
    if (result?.error) {
      setPacks((prev) => prev.map((p) => (p.id === packId ? { ...p, isActive: currentState } : p)));
      toast.error('Failed to update pack');
    } else {
      toast.success(`Pack ${currentState ? 'deactivated' : 'activated'}`);
    }
  };

  const handleDelete = async (packId: string) => {
    const result = await deletePack(packId);
    if (result?.error) {
      toast.error(result.message || 'Failed to delete pack');
    } else {
      setPacks((prev) => prev.filter((p) => p.id !== packId));
      toast.success('Pack deleted');
    }
  };

  return (
    <div className="container space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Session Packs</h1>
          <p className="text-muted-foreground">
            Create bundles of sessions that customers can purchase at a discounted price.
          </p>
        </div>
        <Button asChild>
          <Link href="/booking/packs/new">
            <PackagePlus className="mr-2 h-4 w-4" />
            New Pack
          </Link>
        </Button>
      </div>

      {packs.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {packs.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <Package className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No session packs yet</h3>
          <p className="mb-4 text-muted-foreground">
            Create your first session pack to offer bundled sessions to your customers.
          </p>
          <Button asChild>
            <Link href="/booking/packs/new">
              <PackagePlus className="mr-2 h-4 w-4" />
              New Pack
            </Link>
          </Button>
        </Card>
      )}
    </div>
  );
}

function PackCard({
  pack,
  onToggleActive,
  onDelete,
}: {
  pack: Pack;
  onToggleActive: (packId: string, currentState: boolean) => Promise<void>;
  onDelete: (packId: string) => Promise<void>;
}) {
  return (
    <div
      className={cn('flex items-center gap-4 bg-background p-4', !pack.isActive && 'bg-muted/50')}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Package className="h-5 w-5 text-primary" />
      </div>

      <div className="min-w-0 flex-grow">
        <div className="mb-1 flex items-start justify-between gap-4">
          <div>
            <Link
              href={`/booking/packs/${pack.id}/edit`}
              className="group inline-flex items-center gap-2 hover:text-foreground"
            >
              <h3
                className={cn('truncate font-semibold', !pack.isActive && 'text-muted-foreground')}
              >
                {pack.name}
              </h3>
              <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
            <CardDescription>{pack.event.name}</CardDescription>
            <CardFooter className="mt-2 p-0">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  <Package className="h-3 w-3" />
                  {pack.sessionsCount} sessions
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  <Euro className="h-3 w-3" />
                  {(pack.price / 100).toFixed(2).replace(/\.00$/, '')}
                </span>
                {pack.expirationDays && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    {pack.expirationDays}d validity
                  </span>
                )}
              </span>
            </CardFooter>
          </div>
        </div>
      </div>

      <div className="ml-4 flex items-center gap-4">
        <TooltipProvider>
          <div className="flex items-center gap-2">
            {!pack.isActive && (
              <span className="flex-shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Inactive
              </span>
            )}
            <Switch
              checked={pack.isActive}
              onCheckedChange={() => onToggleActive(pack.id, pack.isActive)}
            />
          </div>

          <div className="flex items-center gap-1 border-l pl-4">
            <div className="inline-flex items-center rounded-md border">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild size="icon" variant="ghost" className="rounded-r-none border-r">
                    <Link href={`/booking/packs/${pack.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit pack</p>
                </TooltipContent>
              </Tooltip>

              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-l-none text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete pack</p>
                  </TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Session Pack</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;{pack.name}&quot;? This action cannot be
                      undone. Existing purchased packs will still work.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(pack.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
