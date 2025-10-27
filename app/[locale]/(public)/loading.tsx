export default function Loading() {
  return (
    <div className="bg-eleva-neutral-50 min-h-screen">
      {/* Hero Skeleton */}
      <section className="lg:rounded-5xl relative m-2 h-[600px] animate-pulse overflow-hidden rounded-2xl bg-eleva-neutral-200 lg:h-[800px]" />

      {/* Services Section Skeleton */}
      <section className="w-full px-6 py-12 md:py-16 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <div className="mb-8 h-8 w-48 animate-pulse rounded bg-eleva-neutral-200" />
          <div className="mb-4 h-12 w-96 animate-pulse rounded bg-eleva-neutral-200" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-eleva-neutral-200" />
            ))}
          </div>
        </div>
      </section>

      {/* Experts Section Skeleton */}
      <section className="w-full px-6 py-12 md:py-16 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <div className="mb-8 h-8 w-48 animate-pulse rounded bg-eleva-neutral-200" />
          <div className="mb-4 h-12 w-96 animate-pulse rounded bg-eleva-neutral-200" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-4">
                <div className="aspect-[28/38] animate-pulse rounded-xl bg-eleva-neutral-200" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-eleva-neutral-200" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-eleva-neutral-200" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
