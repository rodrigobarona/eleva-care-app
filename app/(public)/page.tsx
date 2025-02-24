import ApproachSection from '@/components/organisms/home/ApproachSection';
import ExpertsSection from '@/components/organisms/home/ExpertsSection';
import Hero from '@/components/organisms/home/Hero';
import ServicesSection from '@/components/organisms/home/Services';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function HomePage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const { userId } = await auth();
  const showHome = searchParams.home === 'true';

  // Only redirect if user is logged in AND home is not explicitly set to true
  if (userId != null && !showHome) {
    redirect('/events');
  }

  return (
    <>
      <main id="main" tabIndex={-1} className="focus-visible:outline-none">
        <Hero />

        <ServicesSection />
        <ApproachSection />
        <ExpertsSection />
      </main>
    </>
  );
}
