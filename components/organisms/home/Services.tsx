'use client';

import { Card, CardContent } from '@/components/atoms/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/molecules/accordion';
import { ServiceIcons } from '@/lib/icons/ServiceIcons';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type React from 'react';
import ReactMarkdown from 'react-markdown';

type ServiceItem = {
  icon: string;
  title: string;
  description: string;
  items: string[];
  image: string;
  cta: string;
};

const ServiceSection: React.FC = () => {
  const t = useTranslations('services');

  return (
    <section
      id="services"
      className="w-full bg-eleva-neutral-100 px-6 py-12 md:py-24 lg:px-8 lg:py-32"
    >
      <div className="mx-auto max-w-2xl lg:max-w-7xl">
        <div className="mb-12">
          <h2 className="font-mono text-xs/5 font-normal uppercase tracking-widest text-eleva-neutral-900/70 data-[dark]:text-eleva-neutral-900/60">
            {t('title')}
          </h2>
          <h3 className="mt-2 text-pretty font-serif text-4xl font-light tracking-tighter text-eleva-primary data-[dark]:text-eleva-neutral-100 sm:text-6xl">
            {t('subtitle')}
          </h3>
        </div>
        <p className="mt-6 text-balance text-base font-light text-eleva-neutral-900 lg:text-xl">
          {t('description')}
        </p>
        <div className="mt-12 grid gap-2 md:grid-cols-2 md:gap-10 lg:grid-cols-2">
          {t.raw('items').map((service: ServiceItem) => (
            <Card
              key={service.title}
              className="flex flex-col overflow-hidden border-[#0d6c70]/10 bg-eleva-neutral-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[2/3] h-72 w-full shrink-0 overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 600px"
                  priority={false}
                />
              </div>

              <CardContent className="flex flex-1 flex-col p-6 pt-6">
                <div className="flex min-h-48 flex-col">
                  <div className="mb-4 flex items-center">
                    {ServiceIcons[service.icon as keyof typeof ServiceIcons]?.()}
                    <h3 className="ml-2 font-serif text-2xl font-normal text-eleva-primary">
                      {service.title}
                    </h3>
                  </div>
                  <p className="text-eleva-neutral-900">{service.description}</p>

                  <div className="mt-auto">
                    <Accordion type="single" collapsible>
                      <AccordionItem value="item-1">
                        <AccordionTrigger>{service.cta}</AccordionTrigger>
                        <AccordionContent>
                          <ul className="mt-4 list-inside list-disc text-eleva-neutral-900">
                            {service.items.map((item: string) => (
                              <li key={item} className="flex items-start pb-2 text-base">
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
  );
};

export default ServiceSection;
