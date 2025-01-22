"use client";

import React from "react";
import type { ReactNode } from "react";
import Header from "@/components/organisms/Header";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="relative overflow-hidden">
        <Header />
        {children}
      </div>
    </>
  );
}
