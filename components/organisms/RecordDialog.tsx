import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/molecules/dialog';
import RecordEditor from '@/components/molecules/RecordEditor';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Clock, FileEdit, Maximize2, Minus, Save } from 'lucide-react';
import React from 'react';
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
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [records, setRecords] = React.useState<PatientRecord[]>([]);
  const [currentContent, setCurrentContent] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [lastSavedContent, setLastSavedContent] = React.useState('');
  const saveTimeoutRef = React.useRef<NodeJS.Timeout>(undefined);

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

  const handleSave = React.useCallback(async () => {
    if (currentContent === lastSavedContent) return;

    try {
      setIsLoading(true);
      const endpoint = `/api/appointments/${meetingId}/records`;
      const method = records.length > 0 ? 'PUT' : 'POST';
      const body = {
        content: currentContent,
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

      setLastSavedContent(currentContent);
      toast.success('Record saved');
      void fetchRecords();
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error('Failed to save record');
    } finally {
      setIsLoading(false);
    }
  }, [currentContent, lastSavedContent, meetingId, records, fetchRecords]);

  // Auto-save when content changes
  React.useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (currentContent !== lastSavedContent) {
      saveTimeoutRef.current = setTimeout(() => {
        void handleSave();
      }, 2000); // Auto-save after 2 seconds of no typing
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentContent, lastSavedContent, handleSave]);

  const hasUnsavedChanges = currentContent !== lastSavedContent;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && isMinimized) {
          setIsMinimized(false);
        }
        setIsOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileEdit className="mr-2 h-4 w-4" />
          Patient Record
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          'border shadow-lg transition-all duration-200',
          isMinimized
            ? '!fixed bottom-4 right-4 !h-[56px] !max-w-[420px] overflow-hidden !rounded-lg'
            : '!fixed bottom-4 right-4 !h-[85vh] !w-[800px] !max-w-[90vw] !rounded-lg',
          '!top-auto !translate-y-0',
        )}
      >
        <DialogHeader className="flex-none border-b bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <FileEdit className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-sm font-semibold text-foreground">
                  {guestName}
                </DialogTitle>
                {!isMinimized && (
                  <DialogDescription className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{guestEmail}</span>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="whitespace-nowrap">
                      {format(appointmentDate, 'MMM d, yyyy')}
                    </span>
                  </DialogDescription>
                )}
              </div>
            </div>

            <div className="flex flex-none items-center gap-2">
              {!isMinimized && (
                <>
                  <div className="flex items-center gap-2">
                    {isLoading ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <div className="h-2 w-2 animate-spin rounded-full border border-primary border-t-transparent" />
                        <span>Saving...</span>
                      </div>
                    ) : hasUnsavedChanges ? (
                      <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        <span>Unsaved</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span>Saved</span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges || isLoading}
                  >
                    <Save className="mr-1 h-3 w-3" />
                    Save
                  </Button>
                </>
              )}

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="text-sm font-medium">×</span>
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        {!isMinimized && (
          <>
            <div className="flex-none border-b bg-muted/30 px-4 py-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {records.length > 0 ? (
                    <>
                      <Clock className="h-3 w-3" />
                      <span>
                        Last modified:{' '}
                        {format(new Date(records[0].lastModifiedAt), 'MMM d, h:mm a')}
                      </span>
                      <span className="text-muted-foreground/60">•</span>
                      <span>Version {records[0].version}</span>
                    </>
                  ) : (
                    <span>Create your first record for this patient</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Auto-save enabled</div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <RecordEditor value={currentContent} onChange={setCurrentContent} readOnly={false} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
