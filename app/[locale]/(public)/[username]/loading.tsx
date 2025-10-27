export default function Loading() {
  return (
    <div className="container max-w-7xl pb-10 pt-32">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[400px_1fr]">
        {/* Left Column - Profile Skeleton */}
        <div className="space-y-6">
          {/* Profile Image Skeleton */}
          <div className="aspect-square w-full animate-pulse rounded-2xl bg-eleva-neutral-200" />

          {/* Profile Info Skeleton */}
          <div className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded bg-eleva-neutral-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-eleva-neutral-200" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-eleva-neutral-200" />
              <div className="h-4 w-full animate-pulse rounded bg-eleva-neutral-200" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-eleva-neutral-200" />
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="flex gap-4">
            <div className="h-16 w-20 animate-pulse rounded-lg bg-eleva-neutral-200" />
            <div className="h-16 w-20 animate-pulse rounded-lg bg-eleva-neutral-200" />
          </div>
        </div>

        {/* Right Column - Events Skeleton */}
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-eleva-neutral-200" />

          {/* Event Cards Skeleton */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4 rounded-xl border border-eleva-neutral-200 p-6">
              <div className="h-6 w-3/4 animate-pulse rounded bg-eleva-neutral-200" />
              <div className="flex gap-4">
                <div className="h-4 w-20 animate-pulse rounded bg-eleva-neutral-200" />
                <div className="h-4 w-24 animate-pulse rounded bg-eleva-neutral-200" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-eleva-neutral-200" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-eleva-neutral-200" />
              </div>
              <div className="h-10 w-full animate-pulse rounded-full bg-eleva-neutral-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
