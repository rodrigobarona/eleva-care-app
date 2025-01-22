"use client";

import React from "react";
import type { ReactNode } from "react";
import Header from "@/components/organisms/Header";
import { translations as en } from "@/public/locales/en";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="relative overflow-hidden">
        <Header
          t={{
            nav: {
              services: en.nav.services,
              approach: en.nav.approach,
              team: en.nav.team,
              podcast: en.nav.podcast,
              newsletter: en.nav.newsletter,
            },
            language: en.language,
          }}
        />
        {children}
      </div>
    </>
  );
}
