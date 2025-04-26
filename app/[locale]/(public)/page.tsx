export default async function HomePage() {
  // Here you can add any logic to decide where to redirect
  // For example, you might redirect authenticated users to dashboard
  // and unauthenticated users to landing page
  // <main>
  // <Hero />
  // <ServicesSection />
  // <ApproachSection />
  // <ExpertsSection />
  // </main>
  // For now, we'll just render the homepage content
  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold">Eleva Care</h1>
      <p className="mt-4 text-xl">Expert care for Pregnancy, Postpartum & Sexual Health</p>
    </div>
  );
}
