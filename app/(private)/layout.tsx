import React from "react";
import { ReactNode } from "react";
import { Leaf } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { NavLink } from "@/components/atoms/NavLink";
import { Toaster } from "@/components/ui/toaster";

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="flex py-2 border-b bg-card">
        <nav className=" font-medium flex items-center text-sm gap-6 container ">
          <div className="flex items-center gap-2 font-bold mr-auto">
            <Leaf className="size-6" />
            <span className="sr-only md:not-sr-only">Eleva Care</span>
          </div>
          <NavLink href="/events">Events</NavLink>
          <NavLink href="/schedule">Schedule</NavLink>
          <NavLink href="/my-account/profile">Profile</NavLink>
          <div className="ml-auto flex flex-row gap-4 items-center ">
            <div className="size-10 flex-1">
              <UserButton
                appearance={{ elements: { userButtonAvatarBox: "size-full" } }}
              />
            </div>
          </div>
        </nav>
      </header>
      <main className="container my-6 mx-auto">{children}</main>
      <Toaster />
    </>
  );
}
