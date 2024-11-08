import React from "react";
import { LoaderCircle } from "lucide-react";

export function LoadingSpinner() {
  return (
    <div className="flex flex-col gap-4 items-center py-8">
      <div className="text-xl font-medium text-center text-muted-foreground">
        Loading...
      </div>
      <LoaderCircle className="text-muted-foreground size-8 animate-spin" />
    </div>
  );
}
