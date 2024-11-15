import React from "react";
import { Button } from "@/components/atoms/button";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Header from "@/components/organisms/Header";
import Footer from "@/components/organisms/Footer";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default function HomePage() {
  const { userId } = auth();
  if (userId != null) redirect("/events");

  return (
    <>
      <Header />
      <div className="text-center container py-4 mx-auto">
        <h1 className="text-3xl mb-6">Eleva Care</h1>
        <div className="flex gap-2 justify-center">
          <Button asChild>
            <SignedOut>
              <SignInButton />
            </SignedOut>
          </Button>
          <Button asChild>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </Button>
        </div>
      </div>
      <Footer />
    </>
  );
}
