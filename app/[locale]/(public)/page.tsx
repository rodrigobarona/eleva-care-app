import ExpertsSection from '@/components/organisms/home/ExpertsSection';
import Hero from '@/components/organisms/home/Hero';
import dynamic from 'next/dynamic';

const ServicesSection = dynamic(
  () => import('@/components/organisms/home/Services'),
  { loading: () => null },
);
const ApproachSection = dynamic(
  () => import('@/components/organisms/home/ApproachSection'),
  { loading: () => null },
);

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
