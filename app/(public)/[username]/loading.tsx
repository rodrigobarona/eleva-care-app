import React from "react";
import { Card } from "@/components/atoms/card";
import { Skeleton } from "@/components/atoms/skeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-12">Book a session</h1>
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <LoadingEventCard key={i} />
        ))}
      </div>
    </div>
  );
}

function LoadingEventCard() {
  return (
    <Card className="overflow-hidden border-2">
      <div className="flex flex-col lg:flex-row">
        <div className="flex-grow p-6 lg:p-8">
          <div className="inline-block w-32 h-7 bg-gray-200 rounded-full mb-4" />
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-20 w-full mb-4" />
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-6 w-32" />
        </div>

        <div className="p-6 lg:p-8 lg:w-72 lg:border-l flex flex-col justify-between bg-gray-50">
          <div>
            <Skeleton className="h-6 w-20 mb-2" />
            <Skeleton className="h-10 w-24 mb-4" />
            <Skeleton className="h-5 w-40 mb-6" />
          </div>
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    </Card>
  );
}
