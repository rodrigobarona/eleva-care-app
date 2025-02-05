"use client";

import React from "react";
import { useUser } from "@clerk/nextjs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/atoms/card";
import { FileText } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { format } from "date-fns";

interface PatientRecord {
  id: string;
  meetingId: string;
  content: string;
  metadata: Record<string, string>;
  createdAt: string;
  version: number;
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-lg">
    <FileText className="h-12 w-12 text-gray-400 mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-1">No records found</h3>
    <p className="text-gray-500">
      Records from your appointments will appear here.
    </p>
  </div>
);

export default function RecordsPage() {
  const { user, isLoaded } = useUser();
  const [records, setRecords] = React.useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadRecords = React.useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/records");
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setRecords(data.records);
    } catch (error) {
      setError("Failed to load records");
      console.error("Error loading records:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (isLoaded && user) {
      loadRecords();
    }
  }, [isLoaded, user, loadRecords]);

  if (!isLoaded || isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error: {error}
        <Button
          type="button"
          variant="link"
          onClick={loadRecords}
          className="ml-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Appointment Records</h1>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Appointment Records</h1>
      <div className="space-y-4">
        {records.map((record) => (
          <Card key={record.id}>
            <CardHeader>
              <CardTitle>Record from Meeting {record.meetingId}</CardTitle>
              <CardDescription>
                Created on {format(new Date(record.createdAt), "PPP p")}
                {record.version > 1 && ` • Version ${record.version}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap">{record.content}</div>
              {record.metadata && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">
                    Additional Information
                  </h4>
                  <pre className="text-sm bg-gray-50 p-2 rounded">
                    {JSON.stringify(record.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
