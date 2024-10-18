import React from "react";
import { ReactNode } from "react";
import { Leaf } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { NavLink } from "@/components/atoms/NavLink";

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
          <div className="ml-auto size-10">
            <UserButton
              appearance={{ elements: { userButtonAvatarBox: "size-full" } }}
            />
          </div>
        </nav>
      </header>
      <main className="container my-6 mx-auto">{children}</main>
    </>
  );
}
