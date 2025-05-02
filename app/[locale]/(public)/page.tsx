import ApproachSection from '@/components/organisms/home/ApproachSection';
import ExpertsSection from '@/components/organisms/home/ExpertsSection';
import Hero from '@/components/organisms/home/Hero';
import ServicesSection from '@/components/organisms/home/Services';

/**
 * Renders the main landing page layout with hero, services, approach, and experts sections.
 */
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
