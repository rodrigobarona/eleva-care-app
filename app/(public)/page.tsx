import React from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import Hero from "@/components/organisms/home/Hero";
import ServicesSection from "@/components/organisms/home/Services";
import ApproachSection from "@/components/organisms/home/ApproachSection";
import ExpertsSection from "@/components/organisms/home/ExpertsSection";
import Footer from "@/components/organisms/Footer";

export default function HomePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { userId } = auth();
  const showHome = searchParams.home === "true";

  // Only redirect if user is logged in AND home is not explicitly set to true
  if (userId != null && !showHome) {
    redirect("/events");
  }

  return (
    <>
      <main id="main" tabIndex={-1} className="focus-visible:outline-none">
        <Hero />

        <ServicesSection />
        <ApproachSection />
        <ExpertsSection />
      </main>
      <Footer />
    </>
  );
}
