import RecordEditor from '@/components/features/appointments/RecordEditor';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { type AutoSaveStatus, useAutoSave } from '@/hooks/use-auto-save';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Clock, FileEdit, Save } from 'lucide-react';
import React, { useCallback } from 'react';
import { toast } from 'sonner';

interface PatientRecord {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  lastModifiedAt: string;
  version: number;
}

interface RecordDialogProps {
  meetingId: string;
  guestName: string;
  guestEmail: string;
  appointmentDate: Date;
}

export function RecordDialog({
  meetingId,
  guestName,
  guestEmail,
  appointmentDate,
}: RecordDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [records, setRecords] = React.useState<PatientRecord[]>([]);
  const [currentContent, setCurrentContent] = React.useState('');
  const [lastSavedContent, setLastSavedContent] = React.useState('');

  const fetchRecords = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/appointments/${meetingId}/records`);
      if (!response.ok) throw new Error('Failed to fetch records');
      const data = await response.json();
      setRecords(data.records);

      // Set initial content to the latest record or empty
      if (data.records.length > 0) {
        setCurrentContent(data.records[0].content);
        setLastSavedContent(data.records[0].content);
      } else {
        setCurrentContent('');
        setLastSavedContent('');
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      toast.error('Failed to load records');
    }
  }, [meetingId]);

  React.useEffect(() => {
    if (isOpen) {
      void fetchRecords();
    }
  }, [isOpen, fetchRecords]);

  // Save function for the auto-save hook
  const handleSave = useCallback(
    async (contentToSave: string) => {
      const endpoint = `/api/appointments/${meetingId}/records`;
      const method = records.length > 0 ? 'PUT' : 'POST';
      const body = {
        content: contentToSave,
        metadata: {
          lastEditedAt: new Date().toISOString(),
        },
        ...(records.length > 0 && { recordId: records[0].id }),
      };

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to save record');

      setLastSavedContent(contentToSave);
      void fetchRecords();
    },
    [meetingId, records, fetchRecords],
  );

  // Auto-save hook with debouncing and save-on-unmount
  const { status, hasUnsavedChanges, saveNow } = useAutoSave({
    content: currentContent,
    lastSavedContent,
    onSave: handleSave,
    delay: 2000,
    enabled: isOpen,
  });

  // Show toast only on successful saves (not on every status change)
  const prevStatusRef = React.useRef<AutoSaveStatus>(status);
  React.useEffect(() => {
    if (prevStatusRef.current === 'saving' && status === 'saved') {
      toast.success('Record saved');
    } else if (prevStatusRef.current === 'saving' && status === 'error') {
      toast.error('Failed to save record');
    }
    prevStatusRef.current = status;
  }, [status]);

  const isLoading = status === 'saving';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileEdit className="mr-2 h-4 w-4" />
          Client Record
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          'flex h-[90vh] w-[95vw] max-w-6xl flex-col overflow-hidden p-0',
          'gap-0 border shadow-2xl',
        )}
      >
        {/* Compact Header */}
        <DialogHeader className="flex-none border-b bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center justify-between px-4 py-3 pr-12">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <FileEdit className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-base font-semibold text-foreground">
                  {guestName}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="truncate">{guestEmail}</span>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="whitespace-nowrap">
                    {format(appointmentDate, 'MMM d, yyyy')}
                  </span>
                  {records.length > 0 && (
                    <>
                      <span className="text-muted-foreground/60">•</span>
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(records[0].lastModifiedAt), 'MMM d, h:mm a')}</span>
                      <span className="text-muted-foreground/60">•</span>
                      <span>v{records[0].version}</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>

            <div className="flex flex-none items-center gap-4">
              {/* Save Status */}
              <div className="flex items-center gap-2">
                {status === 'saving' ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-2 w-2 animate-spin rounded-full border border-primary border-t-transparent" />
                    <span>Saving...</span>
                  </div>
                ) : status === 'pending' ? (
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                    <span>Auto-saving...</span>
                  </div>
                ) : status === 'error' ? (
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span>Save failed</span>
                  </div>
                ) : hasUnsavedChanges ? (
                  <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                    <span>Unsaved changes</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>All changes saved</span>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 text-sm"
                onClick={saveNow}
                disabled={!hasUnsavedChanges || isLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Editor Area - Fill remaining space */}
        <div className="flex-1 overflow-hidden">
          <RecordEditor value={currentContent} onChange={setCurrentContent} readOnly={false} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
