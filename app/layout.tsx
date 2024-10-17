"use client";

import React from "react";
import "./globals.css";
import { KindeProvider } from "@kinde-oss/kinde-auth-nextjs";
import Auth from "./auth";

import { Alexandria, JetBrains_Mono, Lora } from "next/font/google";

const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lora",
});
const alexandria = Alexandria({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-alexandria",
});
const jetBrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <KindeProvider>
      <html lang="en">
        <body
          className={`${lora.variable} ${alexandria.variable} ${jetBrains.variable} min-h-screen bg-background font-sans font-light antialiased`}
        >
          <Auth>{children}</Auth>
        </body>
      </html>
    </KindeProvider>
  );
}
