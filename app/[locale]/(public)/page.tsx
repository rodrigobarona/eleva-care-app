import ExpertsSection from '@/components/organisms/home/ExpertsSection';
import Hero from '@/components/organisms/home/Hero';
import dynamic from 'next/dynamic';

// Skeleton loading components for dynamic sections
const SectionSkeleton = () => (
  <div className="container mx-auto my-16">
    <div className="h-12 w-1/3 animate-pulse rounded-lg bg-gray-100" />
    <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {['card-1', 'card-2', 'card-3'].map((id) => (
        <div key={id} className="space-y-4">
          <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  </div>
);

const ServicesSection = dynamic(() => import('@/components/organisms/home/Services'), {
  loading: () => <SectionSkeleton />,
});

const ApproachSection = dynamic(() => import('@/components/organisms/home/ApproachSection'), {
  loading: () => <SectionSkeleton />,
});

export default function HomePage() {
  return (
    <main>
      <Hero />
      <ServicesSection />
      <ApproachSection />
      <ExpertsSection />
    </main>
  );
}
