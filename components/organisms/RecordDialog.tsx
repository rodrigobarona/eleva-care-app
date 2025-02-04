import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/molecules/dialog";
import { Button } from "@/components/atoms/button";
import RecordEditor from "@/components/molecules/RecordEditor";
import { FileEdit, Minus, Maximize2, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [currentContent, setCurrentContent] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [lastSavedContent, setLastSavedContent] = React.useState("");
  const saveTimeoutRef = React.useRef<NodeJS.Timeout>();

  const fetchRecords = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/appointments/${meetingId}/records`);
      if (!response.ok) throw new Error("Failed to fetch records");
      const data = await response.json();
      setRecords(data.records);

      // Set initial content to the latest record or empty
      if (data.records.length > 0) {
        setCurrentContent(data.records[0].content);
        setLastSavedContent(data.records[0].content);
      } else {
        setCurrentContent("");
        setLastSavedContent("");
      }
    } catch (error) {
      console.error("Error fetching records:", error);
      toast.error("Failed to load records");
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
      const method = records.length > 0 ? "PUT" : "POST";
      const body = {
        content: currentContent,
        metadata: {
          lastEditedAt: new Date().toISOString(),
        },
        ...(records.length > 0 && { recordId: records[0].id }),
      };

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to save record");

      setLastSavedContent(currentContent);
      toast.success("Record saved");
      void fetchRecords();
    } catch (error) {
      console.error("Error saving record:", error);
      toast.error("Failed to save record");
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
          <FileEdit className="h-4 w-4 mr-2" />
          Patient Record
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "transition-all duration-200",
          isMinimized
            ? "!absolute bottom-0 right-4 !max-w-[400px] !h-[64px] overflow-hidden"
            : "max-w-4xl h-[80vh]"
        )}
      >
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle>Patient Record</DialogTitle>
            {!isMinimized && (
              <DialogDescription>
                {guestName} ({guestEmail}) - Appointment on{" "}
                {format(appointmentDate, "PPP")}
              </DialogDescription>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {!isMinimized && (
          <div className="flex flex-col h-full gap-4 mt-4">
            <div className="text-sm text-muted-foreground">
              {records.length > 0
                ? `Last modified: ${format(
                    new Date(records[0].lastModifiedAt),
                    "PPp"
                  )} (v${records[0].version})`
                : "No records yet"}
              {isLoading && " • Saving..."}
            </div>

            <div className="flex-1 min-h-0">
              <RecordEditor
                value={currentContent}
                onChange={setCurrentContent}
                readOnly={false}
                autoFocus
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
