import { LoaderCircle } from 'lucide-react';

export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-muted-foreground text-center text-xl font-medium">Loading...</div>
      <LoaderCircle className="text-muted-foreground size-8 animate-spin" />
    </div>
  );
}
