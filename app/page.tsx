import React from "react";
import { Button } from "@/components/ui/button";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function HomePage() {
  return (
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
  );
}
