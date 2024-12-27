import type React from "react";
import "./globals.css";
import type { Metadata } from "next";
import { Alexandria, JetBrains_Mono, Lora } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";

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

export const metadata: Metadata = {
  title: "Expert care for Pregnancy, Postpartum & Sexual Health | Eleva Care",
  description:
    "Eleva Care: Empowering growth, embracing care. Expert care for pregnancy, postpartum, menopause, and sexual health.",
  openGraph: {
    type: "website",
    url: "https://eleva.care",
    siteName: "Eleva Care",
    title: "Expert care for Pregnancy, Postpartum & Sexual Health | Eleva Care",
    description:
      "Eleva Care: Empowering growth, embracing care. Expert care for pregnancy, postpartum, menopause, and sexual health.",
    images: [
      {
        url: "https://eleva.care/img/eleva-care-share.svg",
        width: 1200,
        height: 680,
        alt: "Eleva Care",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${lora.variable} ${alexandria.variable} ${jetBrains.variable} min-h-screen bg-background font-sans font-light antialiased`}
        >
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
