'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { generatePrivateBookingLink } from '@/server/actions/events';
import { format } from 'date-fns';
import { CalendarDays, Clock, Copy, CopyCheck, Loader2, LockOpen } from 'lucide-react';
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
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [time, setTime] = React.useState('10:00');
  const [expiryDays, setExpiryDays] = React.useState('7');
  const [guestEmail, setGuestEmail] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedUrl, setGeneratedUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const timeZone = React.useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const resetState = React.useCallback(() => {
    setDate(undefined);
    setTime('10:00');
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
    if (!date) {
      toast.error('Please choose a date');
      return;
    }
    if (!time) {
      toast.error('Please choose a time');
      return;
    }

    // The time is entered in the expert's local zone; combine the selected
    // calendar day with the time-of-day so the ISO start reflects that slot.
    const [hours, minutes] = time.split(':').map(Number);
    const start = new Date(date);
    start.setHours(hours ?? 0, minutes ?? 0, 0, 0);
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
  }, [date, time, eventId, expiryDays, guestEmail, username]);

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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !date && 'text-muted-foreground',
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {date ? format(date, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(next) => {
                        setDate(next);
                        setGeneratedUrl(null);
                        setCalendarOpen(false);
                      }}
                      disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="private-link-time">Start time</Label>
                <InputGroup>
                  <InputGroupAddon>
                    <Clock className="h-4 w-4" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="private-link-time"
                    type="time"
                    value={time}
                    onChange={(e) => {
                      setTime(e.target.value);
                      setGeneratedUrl(null);
                    }}
                  />
                </InputGroup>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Times are in your timezone: <span className="font-medium">{timeZone}</span>
            </p>
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
              <InputGroup>
                <InputGroupInput
                  id="private-link-url"
                  readOnly
                  value={generatedUrl}
                  className="font-mono text-xs"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton size="icon-xs" aria-label="Copy link" onClick={handleCopy}>
                    {copied ? <CopyCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleGenerate} disabled={isGenerating || !date || !time}>
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {generatedUrl ? 'Regenerate link' : 'Generate link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
