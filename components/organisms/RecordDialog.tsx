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
import { FileEdit } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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
  const [isEditing, setIsEditing] = React.useState(false);
  const [records, setRecords] = React.useState<PatientRecord[]>([]);
  const [currentContent, setCurrentContent] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchRecords = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/appointments/${meetingId}/records`);
      if (!response.ok) throw new Error("Failed to fetch records");
      const data = await response.json();
      setRecords(data.records);

      // Set initial content to the latest record or empty
      if (data.records.length > 0) {
        setCurrentContent(data.records[0].content);
      } else {
        setCurrentContent("");
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

  const handleSave = async () => {
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

      toast.success("Record saved successfully");
      setIsEditing(false);
      void fetchRecords();
    } catch (error) {
      console.error("Error saving record:", error);
      toast.error("Failed to save record");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileEdit className="h-4 w-4 mr-2" />
          Patient Record
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Patient Record</DialogTitle>
          <DialogDescription>
            {guestName} ({guestEmail}) - Appointment on{" "}
            {format(appointmentDate, "PPP")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full gap-4 mt-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {records.length > 0
                ? `Last modified: ${format(
                    new Date(records[0].lastModifiedAt),
                    "PPp"
                  )} (v${records[0].version})`
                : "No records yet"}
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save"}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>Edit</Button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <RecordEditor
              value={currentContent}
              onChange={setCurrentContent}
              readOnly={!isEditing}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
