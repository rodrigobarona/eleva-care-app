import type React from "react";
import "./globals.css";
import type { Metadata } from "next";
import { Alexandria, JetBrains_Mono, Lora } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { LanguageProvider } from "@/components/molecules/LanguageProvider";
import { ThirdPartyScripts } from "@/components/molecules/ThirdPartyScripts";

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
        <ThirdPartyScripts />
        <body
          className={`${lora.variable} ${alexandria.variable} ${jetBrains.variable} min-h-screen bg-background font-sans font-light antialiased`}
        >
          <div
            aria-hidden="true"
            tabIndex={-1}
            className="pointer-events-none absolute left-2 top-2 z-[100]"
          >
            <a
              href="#main"
              className="px-button-px py-button-py rounded-button text-button-size font-button-font font-button-weight tracking-button-tracking focus-visible:outline-state-focus text-button-dark-primary-text bg-button-dark-primary-bg border-button-dark-primary-border ring-button-dark-primary-border hover:text-button-dark-primary-text-hover hover:bg-button-dark-primary-bg-hover hover:border-button-dark-primary-border-hover hover:ring-button-dark-primary-border-hover focus:text-button-dark-primary-text-focus focus:bg-button-dark-primary-bg-focus focus:border-button-dark-primary-border-focus focus:ring-button-dark-primary-border-focus active:text-button-dark-primary-text-active active:bg-button-dark-primary-bg-active active:border-button-dark-primary-border-active active:ring-button-dark-primary-border-active disabled:text-button-dark-primary-text-disabled disabled:bg-button-dark-primary-bg-disabled disabled:border-button-dark-primary-border-disabled disabled:ring-button-dark-primary-border-disabled inline-block max-w-full translate-y-[-200%] self-center overflow-hidden border-2 ring-inset transition-transform duration-300 focus:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none"
              data-component-name="button"
              data-mode="dark"
              target=""
            >
              Skip to Content
            </a>
          </div>
          <NuqsAdapter>
            <LanguageProvider>
              <NuqsAdapter>{children}</NuqsAdapter>
            </LanguageProvider>
          </NuqsAdapter>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
