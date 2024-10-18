import React from "react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Button } from "../ui/button";

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
            <Button asChild>
              <SignInButton />
            </Button>{" "}
            <Button asChild>
              <SignUpButton />
            </Button>
          </SignedOut>
        </div>
      </nav>
    </header>
  );
}
