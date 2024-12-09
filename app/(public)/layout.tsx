import React from "react";
import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <main className="container my-6">{children}</main>;
}
