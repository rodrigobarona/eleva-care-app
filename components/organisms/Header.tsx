import React from "react";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default async function Header() {
  return (
    <header>
      <nav className="nav container">
        <h1 className="text-display-3">KindeAuth</h1>
        <div>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
        <div className="profile-blob">
          <SignedOut>
            <SignInButton />
          </SignedOut>
        </div>
      </nav>
    </header>
  );
}
