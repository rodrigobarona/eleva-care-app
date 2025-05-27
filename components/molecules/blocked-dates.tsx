import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/atoms/popover';
import { Calendar } from '@/components/molecules/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/molecules/dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { formatInTimeZone, toDate } from 'date-fns-tz';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface BlockedDate {
  id: number;
  date: Date;
  reason?: string;
  timezone: string;
}

interface BlockedDatesProps {
  blockedDates: BlockedDate[];
  onAddBlockedDates: (dates: { date: Date; reason?: string }[]) => void;
  onRemoveBlockedDate: (id: number) => void;
}

export function BlockedDates({
  blockedDates,
  onAddBlockedDates,
  onRemoveBlockedDate,
}: BlockedDatesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [note, setNote] = useState('');

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setIsCalendarOpen(false);
  };

  const handleSave = () => {
    if (selectedDate) {
      onAddBlockedDates([{ date: selectedDate, reason: note }]);
      setSelectedDate(undefined);
      setNote('');
      setIsOpen(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-3">
      <div>
        <h3
          id="blocked-dates"
          className="font-serif text-xl font-medium tracking-tight text-eleva-primary"
        >
          Block out dates
        </h3>
        <p className="mt-1 text-sm leading-6 text-eleva-neutral-900/60">
          Add days when you do not want to get bookings.
        </p>
      </div>

      <div className="lg:col-span-2">
        <div className="flex flex-col gap-4">
          {blockedDates.length > 0 ? (
            <div className="divide-y divide-eleva-neutral-200 rounded-lg border border-eleva-neutral-200">
              {blockedDates
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((blocked) => (
                  <div
                    key={blocked.id}
                    className="hover:bg-eleva-neutral-50 flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm">
                        {formatInTimeZone(blocked.date, blocked.timezone, 'MMM dd, yyyy')}
                      </span>
                      {blocked.reason && (
                        <span className="text-sm text-eleva-neutral-900/60">{blocked.reason}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveBlockedDate(blocked.id)}
                      className="text-eleva-neutral-900/60 hover:text-eleva-highlight-red"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-eleva-neutral-900/60">No blocked dates added yet.</p>
          )}

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-fit gap-2">
                <Plus className="size-4" />
                Add blockout date
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Select blockout date</DialogTitle>
                <DialogDescription>
                  Choose a date and add an optional note to block it out from your schedule
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !selectedDate && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {selectedDate ? (
                          <span className="font-mono">{format(selectedDate, 'MMM dd, yyyy')}</span>
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        disabled={(date) =>
                          blockedDates.some((blocked) => {
                            // Convert the calendar date to the blocked date's timezone
                            const calendarDateInTz = toDate(date, { timeZone: blocked.timezone });
                            const blockedDateInTz = toDate(blocked.date, {
                              timeZone: blocked.timezone,
                            });

                            return (
                              formatInTimeZone(calendarDateInTz, blocked.timezone, 'yyyy-MM-dd') ===
                              formatInTimeZone(blockedDateInTz, blocked.timezone, 'yyyy-MM-dd')
                            );
                          })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label>Note (optional)</Label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note for this blocked date..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!selectedDate}>
                  Add date
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
