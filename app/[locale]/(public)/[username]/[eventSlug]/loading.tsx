export default function Loading() {
  return (
    <div className="mx-auto mt-10 flex max-w-5xl flex-col items-center justify-center p-4 md:mt-0 md:h-dvh md:p-6">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-8 shadow-lg">
        {/* Header Skeleton */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-full bg-eleva-neutral-200" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-48 animate-pulse rounded bg-eleva-neutral-200" />
              <div className="h-4 w-32 animate-pulse rounded bg-eleva-neutral-200" />
            </div>
          </div>
          <div className="h-8 w-full animate-pulse rounded bg-eleva-neutral-200" />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Calendar Skeleton */}
          <div className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded bg-eleva-neutral-200" />
            <div className="space-y-2">
              {/* Calendar header */}
              <div className="flex justify-between">
                <div className="h-6 w-24 animate-pulse rounded bg-eleva-neutral-200" />
                <div className="h-6 w-6 animate-pulse rounded bg-eleva-neutral-200" />
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-eleva-neutral-200" />
                ))}
              </div>
            </div>
          </div>

          {/* Time Slots Skeleton */}
          <div className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded bg-eleva-neutral-200" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-eleva-neutral-200" />
              ))}
            </div>
          </div>
        </div>

        {/* Footer Skeleton */}
        <div className="mt-8 space-y-4">
          <div className="h-4 w-full animate-pulse rounded bg-eleva-neutral-200" />
          <div className="h-12 w-full animate-pulse rounded-full bg-eleva-neutral-200" />
        </div>
      </div>
    </div>
  );
}
