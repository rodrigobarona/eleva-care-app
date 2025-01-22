"use client";

import type React from "react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import FadeInSection from "@/components/atoms/FadeInSection";
import { Card, CardContent } from "@/components/atoms/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/molecules/accordion";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/molecules/LanguageProvider";
import { translations as en } from "@/public/locales/en";
import { translations as pt } from "@/public/locales/pt";
import { translations as br } from "@/public/locales/br";
import { translations as es } from "@/public/locales/es";

const languageMap = {
  en,
  br,
  pt,
  es,
};

const ServiceSection: React.FC = () => {
  const { lang } = useLanguage();
  const t = languageMap[lang];

  return (
    <FadeInSection asChild>
      <section
        id="services"
        className="w-full bg-elevaNeutral-100 px-6 py-12 md:py-24 lg:px-8 lg:py-32"
      >
        <div className="mx-auto max-w-2xl lg:max-w-7xl">
          <div className="mb-12">
            <h2 className="font-mono text-xs/5 font-semibold uppercase tracking-widest text-elevaNeutral-900/70 data-[dark]:text-elevaNeutral-900/60">
              {t.services.title}
            </h2>
            <h3 className="mt-2 text-pretty font-serif text-4xl font-light tracking-tighter text-elevaPrimary data-[dark]:text-elevaNeutral-100 sm:text-6xl">
              {t.services.subtitle}
            </h3>
          </div>
          <p className="mt-6 text-balance text-base font-light text-elevaNeutral-900 lg:text-xl">
            {t.services.description}
          </p>
          <div className="mt-12 grid gap-2 md:grid-cols-2 md:gap-10 lg:grid-cols-2">
            {t.services.items.map((service) => (
              <Card
                key={service.title}
                className="overflow-hidden border-[#0d6c70]/10 bg-elevaNeutral-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="aspect-[300:450] relative h-72 shrink-0 overflow-hidden">
                  <div className="absolute w-full object-cover">
                    <Image
                      src={service.image}
                      alt={service.title}
                      width={300}
                      height={450}
                      className="w-full object-cover"
                    />
                  </div>
                </div>

                <CardContent className="flex flex-col p-6 pt-6">
                  <div className="flex min-h-48 flex-col">
                    <div className="mb-4 flex items-center">
                      {service.icon}
                      <h3 className="ml-2 font-serif text-2xl font-normal text-elevaPrimary">
                        {service.title}
                      </h3>
                    </div>
                    <p className="text-elevaNeutral-900">
                      {service.description}
                    </p>

                    <div className="mt-auto">
                      <Accordion type="single" collapsible>
                        <AccordionItem value="item-1">
                          <AccordionTrigger>{service.cta}</AccordionTrigger>
                          <AccordionContent>
                            <ul className="mt-4 list-inside list-disc text-elevaNeutral-900">
                              {service.items.map((item) => (
                                <li
                                  key={item}
                                  className="flex items-start pb-2 text-base"
                                >
                                  <ChevronRight className="mr-2 mt-1 h-4 w-4 shrink-0" />
                                  <div className="flex-1">
                                    <ReactMarkdown>{item}</ReactMarkdown>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </FadeInSection>
  );
};

export default ServiceSection;
