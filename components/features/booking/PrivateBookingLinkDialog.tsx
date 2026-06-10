'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { generatePrivateBookingLink } from '@/server/actions/events';
import { CopyCheck, Link as LinkIcon, Loader2, LockOpen } from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';

interface PrivateBookingLinkDialogProps {
  eventId: string;
  eventName: string;
  username: string;
}

/**
 * Lets an expert generate a private booking link for a specific date/time of
 * one of their events. The chosen slot can be outside their normal
 * availability; the customer who opens the link can book exactly that slot.
 */
export function PrivateBookingLinkDialog({
  eventId,
  eventName,
  username,
}: PrivateBookingLinkDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [dateTime, setDateTime] = React.useState('');
  const [expiryDays, setExpiryDays] = React.useState('7');
  const [guestEmail, setGuestEmail] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedUrl, setGeneratedUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const resetState = React.useCallback(() => {
    setDateTime('');
    setExpiryDays('7');
    setGuestEmail('');
    setGeneratedUrl(null);
    setCopied(false);
    setIsGenerating(false);
  }, []);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) resetState();
    },
    [resetState],
  );

  const handleGenerate = React.useCallback(async () => {
    if (!dateTime) {
      toast.error('Please choose a date and time');
      return;
    }

    // datetime-local has no timezone; interpret it in the expert's local zone.
    const start = new Date(dateTime);
    if (Number.isNaN(start.getTime())) {
      toast.error('Invalid date and time');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generatePrivateBookingLink({
        eventId,
        username,
        startTime: start.toISOString(),
        expiryDays: Number(expiryDays) || 7,
        guestEmail: guestEmail.trim() || undefined,
      });

      if (result.error || !result.url) {
        toast.error(result.message || 'Failed to generate link');
        return;
      }

      setGeneratedUrl(result.url);
    } catch (error) {
      console.error('Failed to generate private booking link:', error);
      toast.error('Failed to generate link');
    } finally {
      setIsGenerating(false);
    }
  }, [dateTime, eventId, expiryDays, guestEmail, username]);

  const handleCopy = React.useCallback(() => {
    if (!generatedUrl) return;
    navigator.clipboard
      .writeText(generatedUrl)
      .then(() => {
        setCopied(true);
        toast.success('Link copied');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error('Failed to copy'));
  }, [generatedUrl]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost" className="rounded-none border-r">
              <LockOpen className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Private booking link</p>
        </TooltipContent>
      </Tooltip>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Private booking link</DialogTitle>
          <DialogDescription>
            Pick an exact date and time for <span className="font-medium">{eventName}</span>. Anyone
            with the link can book that specific slot, even if it&apos;s outside your normal
            availability.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="private-link-datetime">Date and time</Label>
            <Input
              id="private-link-datetime"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => {
                setDateTime(e.target.value);
                setGeneratedUrl(null);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="private-link-expiry">Link expires in (days)</Label>
              <Input
                id="private-link-expiry"
                type="number"
                min={1}
                max={90}
                value={expiryDays}
                onChange={(e) => {
                  setExpiryDays(e.target.value);
                  setGeneratedUrl(null);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="private-link-email">Lock to email (optional)</Label>
              <Input
                id="private-link-email"
                type="email"
                placeholder="guest@example.com"
                value={guestEmail}
                onChange={(e) => {
                  setGuestEmail(e.target.value);
                  setGeneratedUrl(null);
                }}
              />
            </div>
          </div>

          {generatedUrl && (
            <div className="space-y-2">
              <Label htmlFor="private-link-url">Shareable link</Label>
              <div className="flex gap-2">
                <Input
                  id="private-link-url"
                  readOnly
                  value={generatedUrl}
                  className="font-mono text-xs"
                />
                <Button type="button" size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? <CopyCheck className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleGenerate} disabled={isGenerating || !dateTime}>
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {generatedUrl ? 'Regenerate link' : 'Generate link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
