import { Skeleton } from '@/components/ui/skeleton';

/**
 * Hero section skeleton - matches the Hero component layout
 * Shows a large hero banner with content overlay
 */
export function HeroSkeleton() {
  return (
    <section className="lg:rounded-5xl relative m-2 h-[600px] overflow-hidden rounded-2xl bg-eleva-neutral-200 lg:h-[800px]">
      <div className="absolute inset-0 bg-gradient-to-t from-eleva-neutral-900/60 to-transparent" />
      <div className="relative px-4 lg:px-6">
        <div className="mx-auto flex max-w-2xl flex-col justify-end pt-44 lg:max-w-7xl lg:justify-between lg:pt-72">
          {/* Title skeleton */}
          <div className="space-y-4">
            <Skeleton className="bg-eleva-neutral-300/50 h-16 w-full max-w-4xl lg:h-24" />
            <Skeleton className="bg-eleva-neutral-300/50 h-16 w-3/4 max-w-3xl lg:h-24" />
          </div>

          {/* Subtitle skeleton */}
          <div className="mb-4 mt-8 lg:mb-8 lg:mt-16">
            <Skeleton className="bg-eleva-neutral-300/50 h-6 w-full max-w-lg lg:h-8" />
            <Skeleton className="bg-eleva-neutral-300/50 mt-2 h-6 w-2/3 max-w-md lg:h-8" />
          </div>

          {/* CTA buttons skeleton */}
          <div className="mb-7 flex flex-col justify-between lg:mb-20 lg:flex-row">
            <div className="flex items-center gap-4">
              <Skeleton className="bg-eleva-neutral-300/50 h-14 w-40 rounded-full lg:h-16 lg:w-48" />
              <Skeleton className="bg-eleva-neutral-300/50 h-10 w-32" />
            </div>
            <Skeleton className="bg-eleva-neutral-300/50 mt-5 h-14 w-full rounded-full md:w-48 lg:mt-0" />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Section header skeleton - reusable for Services, Approach, Experts sections
 */
function SectionHeaderSkeleton() {
  return (
    <div className="mb-12">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-2 h-12 w-96 max-w-full" />
      <Skeleton className="mt-6 h-6 w-full max-w-3xl" />
    </div>
  );
}

/**
 * Services section skeleton - matches the Services component with cards grid
 */
export function ServicesSkeleton() {
  return (
    <section className="w-full bg-eleva-neutral-100 px-6 py-12 md:py-24 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-2xl lg:max-w-7xl">
        <SectionHeaderSkeleton />

        {/* Service cards grid */}
        <div className="mt-12 grid gap-2 md:grid-cols-2 md:gap-10 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={`service-${i}`}
              className="overflow-hidden rounded-xl border border-eleva-neutral-200 bg-white"
            >
              {/* Image skeleton */}
              <Skeleton className="aspect-[300:450] h-72 w-full rounded-none" />

              {/* Content skeleton */}
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-48" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
                <Skeleton className="mt-2 h-4 w-4/6" />

                {/* Accordion trigger skeleton */}
                <div className="mt-6">
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Approach section skeleton - matches ApproachSection component
 */
export function ApproachSkeleton() {
  return (
    <section className="w-full bg-white px-6 py-12 md:py-24 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-2xl lg:max-w-7xl">
        <SectionHeaderSkeleton />

        {/* Approach steps grid */}
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`approach-${i}`} className="space-y-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Expert card skeleton - single expert card for carousel
 */
function ExpertCardSkeleton() {
  return (
    <div className="min-w-[85%] pl-6 sm:min-w-[45%] md:min-w-[50%] lg:min-w-[22%]">
      <div className="overflow-visible">
        {/* Image skeleton */}
        <Skeleton className="aspect-[28/38] w-full rounded-xl" />

        {/* Content skeleton */}
        <div className="space-y-2 pt-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-8" />
          </div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </div>
  );
}

/**
 * Experts section skeleton - matches ExpertsSection with carousel
 * This is for the data-fetching section
 */
export function ExpertsSkeleton() {
  return (
    <section className="w-full px-6 pb-24 pt-12 md:py-24 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-2xl lg:max-w-7xl">
        <SectionHeaderSkeleton />

        {/* Carousel skeleton */}
        <div className="mt-10">
          <div className="flex gap-6 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <ExpertCardSkeleton key={`expert-${i}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Complete homepage loading skeleton
 * Used in route-level loading.tsx
 * Combines all section skeletons for instant loading state
 */
export function HomePageLoadingSkeleton() {
  return (
    <div className="bg-eleva-neutral-50 min-h-screen">
      <HeroSkeleton />
      <ServicesSkeleton />
      <ApproachSkeleton />
      <ExpertsSkeleton />
    </div>
  );
}
