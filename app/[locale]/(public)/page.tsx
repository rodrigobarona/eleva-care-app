import ApproachSection from '@/components/organisms/home/ApproachSection';
import ExpertsSection from '@/components/organisms/home/ExpertsSection';
import Hero from '@/components/organisms/home/Hero';
import ServicesSection from '@/components/organisms/home/Services';

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
