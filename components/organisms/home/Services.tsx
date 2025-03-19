'use client';

import { Card, CardContent } from '@/components/atoms/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/molecules/accordion';
import { useLanguage } from '@/components/molecules/LanguageProvider';
import { translations as br } from '@/public/locales/br';
import { translations as en } from '@/public/locales/en';
import { translations as es } from '@/public/locales/es';
import { translations as pt } from '@/public/locales/pt';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import type React from 'react';
import ReactMarkdown from 'react-markdown';

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
    <section
      id="services"
      className="bg-eleva-neutral-100 w-full px-6 py-12 md:py-24 lg:px-8 lg:py-32"
    >
      <div className="mx-auto max-w-2xl lg:max-w-7xl">
        <div className="mb-12">
          <h2 className="text-eleva-neutral-900/70 data-[dark]:text-eleva-neutral-900/60 font-mono text-xs/5 font-semibold tracking-widest uppercase">
            {t.services.title}
          </h2>
          <h3 className="text-eleva-primary data-[dark]:text-eleva-neutral-100 mt-2 font-serif text-4xl font-light tracking-tighter text-pretty sm:text-6xl">
            {t.services.subtitle}
          </h3>
        </div>
        <p className="text-eleva-neutral-900 mt-6 text-base font-light text-balance lg:text-xl">
          {t.services.description}
        </p>
        <div className="mt-12 grid gap-2 md:grid-cols-2 md:gap-10 lg:grid-cols-2">
          {t.services.items.map((service) => (
            <Card
              key={service.title}
              className="bg-eleva-neutral-100 overflow-hidden border-[#0d6c70]/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[300:450] h-72 shrink-0 overflow-hidden">
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
                    <h3 className="text-eleva-primary ml-2 font-serif text-2xl font-normal">
                      {service.title}
                    </h3>
                  </div>
                  <p className="text-eleva-neutral-900">{service.description}</p>

                  <div className="mt-auto">
                    <Accordion type="single" collapsible>
                      <AccordionItem value="item-1">
                        <AccordionTrigger>{service.cta}</AccordionTrigger>
                        <AccordionContent>
                          <ul className="text-eleva-neutral-900 mt-4 list-inside list-disc">
                            {service.items.map((item) => (
                              <li key={item} className="flex items-start pb-2 text-base">
                                <ChevronRight className="mt-1 mr-2 h-4 w-4 shrink-0" />
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
  );
};

export default ServiceSection;
