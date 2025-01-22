import React from "react";

import Footer from "@/components/organisms/Footer";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import Hero from "@/components/organisms/home/Hero";
import ServicesSection from "@/components/organisms/home/Services";
import ApproachSection from "@/components/organisms/home/ApproachSection";

export default function HomePage() {
  const { userId } = auth();
  if (userId != null) redirect("/events");

  return (
    <>
      <main id="main" tabIndex={-1} className="focus-visible:outline-none">
        <Hero />

        <ServicesSection />
        <ApproachSection />
      </main>
      <Footer />
    </>
  );
}
